/**
 * Getting content in and out: JSON, Markdown and HTML.
 *
 * JSON is the document as the platform stores it, a nested tree rather than the flat map the
 * engine runs on. The flat map is right for editing and the tree is right for a jsonb column and
 * for a person reading a diff, so the conversion lives here and nowhere else.
 *
 * Markdown is not a nicety. It is the format a model writes without being taught, so it is the
 * cheapest possible door for an agent to author an activity through, and it is also what makes
 * pasting from anywhere work. It is lossy on purpose: a colour has no markdown, and the
 * alternative was inventing a dialect nobody else can read.
 */

import type { Block, BlockId, BlockInit, Doc, Props } from './doc.ts'
import { childrenOf, emptyDoc, materialize, setBlocks } from './doc.ts'
import type { Mark, RichText, Span } from './text.ts'
import { normalize, plain } from './text.ts'

// ---------------------------------------------------------------------------- JSON

/** The shape a block takes in the database and on the wire. */
export type BlockJSON = {
  id?: BlockId
  type: string
  text?: RichText
  props?: Props
  children?: BlockJSON[]
}

export function toJSON(doc: Doc, from: BlockId = doc.root): BlockJSON[] {
  return childrenOf(doc, from).map((id) => {
    const b = doc.blocks[id]!
    const kids = toJSON(doc, id)
    return {
      id,
      type: b.type,
      ...(b.text !== undefined ? { text: b.text } : {}),
      ...(b.props && Object.keys(b.props).length ? { props: b.props } : {}),
      ...(kids.length ? { children: kids } : {}),
    }
  })
}

/**
 * Reads a tree back. Ids are kept when they are there, so a round trip through the database does
 * not renumber a document and break every anchor pointing into it.
 */
export const fromJSON = (blocks: readonly BlockJSON[]): BlockInit[] =>
  blocks.map((b) => ({
    ...(b.id ? { id: b.id } : {}),
    type: b.type,
    ...(b.text !== undefined ? { text: normalize(b.text) } : {}),
    ...(b.props ? { props: b.props } : {}),
    ...(b.children?.length ? { children: fromJSON(b.children) } : {}),
  }))

export function docFromJSON(blocks: readonly BlockJSON[]): Doc {
  let doc = emptyDoc()
  const ids: BlockId[] = []
  for (const init of fromJSON(blocks)) {
    const made = materialize(init, doc.root)
    doc = setBlocks(doc, made.blocks)
    ids.push(made.id)
  }
  return setBlocks(doc, [{ ...doc.blocks[doc.root]!, children: ids }])
}

// ---------------------------------------------------------------------------- plain text

/** Everything readable, one block per line. What a search index and a word count want. */
export function toPlainText(doc: Doc, from: BlockId = doc.root): string {
  const lines: string[] = []
  const walk = (id: BlockId) => {
    for (const child of childrenOf(doc, id)) {
      const b = doc.blocks[child]!
      const text = plain(b.text)
      if (text) lines.push(text)
      walk(child)
    }
  }
  walk(from)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------- Markdown out

const MD_WRAP: Partial<Record<Mark['type'], string>> = {
  bold: '**',
  italic: '*',
  code: '`',
  strike: '~~',
}

/** Escapes what would otherwise be read back as markup. */
const escapeMd = (s: string) => s.replace(/([\\`*_[\]])/g, '\\$1')

function spanToMd(sp: Span): string {
  const marks = sp.marks ?? []
  const code = marks.find((m) => m.type === 'code')
  // Dentro de código no se escapa nada: lo que se lee es lo que está.
  let out = code ? sp.text : escapeMd(sp.text)
  for (const type of ['code', 'strike', 'italic', 'bold'] as const) {
    if (!marks.some((m) => m.type === type)) continue
    const w = MD_WRAP[type]!
    out = `${w}${out}${w}`
  }
  if (marks.some((m) => m.type === 'underline')) out = `<u>${out}</u>`
  const link = marks.find((m) => m.type === 'link')
  if (link?.value) out = `[${out}](${link.value})`
  return out
}

export const textToMarkdown = (rt: RichText | undefined): string => (rt ?? []).map(spanToMd).join('')

const repeat = (s: string, n: number) => s.repeat(Math.max(0, n))

/** The markdown of a document. Nesting becomes indentation, which is what markdown has. */
export function toMarkdown(doc: Doc, from: BlockId = doc.root, depth = 0): string {
  const out: string[] = []
  const kids = childrenOf(doc, from)

  kids.forEach((id, i) => {
    const b = doc.blocks[id]!
    const pad = repeat('  ', depth)
    const text = textToMarkdown(b.text)
    const props = b.props ?? {}

    switch (b.type) {
      case 'heading_1':
        out.push(`${pad}# ${text}`)
        break
      case 'heading_2':
        out.push(`${pad}## ${text}`)
        break
      case 'heading_3':
        out.push(`${pad}### ${text}`)
        break
      case 'bulleted_list':
        out.push(`${pad}- ${text}`)
        break
      case 'numbered_list': {
        // El número sale de la corrida, no del bloque: el que sabe en cuánto arranca es el primero
        // de la tira, y los que siguen cuentan desde ahí. Igual que en pantalla.
        let first = i
        while (first > 0 && doc.blocks[kids[first - 1]!]?.type === 'numbered_list') first--
        const startProp = doc.blocks[kids[first]!]?.props?.start
        const base = typeof startProp === 'number' ? startProp : 1
        out.push(`${pad}${base + (i - first)}. ${text}`)
        break
      }
      case 'todo':
        out.push(`${pad}- [${props.checked ? 'x' : ' '}] ${text}`)
        break
      case 'quote':
        out.push(`${pad}> ${text}`)
        break
      case 'toggle':
        out.push(`${pad}- ${text}`)
        break
      case 'callout':
        out.push(`${pad}> ${props.emoji ?? '💡'} ${text}`)
        break
      case 'code':
        out.push(`${pad}\`\`\`${props.language ?? ''}`, ...plain(b.text).split('\n').map((l) => pad + l), `${pad}\`\`\``)
        break
      case 'divider':
        out.push(`${pad}---`)
        break
      case 'image':
        out.push(`${pad}![${props.alt ?? ''}](${props.src ?? ''})`)
        break
      case 'video':
      case 'audio':
      case 'embed':
        out.push(`${pad}[${b.type}](${props.src ?? ''})`)
        break
      case 'file':
        out.push(`${pad}[${props.name || 'archivo'}](${props.src ?? ''})`)
        break
      case 'bookmark':
        out.push(`${pad}[${props.title || props.url || ''}](${props.url ?? ''})`)
        break
      case 'math':
        out.push(`${pad}$$${props.latex ?? ''}$$`)
        break
      case 'table': {
        const rows = childrenOf(doc, id)
        rows.forEach((rowId, r) => {
          const cells = childrenOf(doc, rowId).map((c) => textToMarkdown(doc.blocks[c]?.text).replace(/\|/g, '\\|'))
          out.push(`${pad}| ${cells.join(' | ')} |`)
          if (r === 0 && props.header !== false) out.push(`${pad}|${cells.map(() => ' --- ').join('|')}|`)
        })
        return
      }
      case 'columns': {
        for (const col of childrenOf(doc, id)) {
          const inner = toMarkdown(doc, col, depth)
          if (inner) out.push(inner)
        }
        return
      }
      default: {
        // Un tipo que markdown no conoce se anuncia y no se pierde: el texto sigue estando.
        const label = b.type === 'paragraph' ? '' : `**[${b.type}]** `
        out.push(`${pad}${label}${text}`)
      }
    }

    const inner = toMarkdown(doc, id, depth + 1)
    if (inner) out.push(inner)
  })

  return out.join('\n')
}

// ---------------------------------------------------------------------------- Markdown in

const INLINE = [
  { re: /\[([^\]]+)\]\(([^)\s]+)\)/, mark: (m: RegExpMatchArray): Mark => ({ type: 'link', value: m[2] }), inner: 1 },
  { re: /\*\*([^*]+)\*\*/, mark: (): Mark => ({ type: 'bold' }), inner: 1 },
  { re: /__([^_]+)__/, mark: (): Mark => ({ type: 'bold' }), inner: 1 },
  { re: /(?<![*\w])\*([^*\n]+)\*/, mark: (): Mark => ({ type: 'italic' }), inner: 1 },
  { re: /(?<![_\w])_([^_\n]+)_/, mark: (): Mark => ({ type: 'italic' }), inner: 1 },
  { re: /~~([^~]+)~~/, mark: (): Mark => ({ type: 'strike' }), inner: 1 },
  { re: /`([^`]+)`/, mark: (): Mark => ({ type: 'code' }), inner: 1 },
  { re: /<u>([^<]+)<\/u>/, mark: (): Mark => ({ type: 'underline' }), inner: 1 },
] as const

/**
 * Un carácter escapado se guarda en la zona de uso privado antes de mirar el markup, y se
 * devuelve a su forma al final.
 *
 * Sin esto, `\*asterisco\*` se lee como una cursiva: la regla de la cursiva no tiene forma de
 * saber que la barra invertida de al lado la estaba cancelando, porque para una expresión regular
 * la barra es un carácter más. Enmascarar es la única manera de que el escape gane sin escribir un
 * tokenizador entero.
 */
const MASK = 0xe000
const ESCAPABLE = /\\([\\`*_[\]~=<>|$#{}()!-])/g
const mask = (s: string) => s.replace(ESCAPABLE, (_, c: string) => String.fromCharCode(MASK + c.charCodeAt(0)))
const unmask = (s: string) => s.replace(/[\uE000-\uE0ff]/g, (c) => String.fromCharCode(c.charCodeAt(0) - MASK))

/**
 * Parses the inline markup of one line. Recursive on the two sides of the match, so `**a `b`**`
 * comes back with both marks and not with backticks in the middle of bold text.
 */
export function textFromMarkdown(line: string, carry: readonly Mark[] = []): RichText {
  return parseInline(mask(line), carry)
}

function parseInline(line: string, carry: readonly Mark[] = []): RichText {
  for (const rule of INLINE) {
    const m = line.match(rule.re)
    if (!m || m.index === undefined) continue
    const before = line.slice(0, m.index)
    const after = line.slice(m.index + m[0].length)
    const inner = m[rule.inner] ?? ''
    const mark = rule.mark(m)
    // El código no lleva marcas adentro: su contenido es literal.
    const innerText: RichText =
      mark.type === 'code'
        ? [{ text: unmask(inner), marks: [...carry, mark] }]
        : parseInline(inner, [...carry, mark])
    return normalize([...parseInline(before, carry), ...innerText, ...parseInline(after, carry)])
  }
  if (line === '') return []
  return normalize([{ text: unmask(line), ...(carry.length ? { marks: [...carry] } : {}) }])
}

const indentOf = (line: string) => Math.floor((line.match(/^ */)?.[0].length ?? 0) / 2)

type Pending = { init: BlockInit; depth: number }

/**
 * Parses markdown into blocks. It handles what a model or a person actually writes: headings,
 * both kinds of list, checkboxes, quotes, fenced code, rules, images, tables and paragraphs, with
 * two spaces of indentation meaning one level of nesting.
 */
export function fromMarkdown(source: string): BlockInit[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const flat: Pending[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]!
    const line = raw.trimEnd()
    const depth = indentOf(raw)
    const body = line.trim()

    if (body === '') {
      i++
      continue
    }

    // Código: se toma tal cual hasta el cierre, sin mirar nada de lo que hay adentro.
    const fence = body.match(/^```([a-zA-Z0-9+#-]*)$/)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && lines[i]!.trim() !== '```') {
        code.push(lines[i]!.replace(new RegExp(`^ {0,${depth * 2}}`), ''))
        i++
      }
      i++
      flat.push({
        init: { type: 'code', text: code.length ? [{ text: code.join('\n') }] : [], props: fence[1] ? { language: fence[1] } : {} },
        depth,
      })
      continue
    }

    // Tabla: la fila de guiones se saltea y la primera fila queda de encabezado.
    if (/^\|.*\|$/.test(body) && lines[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1]!)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) {
        const cells = lines[i]!.trim().slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
        if (!/^[\s:|-]+$/.test(cells.join('|'))) rows.push(cells)
        i++
      }
      const width = Math.max(...rows.map((r) => r.length), 1)
      flat.push({
        init: {
          type: 'table',
          props: { header: true },
          children: rows.map((cells) => ({
            type: 'table_row',
            children: Array.from({ length: width }, (_, c) => ({ type: 'table_cell', text: textFromMarkdown(cells[c] ?? '') })),
          })),
        },
        depth,
      })
      continue
    }

    i++

    let m: RegExpMatchArray | null

    if ((m = body.match(/^(#{1,6})\s+(.*)$/))) {
      const level = Math.min(m[1]!.length, 3)
      flat.push({ init: { type: `heading_${level}`, text: textFromMarkdown(m[2]!) }, depth })
    } else if ((m = body.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      flat.push({ init: { type: 'image', props: { src: m[2]!, alt: m[1]! } }, depth })
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(body)) {
      flat.push({ init: { type: 'divider' }, depth })
    } else if ((m = body.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/))) {
      flat.push({ init: { type: 'todo', text: textFromMarkdown(m[2]!), props: { checked: m[1]!.toLowerCase() === 'x' } }, depth })
    } else if ((m = body.match(/^[-*+](?:\s+(.*))?$/))) {
      // Un guion solo es un ítem vacío, que es lo que queda al apretar Enter en una lista.
      flat.push({ init: { type: 'bulleted_list', text: textFromMarkdown(m[1] ?? '') }, depth })
    } else if ((m = body.match(/^(\d{1,3})[.)]\s+(.*)$/))) {
      // `start` solo lo lleva el primero de una tira, y solo si no arranca en uno. Guardarlo en
      // cada ítem sería guardar la numeración, y entonces reordenar la lista dejaría los números
      // donde estaban: el número se cuenta al dibujar, no se almacena.
      const start = Number(m[1])
      const previous = flat[flat.length - 1]
      const continues = previous?.depth === depth && previous.init.type === 'numbered_list'
      flat.push({
        init: {
          type: 'numbered_list',
          text: textFromMarkdown(m[2]!),
          ...(!continues && start > 1 ? { props: { start } } : {}),
        },
        depth,
      })
    } else if ((m = body.match(/^>\s*(.*)$/))) {
      // Una cita que arranca con un emoji es un destacado: es como Notion los exporta.
      const emoji = m[1]!.match(/^(\p{Extended_Pictographic}️?)\s+(.*)$/u)
      if (emoji) flat.push({ init: { type: 'callout', text: textFromMarkdown(emoji[2]!), props: { emoji: emoji[1]! } }, depth })
      else flat.push({ init: { type: 'quote', text: textFromMarkdown(m[1]!) }, depth })
    } else if ((m = body.match(/^\$\$(.+)\$\$$/))) {
      flat.push({ init: { type: 'math', props: { latex: m[1]! } }, depth })
    } else {
      flat.push({ init: { type: 'paragraph', text: textFromMarkdown(body) }, depth })
    }
  }

  return nest(flat)
}

/** Turns a list of blocks with a depth each into a tree. */
function nest(flat: readonly Pending[]): BlockInit[] {
  const roots: BlockInit[] = []
  const stack: BlockInit[] = []
  for (const { init, depth } of flat) {
    while (stack.length > depth) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) {
      parent.children = [...(parent.children ?? []), init]
    } else {
      roots.push(init)
    }
    stack.push(init)
  }
  return roots
}

// ---------------------------------------------------------------------------- HTML out

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function spanToHtml(sp: Span): string {
  let out = esc(sp.text)
  for (const m of sp.marks ?? []) {
    switch (m.type) {
      case 'bold':
        out = `<strong>${out}</strong>`
        break
      case 'italic':
        out = `<em>${out}</em>`
        break
      case 'underline':
        out = `<u>${out}</u>`
        break
      case 'strike':
        out = `<s>${out}</s>`
        break
      case 'code':
        out = `<code>${out}</code>`
        break
      case 'link':
        out = `<a href="${esc(m.value ?? '')}" rel="noopener noreferrer">${out}</a>`
        break
      case 'color':
        out = `<span data-color="${esc(m.value ?? '')}">${out}</span>`
        break
      case 'bg':
        out = `<mark data-bg="${esc(m.value ?? '')}">${out}</mark>`
        break
    }
  }
  return out
}

export const textToHtml = (rt: RichText | undefined): string => (rt ?? []).map(spanToHtml).join('')

const HTML_TAG: Record<string, string> = {
  paragraph: 'p',
  heading_1: 'h1',
  heading_2: 'h2',
  heading_3: 'h3',
  quote: 'blockquote',
  table_cell: 'td',
}

/** Exportable, printable HTML. Lists are rebuilt into real `ul` and `ol` from runs of siblings. */
export function toHtml(doc: Doc, from: BlockId = doc.root): string {
  const kids = childrenOf(doc, from)
  const out: string[] = []
  let i = 0

  while (i < kids.length) {
    const id = kids[i]!
    const b = doc.blocks[id]!

    if (b.type === 'bulleted_list' || b.type === 'numbered_list' || b.type === 'todo') {
      const tag = b.type === 'numbered_list' ? 'ol' : 'ul'
      const run: Block[] = []
      while (i < kids.length && doc.blocks[kids[i]!]!.type === b.type) {
        run.push(doc.blocks[kids[i]!]!)
        i++
      }
      out.push(
        `<${tag}>${run
          .map((item) => {
            const box = item.type === 'todo' ? `<input type="checkbox" disabled${item.props?.checked ? ' checked' : ''}> ` : ''
            return `<li>${box}${textToHtml(item.text)}${toHtml(doc, item.id)}</li>`
          })
          .join('')}</${tag}>`,
      )
      continue
    }

    i++
    const props = b.props ?? {}
    const inner = toHtml(doc, id)

    switch (b.type) {
      case 'divider':
        out.push('<hr>')
        break
      case 'code':
        out.push(`<pre><code data-language="${esc(String(props.language ?? ''))}">${esc(plain(b.text))}</code></pre>`)
        break
      case 'image':
        out.push(
          `<figure><img src="${esc(String(props.src ?? ''))}" alt="${esc(String(props.alt ?? ''))}" style="width:${Number(props.width ?? 100)}%">${
            props.caption ? `<figcaption>${textToHtml(props.caption as RichText)}</figcaption>` : ''
          }</figure>`,
        )
        break
      case 'video':
        out.push(`<video src="${esc(String(props.src ?? ''))}" controls></video>`)
        break
      case 'audio':
        out.push(`<audio src="${esc(String(props.src ?? ''))}" controls></audio>`)
        break
      case 'embed':
        out.push(`<iframe src="${esc(String(props.src ?? ''))}" height="${Number(props.height ?? 420)}" loading="lazy"></iframe>`)
        break
      case 'bookmark':
        out.push(`<a class="bookmark" href="${esc(String(props.url ?? ''))}">${esc(String(props.title || props.url || ''))}</a>`)
        break
      case 'callout':
        out.push(`<aside data-tone="${esc(String(props.tone ?? 'yellow'))}"><span>${esc(String(props.emoji ?? ''))}</span><div>${textToHtml(b.text)}${inner}</div></aside>`)
        break
      case 'toggle':
        out.push(`<details${props.open ? ' open' : ''}><summary>${textToHtml(b.text)}</summary>${inner}</details>`)
        break
      case 'table': {
        const rows = childrenOf(doc, id)
        const head = props.header !== false && rows[0]
        out.push(
          `<table>${
            head
              ? `<thead><tr>${childrenOf(doc, rows[0]!).map((c) => `<th>${textToHtml(doc.blocks[c]?.text)}</th>`).join('')}</tr></thead>`
              : ''
          }<tbody>${rows
            .slice(head ? 1 : 0)
            .map((r) => `<tr>${childrenOf(doc, r).map((c) => `<td>${textToHtml(doc.blocks[c]?.text)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`,
        )
        break
      }
      case 'columns':
        out.push(`<div class="columns">${childrenOf(doc, id).map((c) => `<div class="column">${toHtml(doc, c)}</div>`).join('')}</div>`)
        break
      case 'math':
        out.push(`<div class="math">${esc(String(props.latex ?? ''))}</div>`)
        break
      default: {
        const tag = HTML_TAG[b.type] ?? 'p'
        out.push(`<${tag} data-type="${esc(b.type)}">${textToHtml(b.text)}</${tag}>${inner}`)
      }
    }
  }

  return out.join('')
}

// ---------------------------------------------------------------------------- HTML in

const TAG_MARK: Record<string, Mark> = {
  STRONG: { type: 'bold' },
  B: { type: 'bold' },
  EM: { type: 'italic' },
  I: { type: 'italic' },
  U: { type: 'underline' },
  S: { type: 'strike' },
  STRIKE: { type: 'strike' },
  DEL: { type: 'strike' },
  CODE: { type: 'code' },
  MARK: { type: 'bg', value: 'yellow' },
}

const TAG_BLOCK: Record<string, string> = {
  H1: 'heading_1',
  H2: 'heading_2',
  H3: 'heading_3',
  H4: 'heading_3',
  H5: 'heading_3',
  H6: 'heading_3',
  P: 'paragraph',
  BLOCKQUOTE: 'quote',
  PRE: 'code',
  HR: 'divider',
  DIV: 'paragraph',
  SECTION: 'paragraph',
  FIGCAPTION: 'paragraph',
}

/** Reads the inline content of an element, carrying the marks its ancestors imply. */
function inlineFromDom(node: Node, carry: readonly Mark[] = []): RichText {
  if (node.nodeType === 3) {
    const text = node.nodeValue ?? ''
    return text === '' ? [] : [{ text, ...(carry.length ? { marks: [...carry] } : {}) }]
  }
  if (node.nodeType !== 1) return []
  const el = node as Element
  if (el.tagName === 'BR') return [{ text: '\n' }]
  const marks = [...carry]
  const own = TAG_MARK[el.tagName]
  if (own) marks.push(own)
  if (el.tagName === 'A') {
    const href = el.getAttribute('href')
    if (href) marks.push({ type: 'link', value: href })
  }
  // Los estilos en línea que sí significan algo: es como pegan Google Docs y Word.
  const weight = (el as HTMLElement).style?.fontWeight
  if (weight && (weight === 'bold' || Number(weight) >= 600) && !marks.some((m) => m.type === 'bold')) marks.push({ type: 'bold' })
  if ((el as HTMLElement).style?.fontStyle === 'italic' && !marks.some((m) => m.type === 'italic')) marks.push({ type: 'italic' })

  return normalize([...el.childNodes].flatMap((c) => inlineFromDom(c, marks)))
}

const BLOCK_TAGS = new Set([...Object.keys(TAG_BLOCK), 'UL', 'OL', 'LI', 'TABLE', 'TR', 'TD', 'TH', 'IMG', 'FIGURE', 'DETAILS'])

const hasBlockChild = (el: Element) => [...el.children].some((c) => BLOCK_TAGS.has(c.tagName))

/**
 * Turns pasted HTML into blocks. It is deliberately forgiving: anything it does not recognise
 * contributes its text as a paragraph, because losing what someone pasted is the worst outcome
 * and a wrong block type is one keystroke away from being fixed.
 */
export function fromHtml(html: string, doc?: { parse: (html: string) => Element }): BlockInit[] {
  const root = doc
    ? doc.parse(html)
    : typeof DOMParser !== 'undefined'
      ? new DOMParser().parseFromString(html, 'text/html').body
      : undefined
  if (!root) return []

  const out: BlockInit[] = []

  const readChildren = (el: Element): BlockInit[] => {
    const kids: BlockInit[] = []
    for (const child of el.children) kids.push(...read(child))
    return kids
  }

  const read = (el: Element): BlockInit[] => {
    switch (el.tagName) {
      case 'UL':
      case 'OL': {
        const type = el.tagName === 'OL' ? 'numbered_list' : 'bulleted_list'
        return [...el.children]
          .filter((li) => li.tagName === 'LI')
          .map((li) => {
            const box = li.querySelector('input[type=checkbox]')
            const nested = [...li.children].filter((c) => c.tagName === 'UL' || c.tagName === 'OL')
            const own = [...li.childNodes].filter((n) => !(n.nodeType === 1 && ((n as Element).tagName === 'UL' || (n as Element).tagName === 'OL')))
            return {
              type: box ? 'todo' : type,
              text: normalize(own.flatMap((n) => inlineFromDom(n))),
              ...(box ? { props: { checked: (box as HTMLInputElement).checked } } : {}),
              ...(nested.length ? { children: nested.flatMap((n) => read(n)) } : {}),
            }
          })
      }
      case 'TABLE': {
        const rows = [...el.querySelectorAll('tr')]
        const width = Math.max(...rows.map((r) => r.children.length), 1)
        return [
          {
            type: 'table',
            props: { header: rows[0] ? [...rows[0].children].some((c) => c.tagName === 'TH') : false },
            children: rows.map((r) => ({
              type: 'table_row',
              children: Array.from({ length: width }, (_, c) => ({
                type: 'table_cell',
                text: r.children[c] ? inlineFromDom(r.children[c]!) : [],
              })),
            })),
          },
        ]
      }
      case 'IMG': {
        const src = el.getAttribute('src')
        return src ? [{ type: 'image', props: { src, alt: el.getAttribute('alt') ?? '' } }] : []
      }
      case 'FIGURE': {
        const img = el.querySelector('img')
        const caption = el.querySelector('figcaption')
        if (!img?.getAttribute('src')) return readChildren(el)
        return [
          {
            type: 'image',
            props: {
              src: img.getAttribute('src')!,
              alt: img.getAttribute('alt') ?? '',
              ...(caption ? { caption: inlineFromDom(caption) } : {}),
            },
          },
        ]
      }
      case 'DETAILS': {
        const summary = el.querySelector('summary')
        return [
          {
            type: 'toggle',
            text: summary ? inlineFromDom(summary) : [],
            props: { open: el.hasAttribute('open') },
            children: [...el.children].filter((c) => c.tagName !== 'SUMMARY').flatMap((c) => read(c)),
          },
        ]
      }
      case 'HR':
        return [{ type: 'divider' }]
      case 'PRE':
        return [{ type: 'code', text: [{ text: el.textContent ?? '' }] }]
      case 'BR':
        return []
      default: {
        // Un contenedor que envuelve otros bloques no aporta un bloque propio: aporta los de
        // adentro. Y una etiqueta que no conocemos, si trae texto, es un párrafo: perder lo que
        // alguien pegó es el peor final posible, y un tipo equivocado se arregla con una tecla.
        if (hasBlockChild(el)) return readChildren(el)
        const text = inlineFromDom(el)
        if (plain(text).trim() === '') return []
        return [{ type: TAG_BLOCK[el.tagName] ?? 'paragraph', text }]
      }
    }
  }

  for (const child of root.childNodes) {
    if (child.nodeType === 1) out.push(...read(child as Element))
    else if (child.nodeType === 3 && (child.nodeValue ?? '').trim() !== '') {
      out.push({ type: 'paragraph', text: [{ text: child.nodeValue!.trim() }] })
    }
  }

  return out
}
