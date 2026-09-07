/**
 * The plugin contract: what the core is willing to be extended with.
 *
 * The core has no paragraphs in it. It knows how to split, merge, move, format and undo, and it
 * asks a schema what each type wants. Everything you can name comes from a plugin, and a plugin
 * is a plain object, not a class to inherit from:
 *
 *   blocks              the types that exist, with their behaviour and their props
 *   commands            new verbs, on the same footing as the built-in ones
 *   keys                bindings, several allowed per key, tried until one takes it
 *   rules               what typing "1. " or "**bold**" does
 *   normalize           the invariants the plugin keeps after every change
 *   paste               how foreign content becomes blocks
 *   view                anything the render layer should know, kept opaque here
 *
 * Bindings and rules are declared as data pointing at command names rather than as closures. It
 * costs one indirection and it buys a keymap that can be inspected, shown in a help panel,
 * overridden by the platform and serialised for an agent.
 */

import type { BlockId } from './doc.ts'
import type { BlockSpec } from './schema.ts'
import type { Command, CommandCtx } from './commands.ts'
import type { EditorState } from './state.ts'
import type { Transaction } from './transaction.ts'

/**
 * A key, written the way a person would: `Mod-b`, `Shift-Enter`, `Mod-Shift-8`, `Escape`, `Tab`.
 * `Mod` is Cmd on a Mac and Ctrl everywhere else, which is the only reason this is not a string
 * comparison against the event.
 */
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

/**
 * An input rule: a pattern matched against the text of the block up to the caret, right after a
 * character was typed. This is where "# " becomes a heading and "**word**" becomes bold.
 */
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
   * Runs after every transaction that changed the document, and may add steps to it. This is where
   * a plugin keeps its own invariants: a table left with a missing cell, a column layout down to
   * one column, a divider that ended up with children. Called until nothing changes, a few times
   * at most.
   *
   * `touched` is what changed, with the ancestors of each one included, and a normalizer has to
   * look only at that. Walking the whole document instead is the difference between a keystroke
   * costing the same on a page of five blocks and on a page of a thousand: with three plugins
   * each sweeping every block, typing one letter into a long activity walked three thousand
   * entries before the letter appeared.
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
