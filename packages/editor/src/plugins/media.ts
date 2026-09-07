/**
 * The media plugin: what a guide attaches to an activity.
 *
 * Two decisions worth naming. The width of an image is stored as a percentage of the column and
 * not in pixels, so the same activity fits a phone in the yard and a projector in the classroom
 * without anyone resizing anything twice. And an embed is not a special block per service: it is
 * one block with a url, and a table of providers that recognise the url and say how to frame it.
 * Adding GeoGebra later is a row in that table, not a block type.
 *
 * Nothing here uploads anything. The block holds a url and the platform decides where files live,
 * which is what keeps this package free of a storage dependency.
 */

import type { BlockSpec } from '../core/schema.ts'
import type { InputRule, KeyBinding, Plugin } from '../core/plugins.ts'
import type { Command } from '../core/commands.ts'
import { insertBlock } from '../core/commands.ts'
import { getBlock } from '../core/doc.ts'
import { plain } from '../core/text.ts'

/** How wide a media block is, as a share of the text column. */
const WIDTH = { kind: 'number', default: 100, min: 15, max: 100, step: 1, label: 'Ancho (%)' } as const
const ALIGN = { kind: 'string', options: ['left', 'center', 'right'], default: 'center', label: 'Alineación' } as const
const CAPTION = { kind: 'text', label: 'Epígrafe' } as const
const SOURCE = { kind: 'string', default: '', label: 'Dirección' } as const

export const mediaBlocks: BlockSpec[] = [
  {
    type: 'image',
    name: 'Imagen',
    hint: 'Una foto, un diagrama, una captura',
    group: 'Medios',
    keywords: ['foto', 'imagen', 'dibujo', 'captura', 'png', 'jpg'],
    icon: 'image',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      src: SOURCE,
      alt: { kind: 'string', default: '', label: 'Texto alternativo', hint: 'Lo que se lee si la imagen no carga' },
      width: WIDTH,
      align: ALIGN,
      caption: CAPTION,
      /** La proporción real, que el bloque aprende al cargar: reserva el lugar y evita el salto. */
      ratio: { kind: 'number', min: 0.05, max: 20, label: 'Proporción' },
      rounded: { kind: 'boolean', default: true, label: 'Esquinas redondeadas' },
    },
  },
  {
    type: 'video',
    name: 'Video',
    hint: 'Un archivo o un link de YouTube o Vimeo',
    group: 'Medios',
    keywords: ['video', 'youtube', 'vimeo', 'pelicula', 'mp4'],
    icon: 'video',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      src: SOURCE,
      width: WIDTH,
      align: ALIGN,
      caption: CAPTION,
      /** Un video que arranca solo en un aula de treinta es un problema, así que por defecto no. */
      autoplay: { kind: 'boolean', default: false, label: 'Arranca solo' },
      loop: { kind: 'boolean', default: false, label: 'Se repite' },
      start: { kind: 'number', min: 0, label: 'Empieza en el segundo' },
    },
  },
  {
    type: 'audio',
    name: 'Audio',
    hint: 'Una consigna hablada, una canción, un dictado',
    group: 'Medios',
    keywords: ['audio', 'sonido', 'voz', 'grabacion', 'mp3', 'dictado'],
    icon: 'audio',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      src: SOURCE,
      title: { kind: 'string', default: '', label: 'Nombre' },
      caption: CAPTION,
      /** Para el reproductor propio: sin esto la barra no sabe cuánto falta hasta que carga. */
      duration: { kind: 'number', min: 0, label: 'Duración (s)' },
      transcript: { kind: 'text', label: 'Transcripción', hint: 'Lo que se dice, para quien no puede oírlo' },
    },
  },
  {
    type: 'file',
    name: 'Archivo',
    hint: 'Un adjunto para descargar: un STL, un PDF, un código',
    group: 'Medios',
    keywords: ['archivo', 'adjunto', 'descargar', 'pdf', 'stl', 'zip'],
    icon: 'file',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      src: SOURCE,
      name: { kind: 'string', default: '', label: 'Nombre' },
      size: { kind: 'number', min: 0, label: 'Tamaño (bytes)' },
      mime: { kind: 'string', default: '', label: 'Tipo' },
      caption: CAPTION,
    },
  },
  {
    type: 'bookmark',
    name: 'Link con tarjeta',
    hint: 'Una página de afuera, con su título y su miniatura',
    group: 'Medios',
    keywords: ['link', 'enlace', 'tarjeta', 'marcador', 'pagina', 'web'],
    icon: 'link',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      url: SOURCE,
      title: { kind: 'string', default: '', label: 'Título' },
      description: { kind: 'string', default: '', label: 'Resumen' },
      image: { kind: 'string', default: '', label: 'Miniatura' },
      favicon: { kind: 'string', default: '', label: 'Ícono del sitio' },
      site: { kind: 'string', default: '', label: 'Sitio' },
      /** Mientras esto es true la tarjeta muestra su esqueleto en lugar de un hueco. */
      loading: { kind: 'boolean', default: false, label: 'Buscando los datos' },
    },
  },
  {
    type: 'embed',
    name: 'Incrustado',
    hint: 'GeoGebra, Scratch, un mapa, un formulario',
    group: 'Medios',
    keywords: ['embed', 'iframe', 'geogebra', 'scratch', 'mapa', 'desmos', 'genially', 'incrustar'],
    icon: 'embed',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      src: SOURCE,
      provider: { kind: 'string', default: '', label: 'Servicio' },
      width: WIDTH,
      /** Alto en píxeles: un iframe no dice cuánto mide, así que alguien tiene que decidirlo. */
      height: { kind: 'number', default: 420, min: 120, max: 1200, label: 'Alto (px)' },
      caption: CAPTION,
      allowFullscreen: { kind: 'boolean', default: true, label: 'Pantalla completa' },
    },
  },
]

// ---------------------------------------------------------------------------- providers

export type Provider = {
  name: string
  /** Recognises the url and returns what to put in the iframe, or nothing. */
  match: (url: URL) => { src: string; height?: number; kind?: 'video' | 'embed' } | undefined
}

const id = (url: URL, ...keys: string[]) => {
  for (const k of keys) {
    const v = url.searchParams.get(k)
    if (v) return v
  }
  return url.pathname.split('/').filter(Boolean).pop() ?? ''
}

/**
 * The services worth recognising for a school activity. The list is data and a plugin can replace
 * it, which is the point: nobody has to touch this package to support the next one.
 */
export const PROVIDERS: Provider[] = [
  {
    name: 'YouTube',
    match: (url) => {
      if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(url.hostname)) return undefined
      const video = url.hostname.endsWith('youtu.be') ? url.pathname.slice(1) : id(url, 'v')
      if (!video) return undefined
      const t = url.searchParams.get('t') ?? url.searchParams.get('start')
      const start = t ? `?start=${parseInt(t, 10) || 0}` : ''
      return { src: `https://www.youtube-nocookie.com/embed/${video}${start}`, kind: 'video' }
    },
  },
  {
    name: 'Vimeo',
    match: (url) =>
      /(^|\.)vimeo\.com$/.test(url.hostname) && /^\/\d+/.test(url.pathname)
        ? { src: `https://player.vimeo.com/video/${url.pathname.split('/')[1]}`, kind: 'video' }
        : undefined,
  },
  {
    name: 'GeoGebra',
    match: (url) =>
      /(^|\.)geogebra\.org$/.test(url.hostname)
        ? { src: `https://www.geogebra.org/material/iframe/id/${id(url)}`, height: 480, kind: 'embed' }
        : undefined,
  },
  {
    name: 'Scratch',
    match: (url) =>
      /(^|\.)scratch\.mit\.edu$/.test(url.hostname) && url.pathname.includes('/projects/')
        ? { src: `https://scratch.mit.edu/projects/${id(url)}/embed`, height: 420, kind: 'embed' }
        : undefined,
  },
  {
    name: 'Desmos',
    match: (url) =>
      /(^|\.)desmos\.com$/.test(url.hostname) && url.pathname.includes('/calculator')
        ? { src: `https://www.desmos.com/calculator/${id(url)}?embed`, height: 480, kind: 'embed' }
        : undefined,
  },
  {
    name: 'Google Maps',
    match: (url) =>
      /(^|\.)google\.[a-z.]+$/.test(url.hostname) && url.pathname.startsWith('/maps')
        ? { src: url.href.includes('/embed') ? url.href : `${url.href}&output=embed`, height: 420, kind: 'embed' }
        : undefined,
  },
  {
    name: 'Genially',
    match: (url) =>
      /(^|\.)genial\.ly$/.test(url.hostname) || /(^|\.)genially\.com$/.test(url.hostname)
        ? { src: url.href, height: 520, kind: 'embed' }
        : undefined,
  },
]

const EXT = {
  image: /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i,
  video: /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i,
  audio: /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|#|$)/i,
}

/**
 * What a pasted url should become. The order is the guess: a file extension is certain, a known
 * service is close, and anything else is a card, which is the honest answer for a link.
 */
export function classify(raw: string): { type: string; props: Record<string, unknown> } | undefined {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined

  if (EXT.image.test(url.pathname)) return { type: 'image', props: { src: url.href } }
  if (EXT.video.test(url.pathname)) return { type: 'video', props: { src: url.href } }
  if (EXT.audio.test(url.pathname)) return { type: 'audio', props: { src: url.href, title: decodeURIComponent(url.pathname.split('/').pop() ?? '') } }

  for (const p of PROVIDERS) {
    const hit = p.match(url)
    if (!hit) continue
    if (hit.kind === 'video') return { type: 'video', props: { src: hit.src } }
    return { type: 'embed', props: { src: hit.src, provider: p.name, ...(hit.height ? { height: hit.height } : {}) } }
  }

  return { type: 'bookmark', props: { url: url.href, site: url.hostname.replace(/^www\./, ''), loading: true } }
}

// ---------------------------------------------------------------------------- commands

/** Turns a url into whatever it deserves to be, in place of the block the caret is in. */
const insertFromUrl: Command<{ url: string; at?: 'after' | 'before' | 'end'; target?: string }> = (ctx, args) => {
  const guess = classify(args.url)
  if (!guess) return false
  return insertBlock(ctx, { type: guess.type, props: guess.props, at: args.at, target: args.target })
}

/** Resizes a media block. Clamped by the prop spec, so a drag can never go out of range. */
const resizeBlock: Command<{ id: string; width: number }> = ({ tr }, { id, width }) => {
  const b = getBlock(tr.doc, id)
  if (!b) return false
  tr.setProps(id, { width })
  return true
}

/** Fills in what a card or an image learned after loading, without touching the undo stack. */
const describeMedia: Command<{ id: string; props: Record<string, unknown> }> = ({ tr }, { id, props }) => {
  if (!getBlock(tr.doc, id)) return false
  tr.setProps(id, props)
  tr.silent()
  return true
}

/** Pasting a bare url on an empty line turns into the right block instead of a naked link. */
/**
 * Typing a media address and then a space turns the line into the block it points at.
 *
 * The space is not decoration: without it the rule fires on the address half written, and
 * "https://www.youtube.com/w" is already a valid YouTube url as far as the parser is concerned, so
 * you would get a video of nothing before finishing the word "watch".
 */
const typedUrl: InputRule = {
  name: 'media-url',
  priority: 5,
  match: /^(https?:\/\/\S+)\s$/,
  run: ({ ctx, id, match }) => {
    const b = getBlock(ctx.tr.doc, id)
    const href = match[1]
    if (!b || !href || plain(b.text).trim() !== href) return false
    const guess = classify(href)
    // Una página cualquiera queda como link, no como tarjeta: eso lo decide quien escribe.
    if (!guess || guess.type === 'bookmark') return false
    ctx.tr.setText(id, [])
    return insertBlock(ctx, { type: guess.type, props: guess.props, target: id, at: 'after', focus: true })
  },
}

export const mediaKeys: KeyBinding[] = [
  { key: 'Mod-Alt-i', run: 'insertBlock', args: { type: 'image' }, label: 'Imagen' },
]

export const media = (): Plugin => ({
  name: 'media',
  blocks: mediaBlocks,
  keys: mediaKeys,
  rules: [typedUrl],
  commands: {
    insertFromUrl: insertFromUrl as Command<never>,
    resizeBlock: resizeBlock as Command<never>,
    describeMedia: describeMedia as Command<never>,
  },
})
