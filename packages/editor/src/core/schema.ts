/**
 * The schema: what block types exist and how they behave.
 *
 * The core knows nothing about paragraphs, images or multiple choice. It knows how to move,
 * split, merge and format blocks, and it asks the schema what each type wants. Adding a block
 * type is writing one spec and handing it to a plugin, which is what keeps "cualquier tipo de
 * bloque" from being a promise.
 *
 * The declared props are not decoration either: they validate what comes in from a paste or from
 * an agent, they provide the defaults, and they are what `manifest()` publishes so a model can
 * author blocks it was never told about.
 */

import type { MarkType, RichText } from './text.ts'
import type { Props } from './doc.ts'

/** The declared shape of one prop. Small on purpose: props are plain JSON. */
export type PropSpec =
  | { kind: 'string'; default?: string; options?: readonly string[]; label?: string; hint?: string }
  | { kind: 'number'; default?: number; min?: number; max?: number; step?: number; label?: string; hint?: string }
  | { kind: 'boolean'; default?: boolean; label?: string; hint?: string }
  | { kind: 'text'; default?: RichText; label?: string; hint?: string }
  | { kind: 'list'; of: PropSpec; default?: readonly unknown[]; label?: string; hint?: string }
  | { kind: 'json'; default?: unknown; label?: string; hint?: string }

/** What happens when Enter is pressed. Named after the case, not after the key. */
export type SplitBehaviour = {
  /** Enter in the middle of the text: the tail becomes a block of this type. Defaults to itself. */
  middle?: string
  /** Enter at the very end: the new block is of this type. A heading gives a paragraph. */
  end?: string
  /** Enter on an empty block: it converts to this instead of creating another one. */
  empty?: string
}

export type BlockSpec = {
  type: string
  /** The label a guide reads, in Spanish. */
  name: string
  /** One line explaining when to use it, in Spanish. */
  hint?: string
  /** The heading it sits under in the insert menu, in Spanish. */
  group?: string
  /** Extra words the insert menu should match, in Spanish. */
  keywords?: readonly string[]
  /** A key into the view layer's icon set. */
  icon?: string

  /** Whether the block owns editable rich text. `none` makes it a void block. */
  content?: 'text' | 'none'
  /** Whether it can hold child blocks, optionally restricted to some types. */
  container?: boolean | { only?: readonly string[] }
  /** Which marks the text accepts. `false` means none: a code block takes no bold. */
  marks?: readonly MarkType[] | false

  /** The greyed out text shown while it is empty, in Spanish. */
  placeholder?: string
  /** What Enter does. */
  split?: SplitBehaviour
  /** Backspace at offset 0 converts to this first, and only merges if already of that type. */
  backspace?: string
  /** Types this one can be turned into from the block menu, beyond the textual default. */
  convertsTo?: readonly string[]

  /** The declared props, with their defaults. */
  props?: Readonly<Record<string, PropSpec>>

  /** False for a block that cannot be dragged or selected, like a column inside a layout. */
  draggable?: boolean
  selectable?: boolean
  /** Whether the block is a whole row that cannot share a line, like a divider. */
  standalone?: boolean
}

export type Schema = {
  readonly blocks: Readonly<Record<string, BlockSpec>>
  readonly types: readonly string[]
  /** The insert menu, already grouped in declaration order. */
  readonly groups: readonly { group: string; items: readonly BlockSpec[] }[]
  spec(type: string): BlockSpec | undefined
  /** The spec, or the fallback one, so an unknown type renders as text instead of crashing. */
  specOr(type: string): BlockSpec
  isTextual(type: string): boolean
  isContainer(type: string): boolean
  accepts(parent: string, child: string): boolean
  allowsMark(type: string, mark: MarkType): boolean
  /** The props of a fresh block of that type. */
  defaults(type: string): Props | undefined
  /** Fuzzy search over name, keywords and type, for the slash menu. */
  search(query: string, limit?: number): BlockSpec[]
}

const FALLBACK: BlockSpec = {
  type: 'paragraph',
  name: 'Texto',
  content: 'text',
}

export function defaultProps(spec: BlockSpec | undefined): Props | undefined {
  if (!spec?.props) return undefined
  const out: Props = {}
  for (const [key, p] of Object.entries(spec.props)) {
    if (p.default !== undefined) out[key] = p.kind === 'list' ? [...(p.default as readonly unknown[])] : p.default
  }
  return Object.keys(out).length ? out : undefined
}

/** Strips diacritics and case so "parrafo" finds "Párrafo". */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/**
 * Scores a spec against a query. Exact and prefix matches beat contained ones, and the name beats
 * the keywords, so typing "im" puts Imagen first and not "Emparejar".
 */
function score(spec: BlockSpec, q: string): number {
  const name = fold(spec.name)
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  const words = name.split(/\s+/)
  if (words.some((w) => w.startsWith(q))) return 70
  if (fold(spec.type).startsWith(q)) return 65
  for (const k of spec.keywords ?? []) {
    const kf = fold(k)
    if (kf === q) return 60
    if (kf.startsWith(q)) return 50
  }
  if (name.includes(q)) return 30
  if ((spec.keywords ?? []).some((k) => fold(k).includes(q))) return 20
  if (fold(spec.hint ?? '').includes(q)) return 10
  return 0
}

export function defineSchema(specs: readonly BlockSpec[]): Schema {
  const blocks: Record<string, BlockSpec> = {}
  const order: string[] = []
  for (const s of specs) {
    // El último que declara un tipo gana, y no pierde su lugar en el menú: así un plugin puede
    // ajustar un bloque que ya existe sin reordenar todo.
    if (!blocks[s.type]) order.push(s.type)
    blocks[s.type] = s
  }

  const groups: { group: string; items: BlockSpec[] }[] = []
  for (const type of order) {
    const spec = blocks[type]!
    if (!spec.group) continue
    let g = groups.find((x) => x.group === spec.group)
    if (!g) {
      g = { group: spec.group, items: [] }
      groups.push(g)
    }
    g.items.push(spec)
  }

  const defaultsCache = new Map<string, Props | undefined>()

  const schema: Schema = {
    blocks,
    types: order,
    groups,
    spec: (type) => blocks[type],
    specOr: (type) => blocks[type] ?? FALLBACK,
    isTextual: (type) => (blocks[type]?.content ?? 'text') === 'text',
    isContainer: (type) => Boolean(blocks[type]?.container),
    accepts(parent, child) {
      if (parent === 'doc') return true
      const c = blocks[parent]?.container
      if (!c) return false
      if (c === true) return true
      return !c.only || c.only.includes(child)
    },
    allowsMark(type, mark) {
      const m = blocks[type]?.marks
      if (m === false) return false
      if (m === undefined) return true
      return m.includes(mark)
    },
    defaults(type) {
      if (!defaultsCache.has(type)) defaultsCache.set(type, defaultProps(blocks[type]))
      const d = defaultsCache.get(type)
      return d ? { ...d } : undefined
    },
    search(query, limit = 12) {
      const q = fold(query)
      if (q === '') return order.map((t) => blocks[t]!).filter((s) => s.group).slice(0, limit)
      return order
        .map((t) => blocks[t]!)
        .map((s) => ({ s, n: score(s, q) }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n || order.indexOf(a.s.type) - order.indexOf(b.s.type))
        .slice(0, limit)
        .map((x) => x.s)
    },
  }
  return schema
}

/** Coerces one value to what the spec declared, returning undefined when it cannot. */
export function coerceProp(p: PropSpec, value: unknown): unknown {
  switch (p.kind) {
    case 'string': {
      const s = typeof value === 'string' ? value : value == null ? undefined : String(value)
      if (s === undefined) return undefined
      if (p.options && !p.options.includes(s)) return undefined
      return s
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(n)) return undefined
      if (p.min !== undefined && n < p.min) return p.min
      if (p.max !== undefined && n > p.max) return p.max
      return n
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : value === 'true' ? true : value === 'false' ? false : undefined
    case 'text':
      if (Array.isArray(value)) return value
      if (typeof value === 'string') return value === '' ? [] : [{ text: value }]
      return undefined
    case 'list':
      return Array.isArray(value) ? value : undefined
    case 'json':
      return value
  }
}

/**
 * Validates props against the spec. Unknown keys are kept: a block type may grow a prop before
 * the spec declares it, and dropping data silently is worse than carrying it.
 */
export function coerceProps(spec: BlockSpec | undefined, props: Props): { props: Props; dropped: string[] } {
  if (!spec?.props) return { props, dropped: [] }
  const out: Props = {}
  const dropped: string[] = []
  for (const [key, value] of Object.entries(props)) {
    const p = spec.props[key]
    if (!p) {
      out[key] = value
      continue
    }
    if (value === undefined || value === null) {
      out[key] = value
      continue
    }
    const c = coerceProp(p, value)
    if (c !== undefined) {
      out[key] = c
      continue
    }
    // Rechazado. Si el spec declara un valor por defecto, ese queda: dejar la clave sin nada
    // obliga a todo el que la lea a defenderse de un undefined que el spec ya había resuelto.
    dropped.push(key)
    if (p.default !== undefined) out[key] = p.default
  }
  return { props: out, dropped }
}
