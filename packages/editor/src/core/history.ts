// Deshacer y rehacer, con los inversos que los pasos ya saben producir. Dos detalles deciden si
// se siente bien: que escribir una palabra sea un deshacer y no once, y que el caret vuelva a
// donde estaba, porque si no se pierde el lugar.

import type { Selection } from './selection.ts'
import type { Step } from './steps.ts'
import type { Transaction } from './transaction.ts'

export type HistoryEntry = {
  /** Steps that undo the entry, in the order they must be applied. */
  undo: Step[]
  /** Steps that do it again. */
  redo: Step[]
  before: Selection
  after: Selection
  key?: string
  time: number
}

export type HistoryOptions = {
  /** How long two transactions with the same key keep folding into one entry. */
  gap?: number
  /** How many entries to keep. Old ones fall off the bottom. */
  depth?: number
  /** Injectable so tests do not depend on the clock. */
  now?: () => number
}

export class History {
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []
  private readonly gap: number
  private readonly depth: number
  private readonly now: () => number

  constructor(opts: HistoryOptions = {}) {
    this.gap = opts.gap ?? 700
    this.depth = opts.depth ?? 200
    this.now = opts.now ?? (() => Date.now())
  }

  get canUndo() {
    return this.past.length > 0
  }

  get canRedo() {
    return this.future.length > 0
  }

  /** For the tests and the debug panel: how many entries deep the stacks are. */
  get size() {
    return { past: this.past.length, future: this.future.length }
  }

  clear(): void {
    this.past = []
    this.future = []
  }

  /** Files a transaction. Anything that redoes work must not land here, hence `silent()`. */
  record(tr: Transaction): void {
    if (tr.meta.history === false || tr.steps.length === 0) return
    const at = this.now()
    const key = typeof tr.meta.coalesce === 'string' ? tr.meta.coalesce : undefined
    const last = this.past[this.past.length - 1]

    if (key !== undefined && last && last.key === key && at - last.time <= this.gap) {
      // El inverso del nuevo va adelante: deshacer recorre los pasos al revés de como se hicieron.
      last.undo = [...tr.inverse, ...last.undo]
      last.redo = [...last.redo, ...tr.steps]
      last.after = tr.selection
      last.time = at
    } else {
      this.past.push({
        undo: [...tr.inverse],
        redo: [...tr.steps],
        before: tr.before.selection,
        after: tr.selection,
        key,
        time: at,
      })
      if (this.past.length > this.depth) this.past.shift()
    }
    // Cualquier cambio nuevo tira la rama de rehacer: no hay dos futuros.
    this.future = []
  }

  /** The steps to apply to undo, and where to leave the caret. Null when there is nothing. */
  takeUndo(): { steps: Step[]; selection: Selection } | null {
    const entry = this.past.pop()
    if (!entry) return null
    this.future.push(entry)
    return { steps: entry.undo, selection: entry.before }
  }

  takeRedo(): { steps: Step[]; selection: Selection } | null {
    const entry = this.future.pop()
    if (!entry) return null
    this.past.push(entry)
    return { steps: entry.redo, selection: entry.after }
  }

  /** Cierra el grupo abierto: lo que pasa después de una pausa es otro cambio. */
  break(): void {
    const last = this.past[this.past.length - 1]
    if (last) last.key = undefined
  }
}
