/**
 * The document: a flat map of blocks plus the pointers that give it shape.
 *
 * The tree is not nested in memory. Every block knows its children in order and its parent, and
 * the document is a dictionary from id to block. This is the shape Notion uses and the reason is
 * performance: finding a block is O(1) instead of a walk, and replacing one block copies one
 * entry instead of every ancestor. Typing in block 900 of 1000 rewrites exactly one object, so
 * the render layer can subscribe per block and re-render one paragraph per keystroke.
 *
 * Nothing here mutates. Every function returns a new document sharing the untouched blocks.
 */

import type { RichText } from './text.ts'
import { len as textLen } from './text.ts'

export type BlockId = string

/** Anything a block type needs to keep beyond its text: options, a url, a width, an answer. */
export type Props = Record<string, unknown>

export type Block = {
  id: BlockId
  type: string
  /** The editable text, for block types that have any. */
  text?: RichText
  /** Everything else the block type owns. Opaque to the core. */
  props?: Props
  /** Children in the order they render. */
  children: BlockId[]
  /** The block this one hangs from. The root's parent is null. */
  parent: BlockId | null
}

export type Doc = {
  root: BlockId
  blocks: Record<BlockId, Block>
}

/** What you pass in to create a block: the id and the pointers are filled in by the document. */
export type BlockInit = {
  id?: BlockId
  type: string
  text?: RichText
  props?: Props
  /** Children given as blocks, so a whole subtree can be inserted in one step. */
  children?: BlockInit[]
}

export const ROOT = 'root'

/** Ids are opaque. Short, sortable-ish and collision free enough for a document. */
export function newId(): BlockId {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID().slice(0, 8) + c.randomUUID().slice(0, 4)
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export const emptyDoc = (): Doc => ({
  root: ROOT,
  blocks: { [ROOT]: { id: ROOT, type: 'doc', children: [], parent: null } },
})

// ---------------------------------------------------------------------------- reading

export const getBlock = (doc: Doc, id: BlockId | null | undefined): Block | undefined =>
  id == null ? undefined : doc.blocks[id]

export const has = (doc: Doc, id: BlockId) => Object.hasOwn(doc.blocks, id)

export const childrenOf = (doc: Doc, id: BlockId): BlockId[] => doc.blocks[id]?.children ?? []

export const parentOf = (doc: Doc, id: BlockId): BlockId | null => doc.blocks[id]?.parent ?? null

/** The position of a block among its siblings, or -1. */
export function indexOf(doc: Doc, id: BlockId): number {
  const p = parentOf(doc, id)
  if (p == null) return -1
  return childrenOf(doc, p).indexOf(id)
}

/** The chain of ids from the root down to the block, the block included. */
export function pathOf(doc: Doc, id: BlockId): BlockId[] {
  const path: BlockId[] = []
  let at: BlockId | null = id
  const guard = new Set<BlockId>()
  while (at != null && has(doc, at)) {
    if (guard.has(at)) break
    guard.add(at)
    path.unshift(at)
    at = parentOf(doc, at)
  }
  return path
}

/** How deep a block sits. A child of the root is at 0. */
export const depthOf = (doc: Doc, id: BlockId): number => Math.max(0, pathOf(doc, id).length - 2)

export function isAncestor(doc: Doc, ancestor: BlockId, of: BlockId): boolean {
  let at = parentOf(doc, of)
  const guard = new Set<BlockId>()
  while (at != null) {
    if (at === ancestor) return true
    if (guard.has(at)) return false
    guard.add(at)
    at = parentOf(doc, at)
  }
  return false
}

/**
 * The blocks in reading order, which is the order they render, the order the keyboard walks and
 * the order a drag drops into. The root is not part of it.
 */
export function flatten(doc: Doc, from: BlockId = doc.root): BlockId[] {
  const out: BlockId[] = []
  // La guarda no es paranoia: `validate` recorre con esto para poder contar qué está mal, y un
  // documento con un ciclo es exactamente el que llega de la base, de un pegado o de un agente.
  // Sin ella, la función que tenía que reportar el problema reventaba el stack.
  const seen = new Set<BlockId>()
  const walk = (id: BlockId) => {
    if (seen.has(id)) return
    seen.add(id)
    for (const child of childrenOf(doc, id)) {
      out.push(child)
      walk(child)
    }
  }
  walk(from)
  return out
}

/** Same walk, but yielding as it goes: for counting or searching without building the array. */
export function* walk(doc: Doc, from: BlockId = doc.root, seen: Set<BlockId> = new Set()): Generator<Block> {
  if (seen.has(from)) return
  seen.add(from)
  for (const child of childrenOf(doc, from)) {
    const b = doc.blocks[child]
    if (!b) continue
    yield b
    yield* walk(doc, child, seen)
  }
}

export const count = (doc: Doc, from: BlockId = doc.root): number => {
  let n = 0
  for (const _ of walk(doc, from)) n++
  return n
}

/** The previous block in reading order, skipping nothing. */
export function prevInOrder(doc: Doc, id: BlockId): BlockId | null {
  const order = flatten(doc)
  const i = order.indexOf(id)
  return i > 0 ? order[i - 1]! : null
}

export function nextInOrder(doc: Doc, id: BlockId): BlockId | null {
  const order = flatten(doc)
  const i = order.indexOf(id)
  return i >= 0 && i < order.length - 1 ? order[i + 1]! : null
}

export const firstChild = (doc: Doc, id: BlockId): BlockId | null => childrenOf(doc, id)[0] ?? null

export function lastDescendant(doc: Doc, id: BlockId): BlockId {
  let at = id
  for (;;) {
    const kids = childrenOf(doc, at)
    const last = kids[kids.length - 1]
    if (!last) return at
    at = last
  }
}

export function siblingAfter(doc: Doc, id: BlockId): BlockId | null {
  const p = parentOf(doc, id)
  if (p == null) return null
  const kids = childrenOf(doc, p)
  return kids[kids.indexOf(id) + 1] ?? null
}

export function siblingBefore(doc: Doc, id: BlockId): BlockId | null {
  const p = parentOf(doc, id)
  if (p == null) return null
  const kids = childrenOf(doc, p)
  const i = kids.indexOf(id)
  return i > 0 ? kids[i - 1]! : null
}

export const textLength = (doc: Doc, id: BlockId): number => textLen(doc.blocks[id]?.text)

// ---------------------------------------------------------------------------- writing

/**
 * A document with `block` in place of whatever was at that id.
 *
 * Copying the map is O(n), and that is worth being upfront about because it is the only thing in
 * the engine that is: measured against a page of three thousand blocks, one keystroke costs
 * 0.79 ms and 0.73 of those are this copy. Everything else, commands included, is flat.
 *
 * It stays this way on purpose. An activity has tens of blocks, where the copy is under a
 * hundredth of a millisecond, and immutability is what makes undo an inverse instead of a
 * snapshot and a render a reference comparison. The way out, if a document ever gets big, is a map
 * with structural sharing: split the blocks across a fixed number of buckets and copy the one
 * bucket a write touches. It is not much code, and it touches every `doc.blocks` access in the
 * package, so it is the next step and not this one. `tests/perf.test.ts` pins the numbers.
 */
export const setBlock = (doc: Doc, block: Block): Doc => ({
  ...doc,
  blocks: { ...doc.blocks, [block.id]: block },
})

/** A document with several blocks replaced at once, copying the map a single time. */
export function setBlocks(doc: Doc, blocks: readonly Block[]): Doc {
  if (blocks.length === 0) return doc
  const next = { ...doc.blocks }
  for (const b of blocks) next[b.id] = b
  return { ...doc, blocks: next }
}

/** A document without those ids. Callers are responsible for having unlinked them first. */
export function dropBlocks(doc: Doc, ids: readonly BlockId[]): Doc {
  if (ids.length === 0) return doc
  const next = { ...doc.blocks }
  for (const id of ids) delete next[id]
  return { ...doc, blocks: next }
}

/** Flattens an init tree into blocks, minting ids and wiring both directions of the pointers. */
export function materialize(init: BlockInit, parent: BlockId): { blocks: Block[]; id: BlockId } {
  const id = init.id ?? newId()
  const kids = (init.children ?? []).map((c) => materialize(c, id))
  const self: Block = {
    id,
    type: init.type,
    children: kids.map((k) => k.id),
    parent,
    ...(init.text !== undefined ? { text: init.text } : {}),
    ...(init.props !== undefined ? { props: init.props } : {}),
  }
  return { blocks: [self, ...kids.flatMap((k) => k.blocks)], id }
}

/** Every id in the subtree rooted at `id`, the block itself included. */
export function subtree(doc: Doc, id: BlockId): BlockId[] {
  const out: BlockId[] = [id]
  const stack = [...childrenOf(doc, id)]
  while (stack.length) {
    const at = stack.pop()!
    if (!has(doc, at)) continue
    out.push(at)
    stack.push(...childrenOf(doc, at))
  }
  return out
}

/** A deep copy of a subtree as an init tree, ready to be inserted again with fresh ids. */
export function copySubtree(doc: Doc, id: BlockId): BlockInit | undefined {
  const b = doc.blocks[id]
  if (!b) return undefined
  return {
    type: b.type,
    ...(b.text !== undefined ? { text: b.text } : {}),
    ...(b.props !== undefined ? { props: structuredCloneish(b.props) } : {}),
    children: b.children.map((c) => copySubtree(doc, c)).filter((x): x is BlockInit => Boolean(x)),
  }
}

/** A cheap deep copy for props, which are plain JSON by contract. */
function structuredCloneish<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value)
    } catch {
      /* props with a function in them: fall through to JSON */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

export { structuredCloneish as clone }

// ---------------------------------------------------------------------------- invariants

/**
 * Checks the pointers agree with each other. The engine never breaks these, but a document that
 * arrives from the database, from a paste or from an agent might, and finding out here beats
 * finding out in a render. Returns the problems in Spanish because they surface in the console.
 */
export function validate(doc: Doc): string[] {
  const bad: string[] = []
  const root = doc.blocks[doc.root]
  if (!root) return [`falta la raíz "${doc.root}"`]
  if (root.parent !== null) bad.push('la raíz tiene padre')

  for (const [id, b] of Object.entries(doc.blocks)) {
    if (b.id !== id) bad.push(`el bloque ${id} dice llamarse ${b.id}`)
    if (!Array.isArray(b.children)) bad.push(`${id} no tiene lista de hijos`)
    const seen = new Set<BlockId>()
    for (const c of b.children ?? []) {
      if (seen.has(c)) bad.push(`${id} repite al hijo ${c}`)
      seen.add(c)
      const child = doc.blocks[c]
      if (!child) bad.push(`${id} apunta al hijo inexistente ${c}`)
      else if (child.parent !== id) bad.push(`${c} es hijo de ${id} pero dice ser hijo de ${child.parent}`)
    }
    if (id !== doc.root) {
      if (b.parent == null) bad.push(`${id} no tiene padre y no es la raíz`)
      else if (!doc.blocks[b.parent]) bad.push(`${id} cuelga del padre inexistente ${b.parent}`)
      else if (!doc.blocks[b.parent]!.children.includes(id)) bad.push(`${b.parent} no reconoce a su hijo ${id}`)
    }
  }

  // Nadie puede ser su propio ancestro: un ciclo cuelga cualquier recorrido.
  const reachable = new Set<BlockId>([doc.root, ...flatten(doc)])
  for (const id of Object.keys(doc.blocks)) if (!reachable.has(id)) bad.push(`${id} no se alcanza desde la raíz`)

  return bad
}

/** Throws if the document is inconsistent. Used by tests and by the debug build. */
export function assertValid(doc: Doc): void {
  const bad = validate(doc)
  if (bad.length) throw new Error(`documento inconsistente:\n  ${bad.join('\n  ')}`)
}
