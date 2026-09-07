// El contrato de extensión. El core no tiene un párrafo adentro: todo lo que se puede nombrar
// viene de un plugin, y un plugin es un objeto. Los bindings y las reglas apuntan a nombres de
// comando y no a closures, así el keymap se puede inspeccionar, mostrar y serializar.

import type { BlockId } from './doc.ts'
import type { BlockSpec } from './schema.ts'
import type { Command, CommandCtx } from './commands.ts'
import type { EditorState } from './state.ts'
import type { Transaction } from './transaction.ts'

/** Una tecla como la escribiría alguien: `Mod-b`, `Shift-Enter`. `Mod` es Cmd en Mac y Ctrl en el resto. */
export type KeyBinding = {
  key: string
  /** The name of a registered command. */
  run: string
  args?: unknown
  /** Only offered when this holds, so a binding can be scoped to one kind of block. */
  when?: (state: EditorState) => boolean
  /** Shown in the shortcut panel, in Spanish. Omit to hide the binding from it. */
  label?: string
}

/** Un patrón contra el texto hasta el caret, después de tipear: acá "# " se vuelve un título. */
export type InputRule = {
  name: string
  /** Matched against the plain text from the start of the block to the caret. Anchor it with $. */
  match: RegExp
  /** True if it fired. `from`/`to` are the offsets the match covers. */
  run: (args: { ctx: CommandCtx; id: BlockId; match: RegExpMatchArray; from: number; to: number }) => boolean
  /** Rules with a lower number are tried first. Default 0. */
  priority?: number
}

/** Turns pasted content into something the editor can insert. */
export type PasteHandler = {
  name: string
  /** The mime types this handler wants, best first. */
  types: readonly string[]
  run: (args: { ctx: CommandCtx; data: string; type: string }) => boolean
  priority?: number
}

export type Plugin = {
  name: string
  blocks?: readonly BlockSpec[]
  commands?: Readonly<Record<string, Command<never>>>
  keys?: readonly KeyBinding[]
  rules?: readonly InputRule[]
  paste?: readonly PasteHandler[]
  /**
   * Corre después de cada transacción y puede agregarle pasos: acá un plugin mantiene sus
   * invariantes (una tabla a la que le falta una celda, un armado que quedó con una columna).
   *
   * `touched` es lo que cambió con sus ancestros, y hay que mirar solo eso: recorrer el documento
   * entero hacía que una tecla costara según el largo de la página.
   */
  normalize?: (args: { state: EditorState; tr: Transaction; touched: ReadonlySet<BlockId> }) => void
  /** Return false to throw the whole transaction away. Used by read-only mode. */
  filter?: (args: { state: EditorState; tr: Transaction }) => boolean
  /** Opaque to the core; the render layer looks up what it knows. */
  view?: Readonly<Record<string, unknown>>
}

/** Flattens plugins into the indexes the editor actually reads at runtime. */
export function collect(plugins: readonly Plugin[]) {
  const blocks: BlockSpec[] = []
  const commands = new Map<string, Command<never>>()
  const keys: KeyBinding[] = []
  const rules: InputRule[] = []
  const paste: PasteHandler[] = []
  const normalizers: NonNullable<Plugin['normalize']>[] = []
  const filters: NonNullable<Plugin['filter']>[] = []
  const view: Record<string, unknown> = {}

  for (const p of plugins) {
    if (p.blocks) blocks.push(...p.blocks)
    if (p.commands) for (const [name, fn] of Object.entries(p.commands)) commands.set(name, fn)
    if (p.keys) keys.push(...p.keys)
    if (p.rules) rules.push(...p.rules)
    if (p.paste) paste.push(...p.paste)
    if (p.normalize) normalizers.push(p.normalize)
    if (p.filter) filters.push(p.filter)
    if (p.view) Object.assign(view, p.view)
  }

  rules.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  paste.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  return { blocks, commands, keys, rules, paste, normalizers, filters, view }
}

// ---------------------------------------------------------------------------- keys

const isApple = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')

/** What a keyboard event is called in a binding, so the two can be compared as strings. */
export type KeyEventish = {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/** `Mod-Shift-b` from an event, in the same canonical order bindings are parsed into. */
export function nameKey(e: KeyEventish, apple = isApple()): string {
  const parts: string[] = []
  const mod = apple ? e.metaKey : e.ctrlKey
  if (mod) parts.push('Mod')
  // El otro modificador se nombra igual: en Mac Ctrl no es Mod, y hay atajos que lo usan.
  if (apple ? e.ctrlKey : e.metaKey) parts.push(apple ? 'Ctrl' : 'Meta')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  parts.push(key)
  return parts.join('-')
}

/** Normalises what a binding wrote so it can be compared against `nameKey`. */
export function normalizeKey(key: string): string {
  const parts = key.split('-')
  const last = parts.pop() ?? ''
  const mods = new Set(parts.map((p) => (p === 'Cmd' || p === 'Meta' ? 'Mod' : p === 'Control' ? 'Ctrl' : p)))
  const order = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'].filter((m) => mods.has(m))
  return [...order, last.length === 1 ? last.toLowerCase() : last].join('-')
}
