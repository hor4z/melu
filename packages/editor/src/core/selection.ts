// Dos clases, porque un editor de bloques tiene dos: un rango de texto, o bloques enteros.
// El ancla y la cabeza se guardan aparte del orden para que una selección al revés siga al revés.

import type { BlockId, Doc } from './doc.ts'
import { flatten, has, textLength } from './doc.ts'

export type Point = { block: BlockId; offset: number }

export type TextSelection = { kind: 'text'; anchor: Point; head: Point }
export type BlockSelection = { kind: 'blocks'; ids: BlockId[]; anchor: BlockId }
export type Selection = TextSelection | BlockSelection | null

export const point = (block: BlockId, offset = 0): Point => ({ block, offset })

export const textSel = (anchor: Point, head: Point = anchor): TextSelection => ({ kind: 'text', anchor, head })

export const caret = (block: BlockId, offset = 0): TextSelection => textSel(point(block, offset))

export const blockSel = (ids: readonly BlockId[], anchor?: BlockId): BlockSelection => ({
  kind: 'blocks',
  ids: [...ids],
  anchor: anchor ?? ids[0] ?? '',
})

export const isText = (s: Selection): s is TextSelection => s?.kind === 'text'
export const isBlocks = (s: Selection): s is BlockSelection => s?.kind === 'blocks'

export const samePoint = (a: Point, b: Point) => a.block === b.block && a.offset === b.offset

export const isCollapsed = (s: Selection): boolean => isText(s) && samePoint(s.anchor, s.head)

/** True when the range covers more than one block, which changes what most commands do. */
export const spansBlocks = (s: Selection): boolean => isText(s) && s.anchor.block !== s.head.block

/** The block the caret is in, for a text selection, or the anchor of a block selection. */
export function activeBlock(s: Selection): BlockId | null {
  if (isText(s)) return s.head.block
  if (isBlocks(s)) return s.anchor || s.ids[0] || null
  return null
}

/** Every block a selection touches, in document order. */
export function selectedBlocks(doc: Doc, s: Selection): BlockId[] {
  if (isBlocks(s)) return s.ids.filter((id) => has(doc, id))
  if (!isText(s)) return []
  if (s.anchor.block === s.head.block) return has(doc, s.anchor.block) ? [s.anchor.block] : []
  const order = flatten(doc)
  const a = order.indexOf(s.anchor.block)
  const b = order.indexOf(s.head.block)
  if (a === -1 || b === -1) return []
  return order.slice(Math.min(a, b), Math.max(a, b) + 1)
}

/** En orden de documento, para que ningún comando tenga que pensar hacia dónde se arrastró. */
export function ordered(doc: Doc, s: TextSelection): { from: Point; to: Point } {
  if (s.anchor.block === s.head.block) {
    const [from, to] = s.anchor.offset <= s.head.offset ? [s.anchor, s.head] : [s.head, s.anchor]
    return { from, to }
  }
  const order = flatten(doc)
  const a = order.indexOf(s.anchor.block)
  const b = order.indexOf(s.head.block)
  return a <= b ? { from: s.anchor, to: s.head } : { from: s.head, to: s.anchor }
}

/**
 * Cuánto del texto de un bloque abarca la selección. Un bloque elegido entero abarca todo, y eso
 * es lo que hace que un comando escrito para un rango funcione también con bloques elegidos.
 */
export function rangeIn(doc: Doc, s: Selection, id: BlockId): { from: number; to: number } | null {
  if (isBlocks(s)) return s.ids.includes(id) ? { from: 0, to: textLength(doc, id) } : null
  if (!isText(s)) return null
  const { from, to } = ordered(doc, s)
  const total = textLength(doc, id)
  const clamp = (n: number) => Math.max(0, Math.min(n, total))
  if (from.block === id && to.block === id) return { from: clamp(from.offset), to: clamp(to.offset) }
  if (from.block === id) return { from: clamp(from.offset), to: total }
  if (to.block === id) return { from: 0, to: clamp(to.offset) }
  const touched = selectedBlocks(doc, s)
  return touched.includes(id) ? { from: 0, to: total } : null
}

/** La trae de vuelta a un documento que cambió abajo, para que el caret nunca apunte a nada. */
export function repair(doc: Doc, s: Selection): Selection {
  if (isBlocks(s)) {
    const ids = s.ids.filter((id) => has(doc, id))
    if (ids.length === 0) return null
    return { kind: 'blocks', ids, anchor: has(doc, s.anchor) ? s.anchor : ids[0]! }
  }
  if (!isText(s)) return null
  const fix = (p: Point): Point | null =>
    has(doc, p.block) ? { block: p.block, offset: Math.max(0, Math.min(p.offset, textLength(doc, p.block))) } : null
  const anchor = fix(s.anchor)
  const head = fix(s.head)
  if (anchor && head) return { kind: 'text', anchor, head }
  const kept = anchor ?? head
  return kept ? { kind: 'text', anchor: kept, head: kept } : null
}

/** The caret at the end of a block, which is where most commands leave it. */
export const atEnd = (doc: Doc, id: BlockId): TextSelection => caret(id, textLength(doc, id))

export const sameSelection = (a: Selection, b: Selection): boolean => {
  if (a === b) return true
  if (!a || !b || a.kind !== b.kind) return false
  if (a.kind === 'text' && b.kind === 'text') return samePoint(a.anchor, b.anchor) && samePoint(a.head, b.head)
  if (a.kind === 'blocks' && b.kind === 'blocks')
    return a.anchor === b.anchor && a.ids.length === b.ids.length && a.ids.every((id, i) => id === b.ids[i])
  return false
}
