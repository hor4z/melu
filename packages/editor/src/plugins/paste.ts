/**
 * The paste plugin: how content from anywhere else becomes blocks.
 *
 * Pasting is the most common way a real activity gets written. A guide has the material in a
 * document, in a chat, in a page, and drags it in. So the order of the handlers is the order of
 * how much the source knew about structure: our own clipboard payload first, then HTML, then
 * markdown, then plain text, and a bare url gets treated as what it points at.
 *
 * Pasting inside a code block is the exception that has to come first: there, everything is text,
 * because pasting a program into a program is the whole point.
 */

import type { PasteHandler, Plugin } from '../core/plugins.ts'
import { appendBlocks, insertBlock, insertRichText, insertText, splitBlock, type Command } from '../core/commands.ts'
import { getBlock, type BlockId, type BlockInit, type Doc } from '../core/doc.ts'
import { isEmpty, plain, setMark } from '../core/text.ts'
import { fromHtml, fromJSON, fromMarkdown, toHtml, toMarkdown, type BlockJSON } from '../core/serialize.ts'
import { classify } from './media.ts'
import { isText } from '../core/selection.ts'
import { childrenOf } from '../core/doc.ts'

/** The mime type our own copies travel under, so a cut and paste inside the editor is lossless. */
export const MELU_MIME = 'application/x-melu-blocks'

/** Whether the caret is somewhere that wants raw text and not structure. */
function inRawText(ctx: Parameters<Command>[0]): boolean {
  const sel = ctx.state.selection
  if (!isText(sel)) return false
  const b = getBlock(ctx.tr.doc, sel.head.block)
  return ctx.state.schema.spec(b?.type ?? '')?.marks === false
}

/**
 * Puts blocks in at the caret. An empty paragraph is replaced rather than left behind, and the
 * first pasted block merges into the text that is already there so pasting mid sentence does not
 * cut the sentence in two.
 */
function insertBlocks(ctx: Parameters<Command>[0], blocks: readonly BlockInit[]): boolean {
  if (blocks.length === 0) return false
  const sel = ctx.state.selection
  const at = isText(sel) ? sel.head.block : undefined
  const block = at ? getBlock(ctx.tr.doc, at) : undefined

  // Un solo párrafo es una inserción de texto y no un bloque nuevo: pegar media oración en el
  // medio de otra tiene que dejar una sola oración. Va por `insertRichText` y no por `insertText`
  // porque lo que viene del portapapeles trae formato, y aplanarlo sería perder lo que se copió.
  const only = blocks.length === 1 ? blocks[0] : undefined
  if (only && only.type === 'paragraph' && !only.children?.length && block && ctx.state.schema.isTextual(block.type)) {
    const rich = only.text ?? []
    if (plain(rich) !== '') return insertRichText(ctx, { text: rich })
  }

  if (!block) return appendBlocks(ctx, { blocks: [...blocks], focus: true })

  // Si el bloque de destino tiene texto y el caret no está al final, se parte para no perder la cola.
  const total = plain(block.text).length
  const offset = isText(sel) ? sel.head.offset : total
  if (!isEmpty(block.text) && offset < total) splitBlock(ctx, undefined)

  let target = isText(ctx.state.selection) ? ctx.state.selection.head.block : at
  let did = false
  for (const b of blocks) {
    if (!insertBlock(ctx, { ...b, target, at: 'after', focus: true })) continue
    const now = ctx.state.selection
    target = now?.kind === 'text' ? now.head.block : now?.kind === 'blocks' ? now.anchor : target
    did = true
  }
  return did
}

const rawText: PasteHandler = {
  name: 'raw-text',
  priority: -100,
  types: ['text/plain'],
  run: ({ ctx, data }) => (inRawText(ctx) ? insertText(ctx, { text: data }) : false),
}

const ourOwn: PasteHandler = {
  name: 'melu',
  priority: 0,
  types: [MELU_MIME],
  run: ({ ctx, data }) => {
    try {
      const parsed = JSON.parse(data) as BlockJSON[]
      if (!Array.isArray(parsed)) return false
      // Sin ids: pegar dos veces no puede traer dos bloques con el mismo nombre.
      return insertBlocks(ctx, fromJSON(parsed).map(stripIds))
    } catch {
      return false
    }
  },
}

const stripIds = (b: BlockInit): BlockInit => {
  const { id: _drop, ...rest } = b
  return { ...rest, ...(b.children ? { children: b.children.map(stripIds) } : {}) }
}

const html: PasteHandler = {
  name: 'html',
  priority: 10,
  types: ['text/html'],
  run: ({ ctx, data }) => {
    // Lo que copia un navegador viene envuelto en comentarios y hojas de estilo enteras.
    if (/^\s*<meta/i.test(data) && !/<(p|div|h[1-6]|ul|ol|table|img)\b/i.test(data)) return false
    return insertBlocks(ctx, fromHtml(data))
  },
}

const markdown: PasteHandler = {
  name: 'markdown',
  priority: 20,
  types: ['text/markdown', 'text/plain'],
  run: ({ ctx, data, type }) => {
    if (type === 'text/plain' && !looksLikeMarkdown(data)) return false
    return insertBlocks(ctx, fromMarkdown(data))
  },
}

/** Only treat plain text as markdown when it actually shows markup: otherwise it is prose. */
export function looksLikeMarkdown(s: string): boolean {
  const lines = s.split('\n')
  if (lines.length === 1) return /(\*\*|`|\[[^\]]+\]\()/.test(s)
  return lines.some((l) => /^\s*(#{1,6} |[-*+] |\d{1,3}[.)] |> |```|\|.*\|)/.test(l))
}

const url: PasteHandler = {
  name: 'url',
  priority: 5,
  types: ['text/uri-list', 'text/plain'],
  run: ({ ctx, data }) => {
    const trimmed = data.trim()
    if (!/^https?:\/\/\S+$/.test(trimmed)) return false
    const sel = ctx.state.selection
    // Con texto seleccionado, una dirección pegada encima lo convierte en link. Eso es lo que se espera.
    if (isText(sel) && sel.anchor.offset !== sel.head.offset) {
      return ctx.state.schema.allowsMark(getBlock(ctx.tr.doc, sel.head.block)?.type ?? '', 'link')
        ? runSetLink(ctx, trimmed)
        : false
    }
    const guess = classify(trimmed)
    if (!guess) return false
    const block = isText(sel) ? getBlock(ctx.tr.doc, sel.head.block) : undefined
    // Sobre un párrafo con texto, una dirección se pega como texto con link y no como tarjeta.
    if (block && !isEmpty(block.text)) return runSetLink(ctx, trimmed, true)
    return insertBlock(ctx, { type: guess.type, props: guess.props })
  },
}

/** Puts a link over the selection, or over the address it just wrote. */
function runSetLink(ctx: Parameters<Command>[0], href: string, write = false): boolean {
  if (write && !insertText(ctx, { text: href })) return false
  const sel = ctx.state.selection
  if (!isText(sel)) return false
  const block = getBlock(ctx.tr.doc, sel.head.block)
  if (!block) return false
  const caretAt = sel.head.offset
  const from = write ? caretAt - href.length : Math.min(sel.anchor.offset, caretAt)
  const to = write ? caretAt : Math.max(sel.anchor.offset, caretAt)
  if (from >= to) return false
  ctx.tr.setText(sel.head.block, setMark(block.text ?? [], from, to, { type: 'link', value: href }))
  return true
}

// ---------------------------------------------------------------------------- copying

/**
 * What to put on the clipboard for a selection of whole blocks: our own format so a paste back in
 * is exact, plus html and markdown so a paste anywhere else is useful.
 */
export function clipboardFor(doc: Doc, ids: readonly BlockId[]): Record<string, string> {
  const present = ids.filter((id) => doc.blocks[id])
  const json: BlockJSON[] = present.map((id) => asJson(doc, id))
  // Un documento recortado a lo elegido, para que el markdown y el html salgan de la misma fuente
  // que ya sabe serializar listas, tablas y anidado.
  const trimmed: Doc = {
    root: doc.root,
    blocks: { ...doc.blocks, [doc.root]: { ...doc.blocks[doc.root]!, children: [...present] } },
  }
  return {
    [MELU_MIME]: JSON.stringify(json),
    'text/html': toHtml(trimmed),
    'text/plain': toMarkdown(trimmed),
  }
}

function asJson(doc: Doc, id: BlockId): BlockJSON {
  const b = doc.blocks[id]!
  const kids = childrenOf(doc, id)
  return {
    type: b.type,
    ...(b.text !== undefined ? { text: b.text } : {}),
    ...(b.props ? { props: b.props } : {}),
    ...(kids.length ? { children: kids.map((c) => asJson(doc, c)) } : {}),
  }
}

/**
 * Lo último que se prueba, y lo que más se usa: texto sin nada especial.
 *
 * Sin este handler pegar un párrafo de prosa no hacía nada, porque ninguno de los otros lo quería:
 * no es nuestro formato, no es HTML, no es una dirección y no parece markdown. Es el caso más
 * común de todos y el más fácil de olvidar, justamente porque no tiene nada interesante.
 *
 * Un renglón vacío separa párrafos, que es cómo se lee un texto pegado de cualquier lado. Un salto
 * solo queda adentro del mismo bloque, como un Shift+Enter. Y un pegado de una sola parte entra
 * literal, sin recortarle los espacios: pegar " bien" en el medio de una oración tiene que dejar
 * el espacio donde estaba.
 */
const plainText: PasteHandler = {
  name: 'plain',
  priority: 100,
  types: ['text/plain'],
  run: ({ ctx, data }) => {
    const text = data.replace(/\r\n?/g, '\n')
    if (text === '') return false
    const parts = text.split(/\n{2,}/)
    if (parts.length === 1) return insertText(ctx, { text })
    const kept = parts.filter((p) => p.trim() !== '')
    if (kept.length === 0) return false
    return insertBlocks(ctx, kept.map((p) => ({ type: 'paragraph', text: [{ text: p }] })))
  },
}

export const paste = (): Plugin => ({
  name: 'paste',
  paste: [rawText, ourOwn, url, html, markdown, plainText],
})
