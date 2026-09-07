// Cómo entra lo que viene de otro lado, que es como se escribe la mayor parte de una actividad.
// El orden de los handlers es cuánto sabía de estructura la fuente: nuestro formato, HTML,
// markdown, texto. Adentro de un bloque de código todo es texto, y eso va primero.

import type { PasteHandler, Plugin } from '../core/plugins.ts'
import { appendBlocks, insertBlock, insertRichText, insertText, setLink, splitBlock, type Command } from '../core/commands.ts'
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

/** Los mete en el caret: un párrafo vacío se reemplaza, y pegar en el medio no corta la oración. */
function insertBlocks(ctx: Parameters<Command>[0], blocks: readonly BlockInit[]): boolean {
  if (blocks.length === 0) return false
  const sel = ctx.state.selection
  const at = isText(sel) ? sel.head.block : undefined
  const block = at ? getBlock(ctx.tr.doc, at) : undefined

  // Un solo párrafo es texto y no un bloque nuevo. Por `insertRichText`: lo que viene del
  // portapapeles trae formato, y aplanarlo sería perder lo que se copió.
  const only = blocks.length === 1 ? blocks[0] : undefined
  if (only && only.type === 'paragraph' && !only.children?.length && block && ctx.state.schema.isTextual(block.type)) {
    const rich = only.text ?? []
    if (plain(rich) !== '') return insertRichText(ctx, { text: rich })
  }

  if (!block) return appendBlocks(ctx, { blocks: [...blocks], focus: true })

  // Si el bloque de destino tiene texto y el caret no está al final, se parte para no perder la
  // cola.
  const total = plain(block.text).length
  const offset = isText(sel) ? sel.head.offset : total
  if (!isEmpty(block.text) && offset < total) splitBlock(ctx, undefined)

  // El destino es la cabeza, y no lo que diga la selección: partir deja el caret en la cola, así
  // que lo pegado terminaba abajo de la cola en lugar de entre las dos mitades.
  let target = at
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

/** Lo que el menú de pegado necesita saber para poder deshacer el link y poner otra cosa. */
export type PastedUrl = {
  url: string
  block: BlockId
  from: number
  to: number
  /** En qué se podría convertir, según el reconocedor. Undefined si no se reconoció nada. */
  becomes?: { type: string; props: Record<string, unknown> }
}

/** La llave con la que viaja en el meta de la transacción. */
export const PASTED_URL = 'pastedUrl'

/**
 * Una dirección se pega como link y el menú de al lado ofrece el resto, en lugar de adivinar:
 * adivinar está mal en las dos direcciones. En el meta de la transacción queda anotado en qué
 * podría convertirse. Con algo seleccionado no hay menú, porque ya se dijo qué hacer.
 */
const url: PasteHandler = {
  name: 'url',
  priority: 5,
  types: ['text/uri-list', 'text/plain'],
  run: ({ ctx, data }) => {
    const href = data.trim()
    if (!/^https?:\/\/\S+$/.test(href)) return false
    const sel = ctx.state.selection
    if (!isText(sel)) return false
    const block = getBlock(ctx.tr.doc, sel.head.block)
    if (!block || !ctx.state.schema.allowsMark(block.type, 'link')) return false

    // Lo resuelve el comando del core, que sabe de rangos que cruzan bloques: la cuenta a mano
    // mezclaba el offset de un bloque con el del otro.
    if (sel.anchor.block !== sel.head.block || sel.anchor.offset !== sel.head.offset) {
      return setLink(ctx, { href })
    }

    const at = sel.head.offset
    if (!writeLinkedUrl(ctx, href)) return false
    const guess = classify(href)
    const pasted: PastedUrl = {
      url: href,
      block: sel.head.block,
      from: at,
      to: at + href.length,
      ...(guess && guess.type !== 'bookmark' ? { becomes: guess } : {}),
    }
    ctx.tr.setMeta(PASTED_URL, pasted)
    return true
  },
}

/** Solo para el caret colapsado: los offsets de acá son de un bloque. */
function writeLinkedUrl(ctx: Parameters<Command>[0], href: string): boolean {
  if (!insertText(ctx, { text: href })) return false
  const sel = ctx.state.selection
  if (!isText(sel)) return false
  const block = getBlock(ctx.tr.doc, sel.head.block)
  if (!block) return false
  const to = sel.head.offset
  const from = to - href.length
  if (from < 0) return false
  ctx.tr.setText(sel.head.block, setMark(block.text ?? [], from, to, { type: 'link', value: href }))
  return true
}

// ---------------------------------------------------------------------------- copying

/** Nuestro formato para que pegar de vuelta sea exacto, más html y markdown para pegar afuera. */
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
 * Lo último que se prueba y lo que más se usa: texto sin nada especial. Sin este handler, pegar
 * prosa no hacía nada, porque ninguno de los otros la quería. Un renglón vacío separa párrafos, y
 * una sola parte entra literal: pegar " bien" tiene que dejar el espacio donde estaba.
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
