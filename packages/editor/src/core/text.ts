// El texto de un bloque es una lista de runs con su formato, como en Notion. Todo acá es puro y
// total: recorta los offsets en lugar de tirar, así una selección vieja no puede romper un render.

export type MarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'color' | 'bg'

/** A format applied to a run. `value` is the href of a link or the token name of a colour. */
export type Mark = { type: MarkType; value?: string }

/** A run of text that shares the same formatting from end to end. */
export type Span = { text: string; marks?: Mark[] }

/** The text of a block. Invariant after `normalize`: no empty runs, no two adjacent twins. */
export type RichText = Span[]

/** The order marks are stored in, so two equal sets are also equal arrays. */
const MARK_ORDER: MarkType[] = ['bold', 'italic', 'underline', 'strike', 'code', 'color', 'bg', 'link']
const rank = (t: MarkType) => {
  const i = MARK_ORDER.indexOf(t)
  return i === -1 ? MARK_ORDER.length : i
}

/** Marks in canonical order, one per type, the last one written winning. */
export function canonical(marks: readonly Mark[] | undefined): Mark[] | undefined {
  if (!marks || marks.length === 0) return undefined
  const byType = new Map<MarkType, Mark>()
  for (const m of marks) byType.set(m.type, m.value === undefined ? { type: m.type } : { type: m.type, value: m.value })
  return [...byType.values()].sort((a, b) => rank(a.type) - rank(b.type))
}

export const sameMark = (a: Mark, b: Mark) => a.type === b.type && (a.value ?? '') === (b.value ?? '')

/** Whether two runs carry the same formatting, so they can be merged. */
export function sameMarks(a: readonly Mark[] | undefined, b: readonly Mark[] | undefined): boolean {
  const x = a ?? []
  const y = b ?? []
  if (x.length !== y.length) return false
  return x.every((m, i) => sameMark(m, y[i]!))
}

export const hasMarkType = (marks: readonly Mark[] | undefined, type: MarkType) =>
  Boolean(marks?.some((m) => m.type === type))

export const markValue = (marks: readonly Mark[] | undefined, type: MarkType) =>
  marks?.find((m) => m.type === type)?.value

/** The plain text, which is what a search index, an export and a character count want. */
export const plain = (rt: RichText | undefined): string => (rt ?? []).reduce((s, sp) => s + sp.text, '')

/** The length in characters. Offsets everywhere else in the engine are offsets into this. */
export const len = (rt: RichText | undefined): number => (rt ?? []).reduce((n, sp) => n + sp.text.length, 0)

export const isEmpty = (rt: RichText | undefined): boolean => len(rt) === 0

/** Unformatted text, the way a paste of plain text or a default placeholder arrives. */
export const fromPlain = (text: string, marks?: readonly Mark[]): RichText =>
  text === '' ? [] : [span(text, marks)]

export function span(text: string, marks?: readonly Mark[]): Span {
  const c = canonical(marks)
  return c ? { text, marks: c } : { text }
}

/** Junta los runs que comparten formato. Sin esto, cada tecla dejaría un run y crecerían para siempre. */
export function normalize(rt: RichText): RichText {
  const out: Span[] = []
  for (const sp of rt) {
    if (sp.text === '') continue
    const last = out[out.length - 1]
    const marks = canonical(sp.marks)
    if (last && sameMarks(last.marks, marks)) out[out.length - 1] = span(last.text + sp.text, last.marks)
    else out.push(span(sp.text, marks))
  }
  return out
}

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n)

/** The `[from, to)` slice, in order, clamped to the text. */
export function slice(rt: RichText, from: number, to: number): RichText {
  const total = len(rt)
  const a = clamp(Math.min(from, to), 0, total)
  const b = clamp(Math.max(from, to), 0, total)
  if (a === b) return []
  const out: Span[] = []
  let at = 0
  for (const sp of rt) {
    const end = at + sp.text.length
    if (end > a && at < b) {
      const start = Math.max(a, at) - at
      const stop = Math.min(b, end) - at
      out.push(span(sp.text.slice(start, stop), sp.marks))
    }
    at = end
    if (at >= b) break
  }
  return normalize(out)
}

export const concat = (...parts: RichText[]): RichText => normalize(parts.flat())

/** The marks of the character at `index`, or undefined if there is no character there. */
function marksOfChar(rt: RichText, index: number): Mark[] | undefined {
  if (index < 0) return undefined
  let at = 0
  for (const sp of rt) {
    const end = at + sp.text.length
    if (index < end) return sp.marks ? [...sp.marks] : undefined
    at = end
  }
  return undefined
}

/**
 * El formato que hereda lo que se escribe: el del run de la izquierda, o el de la derecha al
 * principio. Un link solo se hereda estrictamente adentro, o escribir al lado lo extendería.
 */
export function marksAt(rt: RichText, offset: number): Mark[] | undefined {
  const total = len(rt)
  const at = clamp(offset, 0, total)
  const left = marksOfChar(rt, at - 1)
  const right = marksOfChar(rt, at)
  const base = at === 0 ? right : left
  if (!base) return undefined
  const link = base.find((m) => m.type === 'link')
  if (!link) return base.length ? base : undefined
  const inside = left?.some((m) => sameMark(m, link)) && right?.some((m) => sameMark(m, link))
  const kept = inside ? base : base.filter((m) => m.type !== 'link')
  return kept.length ? kept : undefined
}

/** Inserts text at `at`, inheriting the formatting of the run it lands in unless told otherwise. */
export function insert(rt: RichText, at: number, text: string, marks?: readonly Mark[]): RichText {
  if (text === '') return normalize(rt)
  const total = len(rt)
  const off = clamp(at, 0, total)
  const inherited = marks === undefined ? marksAt(rt, off) : marks
  return concat(slice(rt, 0, off), [span(text, inherited)], slice(rt, off, total))
}

/** Removes `[from, to)`. */
export function remove(rt: RichText, from: number, to: number): RichText {
  const total = len(rt)
  const a = clamp(Math.min(from, to), 0, total)
  const b = clamp(Math.max(from, to), 0, total)
  if (a === b) return normalize(rt)
  return concat(slice(rt, 0, a), slice(rt, b, total))
}

/** Replaces `[from, to)` with `text`. One step so history sees a single change. */
export const replace = (rt: RichText, from: number, to: number, text: string, marks?: readonly Mark[]): RichText => {
  const a = Math.min(from, to)
  const kept = remove(rt, from, to)
  return insert(kept, a, text, marks ?? marksAt(rt, a))
}

/** Rewrites the marks of every run touching `[from, to)`. */
function mapRange(rt: RichText, from: number, to: number, fn: (marks: Mark[] | undefined) => Mark[] | undefined): RichText {
  const total = len(rt)
  const a = clamp(Math.min(from, to), 0, total)
  const b = clamp(Math.max(from, to), 0, total)
  if (a === b) return normalize(rt)
  const out: Span[] = []
  let at = 0
  for (const sp of rt) {
    const end = at + sp.text.length
    if (end <= a || at >= b) {
      out.push(sp)
    } else {
      const head = sp.text.slice(0, Math.max(0, a - at))
      const mid = sp.text.slice(Math.max(0, a - at), Math.min(sp.text.length, b - at))
      const tail = sp.text.slice(Math.min(sp.text.length, b - at))
      if (head) out.push(span(head, sp.marks))
      if (mid) out.push(span(mid, fn(sp.marks ? [...sp.marks] : undefined)))
      if (tail) out.push(span(tail, sp.marks))
    }
    at = end
  }
  return normalize(out)
}

export const setMark = (rt: RichText, from: number, to: number, mark: Mark): RichText =>
  mapRange(rt, from, to, (marks) => canonical([...(marks ?? []).filter((m) => m.type !== mark.type), mark]))

export const clearMark = (rt: RichText, from: number, to: number, type: MarkType): RichText =>
  mapRange(rt, from, to, (marks) => canonical((marks ?? []).filter((m) => m.type !== type)))

export const clearMarks = (rt: RichText, from: number, to: number): RichText =>
  mapRange(rt, from, to, () => undefined)

/** Si todo el rango ya la tiene. Decide el botón apretado y que una selección a medias se complete. */
export function rangeHasMark(rt: RichText, from: number, to: number, type: MarkType, value?: string): boolean {
  const total = len(rt)
  const a = clamp(Math.min(from, to), 0, total)
  const b = clamp(Math.max(from, to), 0, total)
  if (a === b) {
    const m = marksAt(rt, a)?.find((x) => x.type === type)
    return Boolean(m) && (value === undefined || m?.value === value)
  }
  let at = 0
  let covered = 0
  for (const sp of rt) {
    const end = at + sp.text.length
    if (end > a && at < b) {
      const m = sp.marks?.find((x) => x.type === type)
      if (!m || (value !== undefined && m.value !== value)) return false
      covered += Math.min(b, end) - Math.max(a, at)
    }
    at = end
  }
  return covered === b - a
}

/** Adds the mark if the range does not already have it everywhere, removes it if it does. */
export const toggleMark = (rt: RichText, from: number, to: number, mark: Mark): RichText =>
  rangeHasMark(rt, from, to, mark.type, mark.value) ? clearMark(rt, from, to, mark.type) : setMark(rt, from, to, mark)

/** The set of marks shared by every character of the range: what the toolbar shows as active. */
export function activeMarks(rt: RichText, from: number, to: number): Mark[] {
  const a = Math.min(from, to)
  const b = Math.max(from, to)
  if (a === b) return marksAt(rt, a) ?? []
  const first = slice(rt, a, b)[0]
  if (!first) return []
  return (first.marks ?? []).filter((m) => rangeHasMark(rt, a, b, m.type, m.value))
}

/** Word boundaries around `offset`, for double click and for ctrl+backspace. */
export function wordAt(rt: RichText, offset: number): { from: number; to: number } {
  const text = plain(rt)
  const at = clamp(offset, 0, text.length)
  const isWord = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}_]/u.test(c)
  let from = at
  let to = at
  while (from > 0 && isWord(text[from - 1])) from--
  while (to < text.length && isWord(text[to])) to++
  if (from === to) return { from: at, to: at }
  return { from, to }
}
