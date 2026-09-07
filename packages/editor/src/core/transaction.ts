/**
 * The transaction: everything one gesture does, gathered before anything is announced.
 *
 * Pressing Enter in the middle of a list item is four changes (cut the text, create the block,
 * hand it the tail, move the caret) and it has to be one entry in the history, one notification
 * to the view and one save. So commands do not touch the state: they fill a transaction, and the
 * editor applies it whole.
 *
 * The builder is fluent and it keeps a running document, so a command can read what the previous
 * line of the same command just wrote. Ids are minted here, never inside a step, which is what
 * keeps the steps replayable.
 */

import type { BlockId, BlockInit, Doc, Props } from './doc.ts'
import { childrenOf, has, materialize, newId, parentOf } from './doc.ts'
import type { Step } from './steps.ts'
import { applyStep } from './steps.ts'
import type { EditorState } from './state.ts'
import type { Selection } from './selection.ts'
import { repair } from './selection.ts'
import type { Mark, RichText } from './text.ts'
import { normalize } from './text.ts'
import { coerceProps } from './schema.ts'

export type TransactionMeta = {
  /**
   * Transactions sharing a key and close in time become one undo entry. Typing uses the block id
   * so that writing a word is one undo, but writing in another block starts a new one.
   */
  coalesce?: string
  /** Keeps the change out of the history entirely: used by the DOM sync and by remote edits. */
  history?: false
  /** Free-form, for plugins. */
  [key: string]: unknown
}

export class Transaction {
  /** The document as it stands after the steps pushed so far. */
  doc: Doc
  /** Where the caret should end up. Untouched means "wherever it was, repaired". */
  selection: Selection
  readonly steps: Step[] = []
  readonly meta: TransactionMeta = {}
  readonly touched = new Set<BlockId>()
  /** Steps that undo this transaction, already in the right order. */
  readonly inverse: Step[] = []
  /** Undefined means "no opinion": the resulting state drops whatever was pending. */
  private stored: readonly Mark[] | null | undefined

  private readonly state: EditorState

  constructor(state: EditorState) {
    this.state = state
    this.doc = state.doc
    this.selection = state.selection
  }

  get schema() {
    return this.state.schema
  }

  get before() {
    return this.state
  }

  get empty() {
    return this.steps.length === 0
  }

  /** Applies one step to the running document. Throws through `StepError` if it cannot. */
  step(step: Step): this {
    const r = applyStep(this.doc, step)
    this.doc = r.doc
    this.steps.push(step)
    this.inverse.unshift(...r.inverse)
    for (const id of r.touched) this.touched.add(id)
    return this
  }

  // -------------------------------------------------------------------------- structure

  /** Creates a block under `parent` at `index` and returns its id. */
  insert(parent: BlockId, index: number, init: BlockInit): BlockId {
    const withDefaults = this.withDefaults(init)
    const { blocks, id } = materialize(withDefaults, parent)
    this.step({ op: 'insert', id, parent, index, blocks })
    return id
  }

  insertAfter(sibling: BlockId, init: BlockInit): BlockId {
    const parent = parentOf(this.doc, sibling) ?? this.doc.root
    return this.insert(parent, childrenOf(this.doc, parent).indexOf(sibling) + 1, init)
  }

  insertBefore(sibling: BlockId, init: BlockInit): BlockId {
    const parent = parentOf(this.doc, sibling) ?? this.doc.root
    return this.insert(parent, Math.max(0, childrenOf(this.doc, parent).indexOf(sibling)), init)
  }

  append(parent: BlockId, init: BlockInit): BlockId {
    return this.insert(parent, childrenOf(this.doc, parent).length, init)
  }

  remove(id: BlockId): this {
    return this.step({ op: 'remove', id })
  }

  move(id: BlockId, parent: BlockId, index: number): this {
    return this.step({ op: 'move', id, parent, index })
  }

  setType(id: BlockId, type: string, props?: Props | null): this {
    // Las props se validan acá también, y no solo al crear un bloque: convertir un párrafo vacío
    // en una imagen pasa por este camino, y un ancho de cinco mil llegado de un pegado o de un
    // agente entraba sin que nadie lo mirara.
    const clean = props ? coerceProps(this.schema.spec(type), props).props : props
    return this.step({ op: 'setType', id, type, props: clean })
  }

  setText(id: BlockId, text: RichText): this {
    return this.step({ op: 'setText', id, text: normalize(text) })
  }

  setProps(id: BlockId, patch: Props): this {
    const { props } = coerceProps(this.schema.spec(this.doc.blocks[id]?.type ?? ''), patch)
    return this.step({ op: 'setProps', id, props })
  }

  /** Moves every child of `id` to be a sibling right after it. Used when unwrapping. */
  liftChildren(id: BlockId): this {
    const parent = parentOf(this.doc, id)
    if (parent == null) return this
    let at = childrenOf(this.doc, parent).indexOf(id) + 1
    // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
    for (const child of [...childrenOf(this.doc, id)]) {
      this.move(child, parent, at)
      at++
    }
    return this
  }

  // -------------------------------------------------------------------------- selection

  select(selection: Selection): this {
    this.selection = selection
    return this
  }

  setMeta(key: string, value: unknown): this {
    ;(this.meta as Record<string, unknown>)[key] = value
    return this
  }

  /** Marks the transaction as coalescing with the neighbouring ones under the same key. */
  coalesce(key: string): this {
    this.meta.coalesce = key
    return this
  }

  /** Keeps this transaction out of the undo stack. */
  silent(): this {
    this.meta.history = false
    return this
  }

  /**
   * The state as it stands mid transaction. This is what a command reads, which is what lets two
   * commands compose: the second one sees what the first one just did instead of the state the
   * gesture started from. An agent sending five operations at once depends on exactly this.
   */
  get current(): EditorState {
    return {
      doc: this.doc,
      schema: this.schema,
      selection: this.selection,
      storedMarks: this.stored === undefined ? this.state.storedMarks : this.stored,
    }
  }

  /** Sets what the next character typed should be formatted as. An empty list means "nothing". */
  setStoredMarks(marks: readonly Mark[] | null): this {
    this.stored = marks
    return this
  }

  /** The state this transaction produces, with the selection pulled back onto the document. */
  result(): EditorState {
    return {
      doc: this.doc,
      schema: this.schema,
      selection: repair(this.doc, this.selection),
      // Sin opinión, lo pendiente se descarta: si no, una negrita pedida hace tres gestos
      // aparecería de golpe en la próxima palabra que alguien escriba.
      storedMarks: this.stored ?? null,
    }
  }

  private withDefaults(init: BlockInit): BlockInit {
    const spec = this.schema.spec(init.type)
    const defaults = this.schema.defaults(init.type)
    const props = defaults || init.props ? { ...defaults, ...init.props } : undefined
    const text = init.text ?? (this.schema.isTextual(init.type) ? [] : undefined)
    return {
      ...init,
      id: init.id && !has(this.doc, init.id) ? init.id : newId(),
      ...(props ? { props: coerceProps(spec, props).props } : {}),
      ...(text !== undefined ? { text: normalize(text) } : {}),
      ...(init.children ? { children: init.children.map((c) => this.withDefaults(c)) } : {}),
    }
  }
}
