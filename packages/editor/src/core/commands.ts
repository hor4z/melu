// Cada gesto, como una función con nombre. Devuelve true si hizo algo y false si no aplicaba, y
// ese es todo el protocolo: la misma tecla se le ofrece a varios comandos hasta que uno la toma,
// la barra puede preguntar antes de dibujar un botón, y un agente entra por la misma puerta.
// Nada acá toca el DOM: es todo el comportamiento del editor y corre sin navegador.

import type { BlockId, BlockInit, Props } from './doc.ts'
import {
  childrenOf,
  copySubtree,
  depthOf,
  flatten,
  getBlock,
  has,
  indexOf,
  isAncestor,
  lastDescendant,
  parentOf,
  prevInOrder,
  siblingAfter,
  siblingBefore,
  textLength,
} from './doc.ts'
import type { Mark, MarkType, RichText } from './text.ts'
import {
  activeMarks,
  concat,
  insert as textInsert,
  len as textLen,
  isEmpty,
  marksAt,
  plain,
  rangeHasMark,
  remove as removeText,
  slice as sliceText,
  clearMarks as stripMarks,
  toggleMark as toggleText,
  setMark as setTextMark,
  clearMark as clearTextMark,
  wordAt,
} from './text.ts'
import type { Point } from './selection.ts'
import { activeBlock, blockSel, caret, isBlocks, isCollapsed, isText, ordered, rangeIn, selectedBlocks } from './selection.ts'
import type { EditorState } from './state.ts'
import type { Transaction } from './transaction.ts'

export type CommandCtx = {
  /** The state before the transaction. Read the running document from `tr.doc` instead. */
  readonly state: EditorState
  readonly tr: Transaction
}

export type Command<A = void> = (ctx: CommandCtx, args: A) => boolean

// ---------------------------------------------------------------------------- helpers

const textOf = (ctx: CommandCtx, id: BlockId): RichText => getBlock(ctx.tr.doc, id)?.text ?? []

const specOf = (ctx: CommandCtx, id: BlockId) => ctx.state.schema.specOr(getBlock(ctx.tr.doc, id)?.type ?? '')

const isTextual = (ctx: CommandCtx, id: BlockId) =>
  ctx.state.schema.isTextual(getBlock(ctx.tr.doc, id)?.type ?? '')

/** The nearest textual block at or before `id` in reading order, for the caret to land on. */
function textualBefore(ctx: CommandCtx, id: BlockId): BlockId | null {
  let at = prevInOrder(ctx.tr.doc, id)
  while (at && !isTextual(ctx, at)) at = prevInOrder(ctx.tr.doc, at)
  return at
}

/** Por grafema: sin esto, borrar un emoji de familia son siete teclas y seis emojis roscos. */
function graphemeBefore(text: string, offset: number): number {
  if (offset <= 0) return 0
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Seg) {
    const head = text.slice(0, offset)
    let last = 0
    for (const s of new Seg('es', { granularity: 'grapheme' }).segment(head)) last = s.index
    return last
  }
  // Sin Segmenter, al menos no partir un par surrogate.
  const code = text.codePointAt(offset - 2)
  return code !== undefined && code > 0xffff ? offset - 2 : offset - 1
}

function graphemeAfter(text: string, offset: number): number {
  if (offset >= text.length) return text.length
  const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Seg) {
    for (const s of new Seg('es', { granularity: 'grapheme' }).segment(text.slice(offset))) {
      return offset + s.segment.length
    }
  }
  const code = text.codePointAt(offset)
  return code !== undefined && code > 0xffff ? offset + 2 : offset + 1
}

// ---------------------------------------------------------------------------- selection

export const selectBlock: Command<{ id: BlockId; add?: boolean }> = ({ tr, state }, { id, add }) => {
  if (!has(tr.doc, id)) return false
  if (state.schema.specOr(getBlock(tr.doc, id)!.type).selectable === false) return false
  if (add && isBlocks(state.selection)) {
    const ids = state.selection.ids.includes(id)
      ? state.selection.ids.filter((x) => x !== id)
      : [...state.selection.ids, id]
    // Se guardan en orden de lectura: lo que se borre o se mueva después sale en el orden visible.
    const order = flatten(tr.doc)
    ids.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    tr.select(ids.length ? blockSel(ids, state.selection.anchor) : null)
    return true
  }
  tr.select(blockSel([id], id))
  return true
}

/** Selects the blocks between the anchor and `id`, which is what shift+click does. */
export const selectBlockRange: Command<{ id: BlockId }> = ({ tr, state }, { id }) => {
  const from = activeBlock(state.selection)
  if (!from || !has(tr.doc, id)) return false
  const order = flatten(tr.doc)
  const a = order.indexOf(from)
  const b = order.indexOf(id)
  if (a === -1 || b === -1) return false
  const ids = order.slice(Math.min(a, b), Math.max(a, b) + 1)
  tr.select(blockSel(ids, from))
  return true
}

export const focusBlock: Command<{ id: BlockId; at?: 'start' | 'end' | number }> = ({ tr }, { id, at = 'end' }) => {
  if (!has(tr.doc, id)) return false
  const total = textLength(tr.doc, id)
  const offset = at === 'start' ? 0 : at === 'end' ? total : Math.max(0, Math.min(at, total))
  tr.select(caret(id, offset))
  return true
}

/** Escape: from a text caret to having the whole block selected. */
export const selectEnclosingBlock: Command = ({ tr, state }) => {
  const id = activeBlock(state.selection)
  if (!id || isBlocks(state.selection)) return false
  tr.select(blockSel([id], id))
  return true
}

export const selectAll: Command = ({ tr }) => {
  const ids = childrenOf(tr.doc, tr.doc.root)
  if (ids.length === 0) return false
  tr.select(blockSel(ids, ids[0]!))
  return true
}

/**
 * Mod+A: primero el texto de este bloque, y de nuevo toda la página. No recuerda nada, el segundo
 * paso se reconoce porque el texto ya estaba entero seleccionado.
 */
export const selectAllStep: Command = (ctx) => {
  const { tr, state } = ctx
  const sel = state.selection
  if (!isText(sel) || sel.anchor.block !== sel.head.block) return selectAll(ctx, undefined)
  const { block } = sel.head
  const total = textLength(tr.doc, block)
  const from = Math.min(sel.anchor.offset, sel.head.offset)
  const to = Math.max(sel.anchor.offset, sel.head.offset)
  if (total === 0 || (from === 0 && to === total)) return selectAll(ctx, undefined)
  tr.select({ kind: 'text', anchor: { block, offset: 0 }, head: { block, offset: total } })
  return true
}

// ---------------------------------------------------------------------------- text

/**
 * Saca bloques enteros y deja el caret en algo donde se pueda seguir escribiendo.
 *
 * Lo usan dos caminos: borrar bloques elegidos, y borrar un rango de texto donde ninguna de las dos
 * puntas tiene texto donde pegar lo que sobra.
 */
function dropBlocks(ctx: CommandCtx, of: readonly BlockId[]): boolean {
  const { tr } = ctx
  const ids = of.filter((id) => has(tr.doc, id))
  if (ids.length === 0) return false
  const landing = textualBefore(ctx, ids[0]!) ?? siblingAfter(tr.doc, ids[ids.length - 1]!)
  for (const id of ids) if (has(tr.doc, id)) tr.remove(id)
  // Un documento sin bloques no se puede escribir: siempre queda uno donde poner el caret.
  if (childrenOf(tr.doc, tr.doc.root).length === 0) {
    const fresh = tr.append(tr.doc.root, { type: 'paragraph', text: [] })
    tr.select(caret(fresh, 0))
  } else if (landing && has(tr.doc, landing)) {
    tr.select(caret(landing, textLength(tr.doc, landing)))
  } else {
    const first = childrenOf(tr.doc, tr.doc.root)[0]!
    tr.select(caret(first, 0))
  }
  return true
}

/** Removes what is selected, across as many blocks as it spans, and collapses the caret. */
export const deleteSelection: Command = (ctx) => {
  const { tr, state } = ctx
  const sel = state.selection

  if (isBlocks(sel)) return dropBlocks(ctx, sel.ids)

  if (!isText(sel) || isCollapsed(sel)) return false
  const { from, to } = ordered(tr.doc, sel)

  if (from.block === to.block) {
    if (!isTextual(ctx, from.block)) return false
    tr.setText(from.block, removeText(textOf(ctx, from.block), from.offset, to.offset))
    tr.select(caret(from.block, from.offset))
    return true
  }

  // Cruza bloques: la cabeza del primero se pega con la cola del último y el resto se va.
  const touchedIds = selectedBlocks(tr.doc, sel)
  const head = isTextual(ctx, from.block) ? sliceText(textOf(ctx, from.block), 0, from.offset) : []
  const tail = isTextual(ctx, to.block) ? sliceText(textOf(ctx, to.block), to.offset, textLen(textOf(ctx, to.block))) : []

  /**
   * El primero no siempre es el que sobrevive.
   *
   * Si no tiene texto (una imagen, un separador, una tabla) no hay dónde pegarle la cola del
   * último, así que el que queda es el último con su cola y el primero se va con el resto. Antes
   * la cola se calculaba y no se escribía en ningún lado, y el bloque que la tenía se borraba
   * igual: arrastrar desde arriba de una imagen hasta el medio de un párrafo y apretar Backspace
   * se comía el resto del párrafo. Se volvió alcanzable cuando la selección empezó a cruzar
   * bloques, porque una punta parada sobre una imagen ahora es un punto válido.
   */
  if (!isTextual(ctx, from.block)) {
    if (!isTextual(ctx, to.block)) return dropBlocks(ctx, touchedIds)
    tr.setText(to.block, tail)
    for (const id of touchedIds) {
      if (id === to.block || !has(tr.doc, id)) continue
      tr.remove(id)
    }
    tr.select(caret(to.block, 0))
    return true
  }

  // Los hijos del último quedan bajo el corte: van adentro del que queda si puede tenerlos, para
  // no perder la sangría, y como hermanos si no.
  const orphans = [...childrenOf(tr.doc, to.block)]

  tr.setText(from.block, concat(head, tail))

  const inside = state.schema.isContainer(getBlock(tr.doc, from.block)?.type ?? '')
  const parent = inside ? from.block : (parentOf(tr.doc, from.block) ?? tr.doc.root)
  let at = inside ? childrenOf(tr.doc, from.block).length : indexOf(tr.doc, from.block) + 1
  for (const child of orphans) {
    if (!has(tr.doc, child)) continue
    tr.move(child, parent, at)
    at++
  }

  for (const id of touchedIds) {
    if (id === from.block) continue
    if (!has(tr.doc, id)) continue
    tr.remove(id)
  }

  tr.select(caret(from.block, from.offset))
  return true
}

export const insertText: Command<{ text: string; marks?: readonly Mark[] }> = (ctx, { text, marks }) => {
  if (text === '') return false
  // Borrar la selección primero deja el caret colapsado, y `ctx.state` ya lo refleja.
  if (!isCollapsed(ctx.state.selection) && !deleteSelection(ctx, undefined)) return false
  const at = ctx.state.selection
  if (!isText(at) || !isCollapsed(at)) return false
  return writeAt(ctx, at.head, text, marks)
}

function writeAt(ctx: CommandCtx, at: Point, text: string, marks?: readonly Mark[]): boolean {
  const { tr } = ctx
  if (!isTextual(ctx, at.block)) return false
  // Lo pedido manda; después lo que quedó pendiente de un atajo o de una regla; y si no hay nada,
  // lo que dice el texto de al lado.
  const applied = marks ?? ctx.state.storedMarks ?? undefined
  tr.setText(at.block, textInsert(textOf(ctx, at.block), at.offset, text, applied))
  tr.select(caret(at.block, at.offset + text.length))
  // Lo pendiente sigue valiendo mientras se escriba de corrido en el mismo lugar.
  if (ctx.state.storedMarks) tr.setStoredMarks(ctx.state.storedMarks)
  tr.coalesce(`type:${at.block}`)
  return true
}

/** Texto que ya trae formato. `insertText` toma un solo juego de marcas, y un pegado no es eso. */
export const insertRichText: Command<{ text: RichText }> = (ctx, { text }) => {
  if (textLen(text) === 0) return false
  if (!isCollapsed(ctx.state.selection) && !deleteSelection(ctx, undefined)) return false
  const at = ctx.state.selection
  if (!isText(at) || !isCollapsed(at)) return false
  const { block, offset } = at.head
  if (!isTextual(ctx, block)) return false
  const current = textOf(ctx, block)
  const total = textLen(current)
  ctx.tr.setText(block, concat(sliceText(current, 0, offset), text, sliceText(current, offset, total)))
  ctx.tr.select(caret(block, offset + textLen(text)))
  return true
}

/** Shift+Enter: a line break inside the same block, which stays one block. */
export const insertSoftBreak: Command = (ctx) => insertText(ctx, { text: '\n' })

/**
 * Backspace, y el orden de las ramas es el comportamiento. Nunca se pega con un bloque sin texto:
 * borrar una imagen con una tecla es una sorpresa, así que se la selecciona.
 */
export const deleteBackward: Command = (ctx) => {
  const { tr, state } = ctx
  if (isBlocks(state.selection)) return deleteSelection(ctx, undefined)
  if (!isText(state.selection)) return false
  if (!isCollapsed(state.selection)) return deleteSelection(ctx, undefined)

  const { block, offset } = state.selection.head
  if (!has(tr.doc, block)) return false

  if (offset > 0) {
    if (!isTextual(ctx, block)) return false
    const text = textOf(ctx, block)
    const from = graphemeBefore(plain(text), offset)
    tr.setText(block, removeText(text, from, offset))
    tr.select(caret(block, from))
    tr.coalesce(`delete:${block}`)
    return true
  }

  // Primero salir del nivel, después deshacer el tipo. Al revés, un ítem anidado se volvería
  // texto sin desanidarse nunca. Cada Backspace deshace una cosa, de la más chica a la más grande.
  if (depthOf(tr.doc, block) > 0) return outdent(ctx, { id: block })

  const spec = specOf(ctx, block)
  const current = getBlock(tr.doc, block)!
  if (spec.backspace && current.type !== spec.backspace) {
    tr.setType(block, spec.backspace, null)
    tr.select(caret(block, 0))
    return true
  }

  const before = prevInOrder(tr.doc, block)
  if (!before) return false

  if (!isTextual(ctx, before)) {
    tr.select(blockSel([before], before))
    return true
  }

  // Se pega en el de arriba: el caret queda en la junta, que es donde estaba el texto.
  const junction = textLength(tr.doc, before)
  const mine = textOf(ctx, block)
  if (!isEmpty(mine)) tr.setText(before, concat(textOf(ctx, before), mine))
  const parentOfBefore = parentOf(tr.doc, before) ?? tr.doc.root
  let at = indexOf(tr.doc, before) + 1
  // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
  for (const child of [...childrenOf(tr.doc, block)]) {
    // Los hijos suben con el texto, pegados al bloque que los recibe.
    const target: BlockId = ctx.state.schema.isContainer(getBlock(tr.doc, before)!.type) ? before : parentOfBefore
    const index = target === before ? childrenOf(tr.doc, before).length : at
    tr.move(child, target, index)
    if (target !== before) at++
  }
  tr.remove(block)
  tr.select(caret(before, junction))
  return true
}

export const deleteForward: Command = (ctx) => {
  const { tr, state } = ctx
  if (isBlocks(state.selection)) return deleteSelection(ctx, undefined)
  if (!isText(state.selection)) return false
  if (!isCollapsed(state.selection)) return deleteSelection(ctx, undefined)

  const { block, offset } = state.selection.head
  const text = textOf(ctx, block)
  const total = textLen(text)

  if (offset < total) {
    const to = graphemeAfter(plain(text), offset)
    tr.setText(block, removeText(text, offset, to))
    tr.select(caret(block, offset))
    tr.coalesce(`delete:${block}`)
    return true
  }

  // Al final: se trae el siguiente para arriba. Es el Backspace del de abajo, visto de acá.
  const after = childrenOf(tr.doc, block)[0] ?? siblingAfter(tr.doc, block) ?? nextOutside(ctx, block)
  if (!after) return false
  if (!isTextual(ctx, after)) {
    tr.select(blockSel([after], after))
    return true
  }
  tr.setText(block, concat(text, textOf(ctx, after)))
  const parent = parentOf(tr.doc, block) ?? tr.doc.root
  let at = indexOf(tr.doc, block) + 1
  // La misma regla que el borrado hacia atrás, y por eso está escrita igual: los hijos se quedan
  // adentro del que recibe si puede tenerlos, y como hermanos si no. Acá iban siempre al padre, así
  // que borrar la misma junta con Delete y con Backspace dejaba documentos distintos.
  // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
  for (const child of [...childrenOf(tr.doc, after)]) {
    const target: BlockId = state.schema.isContainer(getBlock(tr.doc, block)!.type) ? block : parent
    const index = target === block ? childrenOf(tr.doc, block).length : at
    tr.move(child, target, index)
    if (target !== block) at++
  }
  tr.remove(after)
  tr.select(caret(block, offset))
  return true
}

/** The next block that is not a descendant: what follows a nested list when it ends. */
function nextOutside(ctx: CommandCtx, id: BlockId): BlockId | null {
  let at: BlockId | null = id
  while (at) {
    const next = siblingAfter(ctx.tr.doc, at)
    if (next) return next
    at = parentOf(ctx.tr.doc, at)
    if (at === ctx.tr.doc.root) return null
  }
  return null
}

/** Ctrl+Backspace: the word before the caret. */
export const deleteWordBackward: Command = (ctx) => {
  const { tr, state } = ctx
  if (!isText(state.selection) || !isCollapsed(state.selection)) return deleteBackward(ctx, undefined)
  const { block, offset } = state.selection.head
  if (offset === 0) return deleteBackward(ctx, undefined)
  const text = textOf(ctx, block)
  const { from } = wordAt(text, offset)
  const start = from === offset ? graphemeBefore(plain(text), offset) : from
  tr.setText(block, removeText(text, start, offset))
  tr.select(caret(block, start))
  return true
}

/**
 * Enter, cuatro cosas según dónde esté el caret: un ítem vacío deja de ser lista, el final de un
 * título da un párrafo, el principio empuja hacia abajo, y el medio parte.
 */
export const splitBlock: Command = (ctx) => {
  const { tr, state } = ctx
  if (isBlocks(state.selection)) {
    const last = state.selection.ids[state.selection.ids.length - 1]
    if (!last || !has(tr.doc, last)) return false
    const fresh = tr.insertAfter(last, { type: 'paragraph', text: [] })
    tr.select(caret(fresh, 0))
    return true
  }
  if (!isText(state.selection)) return false
  if (!isCollapsed(state.selection) && !deleteSelection(ctx, undefined)) return false
  const live = ctx.state.selection
  if (!isText(live)) return false
  const at = live.head
  const { block } = at
  if (!has(tr.doc, block)) return false
  const spec = specOf(ctx, block)

  if (!isTextual(ctx, block)) {
    const fresh = tr.insertAfter(block, { type: 'paragraph', text: [] })
    tr.select(caret(fresh, 0))
    return true
  }

  const text = textOf(ctx, block)
  const total = textLen(text)
  const offset = Math.min(at.offset, total)

  // Un ítem de lista vacío deja de ser lista, en lugar de crear otro ítem vacío.
  if (total === 0 && spec.split?.empty && getBlock(tr.doc, block)!.type !== spec.split.empty) {
    if (depthOf(tr.doc, block) > 0) return outdent(ctx, { id: block })
    tr.setType(block, spec.split.empty, null)
    tr.select(caret(block, 0))
    return true
  }

  if (offset >= total) {
    const type = spec.split?.end ?? getBlock(tr.doc, block)!.type
    // Si el bloque tiene hijos, lo que sigue va adentro: es lo que se está mirando.
    const kids = childrenOf(tr.doc, block)
    const container = state.schema.isContainer(getBlock(tr.doc, block)!.type) && kids.length > 0
    const fresh = container
      ? tr.insert(block, 0, { type, text: [] })
      : tr.insertAfter(block, { type, text: [] })
    tr.select(caret(fresh, 0))
    return true
  }

  if (offset === 0) {
    // Al principio: se empuja hacia abajo y el caret se queda con el texto.
    tr.insertBefore(block, { type: getBlock(tr.doc, block)!.type, text: [] })
    tr.select(caret(block, 0))
    return true
  }

  const type = spec.split?.middle ?? getBlock(tr.doc, block)!.type
  tr.setText(block, sliceText(text, 0, offset))
  const fresh = tr.insertAfter(block, { type, text: sliceText(text, offset, total) })
  tr.select(caret(fresh, 0))
  return true
}

// ---------------------------------------------------------------------------- marks

export const toggleMark: Command<{ type: MarkType; value?: string }> = (ctx, mark) => {
  const { tr, state } = ctx
  const sel = state.selection
  const ids = selectedBlocks(tr.doc, sel).filter((id) => isTextual(ctx, id) && state.schema.allowsMark(getBlock(tr.doc, id)!.type, mark.type))
  if (ids.length === 0) return false

  const m: Mark = mark.value === undefined ? { type: mark.type } : { type: mark.type, value: mark.value }

  // Sin selección se marca la palabra donde está el caret, como Notion. Si no hay palabra, la
  // marca queda pendiente para lo que se escriba.
  if (isText(sel) && isCollapsed(sel)) {
    const { block, offset } = sel.head
    const { from, to } = wordAt(textOf(ctx, block), offset)
    if (from === to) {
      const pending = ctx.state.storedMarks ?? marksAt(textOf(ctx, block), offset) ?? []
      const has = pending.some((x) => x.type === m.type && (x.value ?? '') === (m.value ?? ''))
      tr.setStoredMarks(has ? pending.filter((x) => x.type !== m.type) : [...pending, m])
      tr.select(sel)
      // Sin pasos no hay cambio de documento, pero el estado igual tiene que salir: lo hace
      // `dispatch` al ver que la selección se reafirma con marcas nuevas.
      return true
    }
    tr.setText(block, toggleText(textOf(ctx, block), from, to, m))
    tr.select(sel)
    return true
  }

  // Si ya está en todo lo seleccionado se quita, y si no se pone en todo: no queda a medias.
  const everywhere = ids.every((id) => {
    const r = rangeIn(tr.doc, sel, id)
    return r ? rangeHasMark(textOf(ctx, id), r.from, r.to, m.type, m.value) : true
  })
  for (const id of ids) {
    const r = rangeIn(tr.doc, sel, id)
    if (!r || r.from === r.to) continue
    const text = textOf(ctx, id)
    tr.setText(id, everywhere ? clearTextMark(text, r.from, r.to, m.type) : setTextMark(text, r.from, r.to, m))
  }
  tr.select(sel)
  return true
}

export const setLink: Command<{ href: string }> = (ctx, { href }) => {
  const { tr, state } = ctx
  const sel = state.selection
  if (!isText(sel)) return false
  if (href === '') return toggleMark(ctx, { type: 'link' })
  const ids = selectedBlocks(tr.doc, sel).filter((id) => isTextual(ctx, id))
  let did = false
  for (const id of ids) {
    const r = rangeIn(tr.doc, sel, id)
    if (!r) continue
    // Sin selección, el link se pone sobre la palabra donde está el caret.
    const range = r.from === r.to ? wordAt(textOf(ctx, id), r.from) : r
    if (range.from === range.to) continue
    tr.setText(id, setTextMark(textOf(ctx, id), range.from, range.to, { type: 'link', value: href }))
    did = true
  }
  if (did) tr.select(sel)
  return did
}

export const clearFormatting: Command = (ctx) => {
  const { tr, state } = ctx
  const sel = state.selection
  const ids = selectedBlocks(tr.doc, sel).filter((id) => isTextual(ctx, id))
  let did = false
  for (const id of ids) {
    const r = rangeIn(tr.doc, sel, id)
    if (!r || r.from === r.to) continue
    tr.setText(id, stripMarks(textOf(ctx, id), r.from, r.to))
    did = true
  }
  if (did) tr.select(sel)
  return did
}

/** What the toolbar draws as pressed. Pure: it reads, it never writes. */
export function marksInSelection(state: EditorState): Mark[] {
  const sel = state.selection
  if (!isText(sel)) return []
  const ids = selectedBlocks(state.doc, sel)
  const first = ids[0]
  if (!first) return []
  const r = rangeIn(state.doc, sel, first)
  if (!r) return []
  const text = state.doc.blocks[first]?.text ?? []
  const mine = activeMarks(text, r.from, r.to)
  return mine.filter((m) =>
    ids.every((id) => {
      const rr = rangeIn(state.doc, sel, id)
      if (!rr || rr.from === rr.to) return true
      return rangeHasMark(state.doc.blocks[id]?.text ?? [], rr.from, rr.to, m.type, m.value)
    }),
  )
}

// ---------------------------------------------------------------------------- blocks

export const setBlockType: Command<{ type: string; id?: BlockId; props?: Props | null }> = (ctx, { type, id, props }) => {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  if (targets.length === 0) return false
  let did = false
  for (const target of targets) {
    const block = getBlock(tr.doc, target)
    if (!block || block.type === type) continue
    // Los props del tipo nuevo son los suyos: los del viejo no significan nada acá.
    const fresh = props === null ? null : { ...state.schema.defaults(type), ...props }
    tr.setType(target, type, fresh && Object.keys(fresh).length ? fresh : null)
    // Un bloque que deja de tener texto lo pierde; uno que empieza a tenerlo, lo estrena vacío.
    if (!state.schema.isTextual(type) && block.text !== undefined) tr.setText(target, [])
    did = true
  }
  if (did && isText(state.selection)) tr.select(state.selection)
  return did
}

export const setBlockProps: Command<{ props: Props; id?: BlockId }> = (ctx, { props, id }) => {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  let did = false
  for (const target of targets) {
    if (!has(tr.doc, target)) continue
    tr.setProps(target, props)
    did = true
  }
  return did
}

export const insertBlock: Command<{
  type: string
  props?: Props
  text?: RichText
  children?: BlockInit[]
  /** Where to put it. Defaults to right after the block the caret is in. */
  at?: 'after' | 'before' | 'child' | 'end'
  target?: BlockId
  /** Whether to leave the caret in the new block. */
  focus?: boolean
}> = (ctx, args) => {
  const { tr, state } = ctx
  const { type, props, text, children, at = 'after', focus = true } = args
  const anchor = args.target ?? activeBlock(state.selection) ?? childrenOf(tr.doc, tr.doc.root).at(-1)
  const init: BlockInit = { type, ...(props ? { props } : {}), ...(text ? { text } : {}), ...(children ? { children } : {}) }

  let id: BlockId
  if (!anchor || at === 'end' || !has(tr.doc, anchor)) {
    id = tr.append(tr.doc.root, init)
  } else if (at === 'child') {
    if (!state.schema.isContainer(getBlock(tr.doc, anchor)!.type)) return false
    id = tr.append(anchor, init)
  } else if (at === 'before') {
    id = tr.insertBefore(anchor, init)
  } else {
    // Escribir "/imagen" en un párrafo vacío lo reemplaza, en lugar de dejarlo huérfano arriba.
    const block = getBlock(tr.doc, anchor)!
    if (state.schema.isTextual(block.type) && isEmpty(block.text) && childrenOf(tr.doc, anchor).length === 0) {
      tr.setType(anchor, type, props && Object.keys(props).length ? { ...state.schema.defaults(type), ...props } : (state.schema.defaults(type) ?? null))
      if (text) tr.setText(anchor, text)
      if (!state.schema.isTextual(type)) tr.setText(anchor, [])
      // Un init con hijos los trae puestos: una tabla es su bloque y sus filas, y reemplazar el
      // párrafo sin ellas dejaba una tabla sin una sola celda.
      for (const child of children ?? []) tr.append(anchor, child)
      if (focus) {
        tr.select(
          state.schema.isTextual(type)
            ? caret(anchor, textLength(tr.doc, anchor))
            : blockSel([anchor], anchor),
        )
      }
      return true
    }
    id = tr.insertAfter(anchor, init)
  }

  if (focus) {
    tr.select(state.schema.isTextual(type) ? caret(id, textLength(tr.doc, id)) : blockSel([id], id))
  }
  return true
}

export const removeBlock: Command<{ id?: BlockId }> = (ctx, { id } = {}) => {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  if (targets.length === 0) return false
  const landing = textualBefore(ctx, targets[0]!)
  let did = false
  for (const target of targets) {
    if (!has(tr.doc, target) || target === tr.doc.root) continue
    tr.remove(target)
    did = true
  }
  if (!did) return false
  if (childrenOf(tr.doc, tr.doc.root).length === 0) {
    const fresh = tr.append(tr.doc.root, { type: 'paragraph', text: [] })
    tr.select(caret(fresh, 0))
  } else if (landing && has(tr.doc, landing)) {
    tr.select(caret(landing, textLength(tr.doc, landing)))
  } else {
    tr.select(null)
  }
  return true
}

export const duplicateBlock: Command<{ id?: BlockId }> = (ctx, { id } = {}) => {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  if (targets.length === 0) return false
  const made: BlockId[] = []
  for (const target of targets) {
    const copy = copySubtree(tr.doc, target)
    if (!copy) continue
    made.push(tr.insertAfter(target, copy))
  }
  if (made.length === 0) return false
  const last = made[made.length - 1]!
  tr.select(state.schema.isTextual(getBlock(tr.doc, last)!.type) ? caret(last, textLength(tr.doc, last)) : blockSel(made, made[0]))
  return true
}

export const moveBlock: Command<{ id: BlockId; parent: BlockId; index: number }> = ({ tr, state }, { id, parent, index }) => {
  if (!has(tr.doc, id) || !has(tr.doc, parent)) return false
  // Un bloque adentro de sí mismo desconectaría su subárbol. El paso también lo rechaza, pero acá
  // es "no aplica" y no un error: quien arrastra sobre un destino imposible no rompió nada.
  if (parent === id || isAncestor(tr.doc, id, parent)) return false
  if (parent !== tr.doc.root && !state.schema.accepts(getBlock(tr.doc, parent)!.type, getBlock(tr.doc, id)!.type)) return false
  if (parentOf(tr.doc, id) === parent && indexOf(tr.doc, id) === index) return false
  tr.move(id, parent, index)
  return true
}

/**
 * Varios bloques al mismo lugar, en el orden en que se leen y quedando pegados.
 *
 * No es un `moveBlock` en un `for`: el índice de destino se corre a medida que entran, y los que
 * venían de más arriba del propio destino lo corren para atrás al salir. Hacer esa cuenta afuera es
 * la clase de cosa que anda con dos bloques y falla con tres.
 */
export const moveBlocks: Command<{ ids: readonly BlockId[]; parent: BlockId; index: number }> = (
  ctx,
  { ids, parent, index },
) => {
  const { tr } = ctx
  const order = flatten(tr.doc)
  const targets = [...ids].filter((id) => has(tr.doc, id)).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  let at = index
  let did = false
  for (const id of targets) {
    // Sacar un bloque que estaba antes del destino, y bajo el mismo padre, corre el hueco.
    const salia = parentOf(tr.doc, id) === parent && indexOf(tr.doc, id) < at
    if (!moveBlock(ctx, { id, parent, index: salia ? at - 1 : at })) continue
    at = (salia ? at - 1 : at) + 1
    did = true
  }
  return did
}

/**
 * Los bloques que un movimiento tiene que llevarse, cuando forman un grupo que se puede mover.
 *
 * Un grupo es varios hermanos seguidos. Salteados no quiere decir nada (¿adónde va el hueco?), y de
 * padres distintos tampoco, así que en esos casos no se mueve nada en lugar de mover cualquier cosa.
 */
function movable(ctx: CommandCtx, id?: BlockId): { parent: BlockId; first: BlockId; last: BlockId } | null {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  if (targets.length === 0 || targets.some((t) => !has(tr.doc, t))) return null
  const parent = parentOf(tr.doc, targets[0]!)
  if (!parent) return null
  const siblings = childrenOf(tr.doc, parent)
  const spots = targets.map((t) => siblings.indexOf(t)).sort((a, b) => a - b)
  if (spots[0] === -1) return null
  if (spots[spots.length - 1]! - spots[0]! !== spots.length - 1) return null
  return { parent, first: siblings[spots[0]!]!, last: siblings[spots[spots.length - 1]!]! }
}

/**
 * Sube el grupo por encima del hermano de arriba, sin cambiar de nivel.
 *
 * Se hace moviendo al vecino y no al grupo, que además de ser un solo paso es lo que deja la
 * selección intacta: los bloques elegidos no se tocan, se corre el de al lado.
 */
export const moveUp: Command<{ id?: BlockId }> = (ctx, { id } = {}) => {
  const group = movable(ctx, id)
  if (!group) return false
  const before = siblingBefore(ctx.tr.doc, group.first)
  if (!before) return false
  ctx.tr.move(before, group.parent, indexOf(ctx.tr.doc, group.last))
  return true
}

export const moveDown: Command<{ id?: BlockId }> = (ctx, { id } = {}) => {
  const group = movable(ctx, id)
  if (!group) return false
  const after = siblingAfter(ctx.tr.doc, group.last)
  if (!after) return false
  ctx.tr.move(after, group.parent, indexOf(ctx.tr.doc, group.first))
  return true
}

/** Tab: el hermano de arriba pasa a ser el padre. La sangría es parentesco, no una estructura aparte. */
export const indent: Command<{ id?: BlockId }> = (ctx, { id } = {}) => {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  if (targets.length === 0) return false
  let did = false
  for (const target of targets) {
    if (!has(tr.doc, target)) continue
    const before = siblingBefore(tr.doc, target)
    if (!before) continue
    if (!state.schema.accepts(getBlock(tr.doc, before)!.type, getBlock(tr.doc, target)!.type)) continue
    tr.move(target, before, childrenOf(tr.doc, before).length)
    did = true
  }
  if (did) tr.select(state.selection)
  return did
}

/** Shift+Tab. Out one level, landing right after what used to be the parent. */
export const outdent: Command<{ id?: BlockId }> = (ctx, { id } = {}) => {
  const { tr, state } = ctx
  const targets = id ? [id] : selectedBlocks(tr.doc, state.selection)
  if (targets.length === 0) return false
  let did = false
  // De atrás para adelante: sacar el primero movería a los que siguen antes de tocarlos.
  for (const target of [...targets].reverse()) {
    if (!has(tr.doc, target)) continue
    const parent = parentOf(tr.doc, target)
    if (parent == null || parent === tr.doc.root) continue
    const grandparent = parentOf(tr.doc, parent) ?? tr.doc.root
    tr.move(target, grandparent, indexOf(tr.doc, parent) + 1)
    did = true
  }
  if (did) tr.select(state.selection)
  return did
}

// ---------------------------------------------------------------------------- navigation

/** Left arrow at offset 0, which should walk into the block above and not stall. */
export const caretBackward: Command = (ctx) => {
  const { tr, state } = ctx
  if (!isText(state.selection)) return false
  const { block, offset } = state.selection.head
  if (offset > 0) return false
  const before = textualBefore(ctx, block)
  if (!before) return false
  tr.select(caret(before, textLength(tr.doc, before)))
  return true
}

export const caretForward: Command = (ctx) => {
  const { tr, state } = ctx
  if (!isText(state.selection)) return false
  const { block, offset } = state.selection.head
  if (offset < textLength(tr.doc, block)) return false
  const order = flatten(tr.doc).filter((id) => isTextual(ctx, id))
  const i = order.indexOf(block)
  // Sin esto, un bloque que no es textual daba -1 y el caret se iba al primero del documento.
  if (i === -1) return false
  const next = order[i + 1]
  if (!next) return false
  tr.select(caret(next, 0))
  return true
}

// ---------------------------------------------------------------------------- bulk

/** Replaces everything. What loading an activity from the server does. */
export const replaceContent: Command<{ blocks: BlockInit[] }> = ({ tr }, { blocks }) => {
  // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
  for (const id of [...childrenOf(tr.doc, tr.doc.root)]) tr.remove(id)
  const made = blocks.map((b) => tr.append(tr.doc.root, b))
  if (made.length === 0) {
    const fresh = tr.append(tr.doc.root, { type: 'paragraph', text: [] })
    tr.select(caret(fresh, 0))
  } else {
    // Al final y no al principio: lo que se escriba o se inserte después va a continuación de lo
    // que se acaba de poner, que es lo que espera tanto una persona como un lote de operaciones.
    const last = made[made.length - 1]!
    tr.select(caret(last, textLength(tr.doc, last)))
  }
  return true
}

/** Adds blocks at the end, or under a parent. The bulk door an agent writes through. */
export const appendBlocks: Command<{ blocks: BlockInit[]; parent?: BlockId; focus?: boolean }> = (
  { tr, state },
  { blocks, parent, focus = true },
) => {
  const into = parent && has(tr.doc, parent) ? parent : tr.doc.root
  if (blocks.length === 0) return false
  const made = blocks.map((b) => tr.append(into, b))
  const last = made[made.length - 1]!
  if (focus) {
    tr.select(state.schema.isTextual(getBlock(tr.doc, last)!.type) ? caret(last, textLength(tr.doc, last)) : blockSel([last], last))
  }
  return true
}

/** The end of the document, for a caret that has nowhere else to go. */
export const focusEnd: Command = ({ tr }) => {
  const kids = childrenOf(tr.doc, tr.doc.root)
  const last = kids[kids.length - 1]
  if (!last) return false
  const deepest = lastDescendant(tr.doc, last)
  tr.select(caret(deepest, textLength(tr.doc, deepest)))
  return true
}
