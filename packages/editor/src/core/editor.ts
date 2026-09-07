/**
 * The editor: the one object that owns the state and the only one that changes it.
 *
 * Everything else in the package reads. Commands fill transactions, the view renders the state,
 * plugins add types and keys, an agent sends operations. They all come through here.
 *
 * The performance decision lives here too, and it is the per-block subscription. A change knows
 * exactly which blocks it touched, because every step reports it, so typing in a document of a
 * thousand blocks notifies one listener and re-renders one paragraph. Without it every keystroke
 * would diff a thousand components and the editor would feel like it is thinking.
 */

import type { Block, BlockId, BlockInit, Doc } from './doc.ts'
import { emptyDoc, validate } from './doc.ts'
import type { Schema } from './schema.ts'
import { defineSchema } from './schema.ts'
import type { EditorState } from './state.ts'
import { stateFrom, stateOf } from './state.ts'
import type { Selection } from './selection.ts'
import { isText, repair, sameSelection } from './selection.ts'
import { Transaction } from './transaction.ts'
import type { Command, CommandCtx } from './commands.ts'
import * as core from './commands.ts'
import { History, type HistoryOptions } from './history.ts'
import { StepError, type Step } from './steps.ts'
import { collect, nameKey, normalizeKey, type KeyBinding, type KeyEventish, type Plugin } from './plugins.ts'
import { plain } from './text.ts'

export type Change = {
  state: EditorState
  previous: EditorState
  /** The blocks whose object is not the same one it was. Empty when only the caret moved. */
  touched: ReadonlySet<BlockId>
  docChanged: boolean
  selectionChanged: boolean
  /** Absent when the change came from a state replacement rather than a transaction. */
  tr?: Transaction
}

export type Listener = (change: Change) => void

export type EditorOptions = {
  plugins?: readonly Plugin[]
  /** The starting content. Ignored when `doc` is given. */
  blocks?: readonly BlockInit[]
  doc?: Doc
  selection?: Selection
  history?: HistoryOptions
  /** Blocks every change. The same document, rendered but not editable. */
  readOnly?: boolean
  /** Throws on an inconsistent document instead of carrying on. On in tests. */
  strict?: boolean
}

/** The commands the core ships, under the names an agent and a keymap use. */
const BUILT_IN: Record<string, Command<never>> = {
  insertText: core.insertText as Command<never>,
  insertRichText: core.insertRichText as Command<never>,
  insertSoftBreak: core.insertSoftBreak as Command<never>,
  deleteSelection: core.deleteSelection as Command<never>,
  deleteBackward: core.deleteBackward as Command<never>,
  deleteForward: core.deleteForward as Command<never>,
  deleteWordBackward: core.deleteWordBackward as Command<never>,
  splitBlock: core.splitBlock as Command<never>,
  toggleMark: core.toggleMark as Command<never>,
  setLink: core.setLink as Command<never>,
  clearFormatting: core.clearFormatting as Command<never>,
  setBlockType: core.setBlockType as Command<never>,
  setBlockProps: core.setBlockProps as Command<never>,
  insertBlock: core.insertBlock as Command<never>,
  removeBlock: core.removeBlock as Command<never>,
  duplicateBlock: core.duplicateBlock as Command<never>,
  moveBlock: core.moveBlock as Command<never>,
  moveUp: core.moveUp as Command<never>,
  moveDown: core.moveDown as Command<never>,
  indent: core.indent as Command<never>,
  outdent: core.outdent as Command<never>,
  selectBlock: core.selectBlock as Command<never>,
  selectBlockRange: core.selectBlockRange as Command<never>,
  selectEnclosingBlock: core.selectEnclosingBlock as Command<never>,
  selectAll: core.selectAll as Command<never>,
  focusBlock: core.focusBlock as Command<never>,
  focusEnd: core.focusEnd as Command<never>,
  moveCaret: core.moveCaret as Command<never>,
  caretBackward: core.caretBackward as Command<never>,
  caretForward: core.caretForward as Command<never>,
  replaceContent: core.replaceContent as Command<never>,
  appendBlocks: core.appendBlocks as Command<never>,
}

const MAX_NORMALIZE_PASSES = 8

/**
 * The context a command runs in. `state` is a getter on purpose: it has to answer with the
 * transaction as it stands, not as it started, or two commands in one transaction would both act
 * on the same starting selection and the second one would undo the first one's work.
 */
/** The touched blocks plus every ancestor of each: who might have something to fix about them. */
function withAncestors(doc: Doc, ids: ReadonlySet<BlockId>): Set<BlockId> {
  const out = new Set<BlockId>()
  for (const id of ids) {
    let at: BlockId | null = id
    while (at && !out.has(at)) {
      out.add(at)
      at = doc.blocks[at]?.parent ?? null
    }
  }
  return out
}

export const ctxOf = (tr: Transaction): CommandCtx => ({
  get state() {
    return tr.current
  },
  tr,
})

export class Editor {
  state: EditorState
  readonly schema: Schema
  readonly history: History
  readonly plugins: readonly Plugin[]
  readonly view: Readonly<Record<string, unknown>>
  readOnly: boolean

  private readonly commands: Map<string, Command<never>>
  private readonly keys = new Map<string, KeyBinding[]>()
  private readonly bindings: readonly KeyBinding[]
  private readonly rules
  private readonly pasteHandlers
  private readonly normalizers
  private readonly filters
  private readonly strict: boolean

  private listeners = new Set<Listener>()
  private perBlock = new Map<BlockId, Set<() => void>>()
  /** Bumped on every change so a view can compare cheaply. */
  version = 0

  constructor(opts: EditorOptions = {}) {
    const parts = collect(opts.plugins ?? [])
    this.plugins = opts.plugins ?? []
    this.schema = defineSchema(parts.blocks)
    this.commands = new Map([...Object.entries(BUILT_IN), ...parts.commands])
    this.bindings = parts.keys
    for (const b of parts.keys) {
      const key = normalizeKey(b.key)
      const list = this.keys.get(key)
      if (list) list.push(b)
      else this.keys.set(key, [b])
    }
    this.rules = parts.rules
    this.pasteHandlers = parts.paste
    this.normalizers = parts.normalizers
    this.filters = parts.filters
    this.view = parts.view
    this.readOnly = opts.readOnly ?? false
    this.strict = opts.strict ?? false
    this.history = new History(opts.history)

    this.state = opts.doc
      ? stateOf(opts.doc, this.schema, opts.selection ?? null)
      : opts.blocks
        ? stateFrom(this.schema, opts.blocks)
        : stateOf(emptyDoc(), this.schema, null)

    // Un documento vacío no se puede escribir: siempre hay dónde poner el caret.
    if (this.state.doc.blocks[this.state.doc.root]!.children.length === 0) {
      this.exec((ctx) => core.insertBlock(ctx, { type: this.firstTextualType(), at: 'end' }), { history: false })
      this.history.clear()
    }
  }

  private firstTextualType(): string {
    return this.schema.types.find((t) => this.schema.isTextual(t)) ?? 'paragraph'
  }

  get doc() {
    return this.state.doc
  }

  get selection() {
    return this.state.selection
  }

  block(id: BlockId): Block | undefined {
    return this.state.doc.blocks[id]
  }

  /** The command names, for the shortcut panel and for the agent manifest. */
  get commandNames(): string[] {
    return [...this.commands.keys()].sort()
  }

  get keyBindings(): readonly KeyBinding[] {
    return this.bindings
  }

  // -------------------------------------------------------------------------- running

  /** The command behind a name, for a caller that runs several in one transaction. */
  commandOf(name: string): Command<never> | undefined {
    return this.commands.get(name)
  }

  /** Runs a registered command by name. Returns whether it did anything. */
  run(name: string, args?: unknown, meta?: Record<string, unknown>): boolean {
    const cmd = this.commands.get(name)
    if (!cmd) {
      if (this.strict) throw new Error(`no existe el comando ${name}`)
      return false
    }
    return this.exec((ctx) => cmd(ctx, args as never), meta)
  }

  /** Whether a command would do something, without doing it. What a toolbar asks. */
  can(name: string, args?: unknown): boolean {
    const cmd = this.commands.get(name)
    if (!cmd || this.readOnly) return false
    const tr = new Transaction(this.state)
    try {
      return cmd(ctxOf(tr), args as never)
    } catch {
      return false
    }
  }

  /** Runs an ad hoc command. The door for the view layer, which has geometry the core lacks. */
  exec(fn: (ctx: CommandCtx) => boolean, meta?: Record<string, unknown>): boolean {
    if (this.readOnly && meta?.readOnly !== true) return false
    const tr = new Transaction(this.state)
    if (meta) for (const [k, v] of Object.entries(meta)) tr.setMeta(k, v)
    let did: boolean
    try {
      did = fn(ctxOf(tr))
    } catch (err) {
      if (err instanceof StepError) {
        if (this.strict) throw err
        return false
      }
      throw err
    }
    if (!did) return false
    this.dispatch(tr)
    return true
  }

  /** Applies a transaction: normalises it, files it in the history and announces it. */
  dispatch(tr: Transaction): void {
    for (const filter of this.filters) if (!filter({ state: this.state, tr })) return

    if (tr.steps.length > 0) this.normalize(tr)

    const previous = this.state
    const next = tr.result()
    const docChanged = next.doc !== previous.doc
    const selectionChanged = !sameSelection(next.selection, previous.selection)
    // Un atajo de formato con el caret en una línea vacía no cambia el documento ni mueve el
    // caret: lo único que cambia es lo que va a pasarle a la próxima letra. Igual tiene que salir,
    // porque la barra de formato lo muestra apretado.
    const marksChanged = JSON.stringify(next.storedMarks ?? null) !== JSON.stringify(previous.storedMarks ?? null)
    if (!docChanged && !selectionChanged && !marksChanged) return

    if (this.strict && docChanged) {
      const bad = validate(next.doc)
      if (bad.length) throw new Error(`la transacción dejó el documento inconsistente:\n  ${bad.join('\n  ')}`)
    }

    if (docChanged) this.history.record(tr)
    this.state = next
    this.version++
    this.announce({ state: next, previous, touched: tr.touched, docChanged, selectionChanged, tr })
  }

  /**
   * Lets the plugins fix up what a command left behind, until nothing more changes.
   *
   * Each pass hands them what changed so far, ancestors included, because a plugin's invariant is
   * usually about a container: take a cell out and the one who has something to say about it is
   * the table. And each pass sees what the previous pass added, so a fix that causes another fix
   * still settles.
   */
  private normalize(tr: Transaction): void {
    if (this.normalizers.length === 0) return
    for (let pass = 0; pass < MAX_NORMALIZE_PASSES; pass++) {
      const before = tr.doc
      const touched = withAncestors(tr.doc, tr.touched)
      for (const fix of this.normalizers) fix({ state: this.state, tr, touched })
      if (tr.doc === before) return
    }
    if (this.strict) throw new Error('un normalizador no se estabiliza')
  }

  /**
   * Tells everyone watching. Each listener is called inside its own try, and that is deliberate:
   * without it, one throwing listener would stop the rest from ever hearing about the change, and
   * the change is already applied, so the document and the screen would drift apart from that
   * point on. A menu with a bug in it has to be a menu with a bug in it, not an editor that
   * cannot be typed into.
   *
   * In strict mode it throws instead, because in a test a broken listener is the finding.
   */
  private announce(change: Change): void {
    for (const id of change.touched) {
      const subs = this.perBlock.get(id)
      if (!subs) continue
      for (const fn of subs) this.safely(fn)
    }
    for (const fn of this.listeners) this.safely(() => fn(change))
  }

  private safely(fn: () => void): void {
    if (this.strict) {
      fn()
      return
    }
    try {
      fn()
    } catch (err) {
      // Sin `throw`: el cambio ya está aplicado y el resto tiene que enterarse igual.
      console.error('[melu/editor] un suscriptor falló al recibir un cambio', err)
    }
  }

  // -------------------------------------------------------------------------- history

  undo(): boolean {
    const entry = this.history.takeUndo()
    if (!entry) return false
    return this.replay(entry.steps, entry.selection)
  }

  redo(): boolean {
    const entry = this.history.takeRedo()
    if (!entry) return false
    return this.replay(entry.steps, entry.selection)
  }

  /** Applies steps as they are, without filing them: undo must not become a new change. */
  private replay(steps: readonly Step[], selection: Selection): boolean {
    const tr = new Transaction(this.state)
    tr.silent()
    try {
      for (const s of steps) tr.step(s)
    } catch (err) {
      if (err instanceof StepError) {
        // Un paso que ya no se puede aplicar deja el historial mintiendo: se descarta entero.
        this.history.clear()
        return false
      }
      throw err
    }
    tr.select(selection)
    this.dispatch(tr)
    return true
  }

  // -------------------------------------------------------------------------- keys

  /**
   * Offers a keyboard event to the bindings, most recently registered first, and stops at the
   * first command that takes it. Returns true when the event was handled, which is the caller's
   * cue to call preventDefault.
   */
  handleKey(event: KeyEventish): boolean {
    if (this.readOnly) return false
    const list = this.keys.get(nameKey(event))
    if (!list) return false
    // Al revés: el último plugin que ató la tecla es el que manda, sin tocar a los de antes.
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i]!
      if (b.when && !b.when(this.state)) continue
      if (this.run(b.run, b.args)) return true
    }
    return false
  }

  /**
   * Runs the input rules against the block the caret is in. Called after text went in, so "# "
   * has already been typed when the rule that turns it into a heading fires.
   */
  applyInputRules(): boolean {
    const sel = this.state.selection
    if (!isText(sel)) return false
    const { block, offset } = sel.head
    const text = this.state.doc.blocks[block]?.text
    if (text === undefined) return false
    const head = plain(text).slice(0, offset)
    for (const rule of this.rules) {
      const m = head.match(rule.match)
      if (!m) continue
      const from = m.index ?? 0
      const to = from + m[0].length
      const fired = this.exec((ctx) => rule.run({ ctx, id: block, match: m, from, to }), { rule: rule.name })
      if (fired) return true
    }
    return false
  }

  /** Hands pasted content to the first handler that wants one of the types on offer. */
  handlePaste(data: Readonly<Record<string, string>>): boolean {
    if (this.readOnly) return false
    for (const handler of this.pasteHandlers) {
      for (const type of handler.types) {
        const payload = data[type]
        if (payload === undefined || payload === '') continue
        if (this.exec((ctx) => handler.run({ ctx, data: payload, type }), { paste: handler.name })) return true
      }
    }
    return false
  }

  // -------------------------------------------------------------------------- watching

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Called only when that block changed. The view uses one of these per rendered block, which is
   * what keeps a keystroke to a single re-render.
   */
  subscribeBlock(id: BlockId, listener: () => void): () => void {
    let subs = this.perBlock.get(id)
    if (!subs) {
      subs = new Set()
      this.perBlock.set(id, subs)
    }
    subs.add(listener)
    return () => {
      const s = this.perBlock.get(id)
      if (!s) return
      s.delete(listener)
      if (s.size === 0) this.perBlock.delete(id)
    }
  }

  // -------------------------------------------------------------------------- state

  /** Replaces the state wholesale. Loading a document from the server, or a test setting a scene. */
  setState(state: EditorState, opts: { history?: 'keep' | 'clear' } = {}): void {
    const previous = this.state
    this.state = { ...state, selection: repair(state.doc, state.selection) }
    if (opts.history !== 'keep') this.history.clear()
    this.version++
    const touched = new Set<BlockId>([...Object.keys(previous.doc.blocks), ...Object.keys(state.doc.blocks)])
    this.announce({
      state: this.state,
      previous,
      touched,
      docChanged: previous.doc !== this.state.doc,
      selectionChanged: !sameSelection(previous.selection, this.state.selection),
    })
  }

  /** Moves the caret without touching the document, and without an undo entry. */
  setSelection(selection: Selection): void {
    if (sameSelection(selection, this.state.selection)) return
    this.exec((ctx) => {
      ctx.tr.select(selection)
      return true
    }, { history: false, readOnly: true })
  }

  destroy(): void {
    this.listeners.clear()
    this.perBlock.clear()
  }
}
