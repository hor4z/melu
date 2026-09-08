// Cómo se dibuja cada tipo. Un registro y no un switch: un plugin entrega un componente para sus
// tipos. Uno sin renderizador cae en texto con una etiqueta, que es la diferencia entre mostrar
// algo que no se entiende del todo y mostrar un stack trace.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Block, BlockId, Props } from '../core/doc.ts'
import { childrenOf } from '../core/doc.ts'
import type { RichText as RichTextValue } from '../core/text.ts'
import { plain } from '../core/text.ts'
import { safeUrl } from '../core/serialize.ts'
import { useEditor } from './hooks.ts'
import { BlockText } from './BlockText.tsx'
import { Icon, hasIcon, type IconName } from './icons.tsx'
import { SKIP } from './dom.ts'

export type BlockViewProps = {
  id: BlockId
  block: Block
  readOnly: boolean
  /** The children of the block, already rendered. Void blocks ignore it. */
  children?: ReactNode
}

export type Renderer = (props: BlockViewProps) => ReactNode

export type Renderers = Record<string, Renderer>

const num = (p: Props | undefined, key: string, fallback: number) => {
  const v = p?.[key]
  return typeof v === 'number' ? v : fallback
}
const str = (p: Props | undefined, key: string, fallback = '') => {
  const v = p?.[key]
  return typeof v === 'string' ? v : fallback
}
const bool = (p: Props | undefined, key: string, fallback = false) => {
  const v = p?.[key]
  return typeof v === 'boolean' ? v : fallback
}
const rich = (p: Props | undefined, key: string): RichTextValue | undefined => {
  const v = p?.[key]
  return Array.isArray(v) ? (v as RichTextValue) : undefined
}

/** Alineación, color y fondo salen de props y valen para casi todos los bloques con texto. */
function styleOf(props: Props | undefined): CSSProperties {
  const out: CSSProperties = {}
  const align = str(props, 'align')
  const color = str(props, 'color')
  const bg = str(props, 'bg')
  const size = str(props, 'size')
  if (align === 'center' || align === 'right') out.textAlign = align
  if (color && color !== 'default') out.color = `var(--melu-tone-${color})`
  if (bg && bg !== 'default') out.background = `var(--melu-wash-${bg})`
  if (size === 'sm') out.fontSize = 'var(--melu-size-sm)'
  if (size === 'lg') out.fontSize = 'var(--melu-size-lg)'
  return out
}

/** Cuánto ancho ocupa un bloque de medios y hacia qué lado se acomoda. */
function mediaStyle(props: Props | undefined): CSSProperties {
  const width = num(props, 'width', 100)
  const align = str(props, 'align', 'center')
  return {
    width: `${width}%`,
    marginInline: align === 'center' ? 'auto' : align === 'right' ? 'auto 0' : '0 auto',
  }
}

const Caption = ({ value }: { value: RichTextValue | undefined }) =>
  value && plain(value) !== '' ? <figcaption className="melu-caption">{plain(value)}</figcaption> : null

// ---------------------------------------------------------------------------- text

const textual = (as: 'div' | 'h1' | 'h2' | 'h3' | 'p', className: string): Renderer =>
  function Textual({ id, block, readOnly, children }) {
    const editor = useEditor()
    const spec = editor.state.schema.specOr(block.type)
    return (
      <>
        <BlockText
          id={id}
          as={as}
          value={block.text}
          className={className}
          style={styleOf(block.props)}
          placeholder={spec.placeholder}
          readOnly={readOnly}
        />
        {children}
      </>
    )
  }

const Paragraph = textual('div', 'melu-paragraph')
const Heading1 = textual('h1', 'melu-h1')
const Heading2 = textual('h2', 'melu-h2')
const Heading3 = textual('h3', 'melu-h3')

const Bulleted: Renderer = function Bulleted({ id, block, readOnly, children }) {
  return (
    <div className="melu-item">
      <span className="melu-bullet" aria-hidden="true" {...SKIP}>
        •
      </span>
      <div className="melu-item-body">
        <BlockText id={id} value={block.text} className="melu-paragraph" style={styleOf(block.props)} readOnly={readOnly} />
        {children}
      </div>
    </div>
  )
}

/**
 * El número no se guarda ni se calcula acá: lo cuenta el CSS. Contarlo en JS quedaba viejo, porque
 * un ítem se redibuja cuando cambia su propio bloque y el número depende de sus hermanos.
 */
const Numbered: Renderer = function Numbered({ id, block, readOnly, children }) {
  return (
    <div className="melu-item">
      <span className="melu-ordinal" aria-hidden="true" {...SKIP} />
      <div className="melu-item-body">
        <BlockText id={id} value={block.text} className="melu-paragraph" style={styleOf(block.props)} readOnly={readOnly} />
        {children}
      </div>
    </div>
  )
}

const Todo: Renderer = function Todo({ id, block, readOnly, children }) {
  const editor = useEditor()
  const checked = bool(block.props, 'checked')
  return (
    <div className="melu-item">
      <input
        type="checkbox"
        className="melu-checkbox"
        checked={checked}
        disabled={readOnly}
        {...SKIP}
        aria-label={plain(block.text) || 'Por hacer'}
        onChange={() => editor.run('toggleChecked', { id })}
      />
      <div className="melu-item-body">
        <BlockText
          id={id}
          value={block.text}
          className={`melu-paragraph${checked ? ' melu-done' : ''}`}
          style={styleOf(block.props)}
          readOnly={readOnly}
        />
        {children}
      </div>
    </div>
  )
}

const Toggle: Renderer = function Toggle({ id, block, readOnly, children }) {
  const editor = useEditor()
  const open = bool(block.props, 'open')
  const hasChildren = block.children.length > 0
  return (
    <div className="melu-toggle" data-open={open}>
      <div className="melu-item">
        <button
          type="button"
          className="melu-twisty"
          {...SKIP}
          aria-expanded={open}
          aria-label={open ? 'Cerrar' : 'Abrir'}
          onClick={() => editor.run('toggleOpen', { id })}
        >
          <Icon name="chevron" size={14} />
        </button>
        <div className="melu-item-body">
          <BlockText id={id} value={block.text} className="melu-paragraph" style={styleOf(block.props)} readOnly={readOnly} />
        </div>
      </div>
      {open && hasChildren ? <div className="melu-toggle-body">{children}</div> : null}
      {open && !hasChildren ? <div className="melu-toggle-empty">Está vacío. Arrastrá algo acá adentro.</div> : null}
    </div>
  )
}

const Quote: Renderer = function Quote({ id, block, readOnly, children }) {
  return (
    <blockquote className="melu-quote">
      <BlockText id={id} value={block.text} className="melu-paragraph" style={styleOf(block.props)} readOnly={readOnly} />
      {children}
    </blockquote>
  )
}

const Callout: Renderer = function Callout({ id, block, readOnly, children }) {
  const tone = str(block.props, 'tone', 'yellow')
  return (
    <aside className="melu-callout" data-tone={tone} role="note">
      <span className="melu-callout-emoji" {...SKIP} aria-hidden="true">
        {str(block.props, 'emoji', '💡')}
      </span>
      <div className="melu-callout-body">
        <BlockText id={id} value={block.text} className="melu-paragraph" readOnly={readOnly} />
        {children}
      </div>
    </aside>
  )
}

const Code: Renderer = function Code({ id, block, readOnly }) {
  const language = str(block.props, 'language', 'python')
  const wrap = bool(block.props, 'wrap', true)
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(plain(block.text)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }, [block.text])
  return (
    <figure className="melu-code-block">
      <div className="melu-code-bar" {...SKIP}>
        <span className="melu-code-lang">{language}</span>
        <button type="button" className="melu-ghost" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <BlockText id={id} as="pre" value={block.text} className={`melu-code${wrap ? ' melu-wrap' : ''}`} readOnly={readOnly} />
      <Caption value={rich(block.props, 'caption')} />
    </figure>
  )
}

const Divider: Renderer = function Divider() {
  return <hr className="melu-divider" />
}

// ---------------------------------------------------------------------------- media

/**
 * El hueco que pide una dirección. Confirma al pegar, al salir del campo y con Enter, y no solo
 * con Enter: quien pega una dirección espera que aparezca el video.
 */
function Placeholder({ id, icon, label }: { id: BlockId; icon: IconName; label: string }) {
  const editor = useEditor()
  const [value, setValue] = useState('')

  const confirmar = useCallback(
    (url: string) => {
      if (url.trim() === '') return
      editor.run('setMediaSource', { id, url })
    },
    [editor, id],
  )

  return (
    <div className="melu-media-empty" {...SKIP}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
      <input
        className="melu-media-input"
        value={value}
        placeholder="Pegá la dirección"
        aria-label={`Dirección del bloque de ${label.toLowerCase()}`}
        onChange={(e) => setValue(e.target.value)}
        onPaste={(e) => {
          const pegado = e.clipboardData.getData('text/plain')
          if (pegado.trim() === '') return
          e.preventDefault()
          setValue(pegado)
          confirmar(pegado)
        }}
        onBlur={() => confirmar(value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setValue('')
            return
          }
          if (e.key !== 'Enter') return
          e.preventDefault()
          confirmar(value)
        }}
      />
    </div>
  )
}

const Image: Renderer = function Image({ id, block, readOnly }) {
  const editor = useEditor()
  const src = str(block.props, 'src')
  const ratio = num(block.props, 'ratio', 0)
  const onLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      if (!img.naturalWidth || !img.naturalHeight) return
      const seen = Number((img.naturalWidth / img.naturalHeight).toFixed(3))
      if (Math.abs(seen - ratio) < 0.01) return
      // Se anota la proporción real para reservar el lugar la próxima vez y no saltar al cargar.
      editor.run('describeMedia', { id, props: { ratio: seen } })
    },
    [editor, id, ratio],
  )
  if (!src) return <Placeholder id={id} icon="image" label="Imagen" />
  return (
    <figure className="melu-figure" style={mediaStyle(block.props)}>
      <img
        src={src}
        alt={str(block.props, 'alt')}
        className={bool(block.props, 'rounded', true) ? 'melu-rounded' : undefined}
        style={ratio ? { aspectRatio: String(ratio) } : undefined}
        loading="lazy"
        draggable={false}
        onLoad={onLoad}
      />
      <Caption value={rich(block.props, 'caption')} />
      {!readOnly ? <ResizeHandles id={id} /> : null}
    </figure>
  )
}

const Video: Renderer = function Video({ id, block, readOnly }) {
  const src = str(block.props, 'src')
  if (!src) return <Placeholder id={id} icon="video" label="Video" />
  const framed = /youtube|vimeo|player\./.test(src)
  return (
    <figure className="melu-figure" style={mediaStyle(block.props)}>
      {framed ? (
        <iframe
          src={src}
          className="melu-frame"
          title={plain(rich(block.props, 'caption')) || 'Video'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <video
          src={src}
          controls
          className="melu-rounded"
          autoPlay={bool(block.props, 'autoplay')}
          loop={bool(block.props, 'loop')}
          playsInline
        />
      )}
      <Caption value={rich(block.props, 'caption')} />
      {!readOnly ? <ResizeHandles id={id} /> : null}
    </figure>
  )
}

const Audio: Renderer = function Audio({ id, block }) {
  const src = str(block.props, 'src')
  if (!src) return <Placeholder id={id} icon="audio" label="Audio" />
  const transcript = rich(block.props, 'transcript')
  return (
    <figure className="melu-audio">
      <div className="melu-audio-head">
        <Icon name="audio" size={18} />
        <span className="melu-audio-title">{str(block.props, 'title') || 'Audio'}</span>
      </div>
      <audio src={src} controls preload="metadata" />
      {transcript && plain(transcript) !== '' ? (
        <details className="melu-transcript">
          <summary>Transcripción</summary>
          <p>{plain(transcript)}</p>
        </details>
      ) : null}
      <Caption value={rich(block.props, 'caption')} />
    </figure>
  )
}

const FileBlock: Renderer = function FileBlock({ id, block }) {
  const src = str(block.props, 'src')
  if (!src) return <Placeholder id={id} icon="file" label="Archivo" />
  const size = num(block.props, 'size', 0)
  return (
    // Sin href si la dirección no es de fiar: el documento puede venir de una API, y una tarjeta que
    // se ve igual pero no lleva a ningún lado es mejor que un click que corre código.
    <a className="melu-file" href={safeUrl(src)} download target="_blank" rel="noopener noreferrer">
      <Icon name="file" size={20} />
      <span className="melu-file-name">{str(block.props, 'name') || src.split('/').pop()}</span>
      {size ? <span className="melu-file-size">{humanSize(size)}</span> : null}
    </a>
  )
}

const humanSize = (bytes: number) => {
  const units = ['B', 'kB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}

const Bookmark: Renderer = function Bookmark({ id, block }) {
  const url = str(block.props, 'url')
  if (!url) return <Placeholder id={id} icon="link" label="Link con tarjeta" />
  const loading = bool(block.props, 'loading')
  const image = str(block.props, 'image')
  return (
    <a className="melu-bookmark" href={safeUrl(url)} target="_blank" rel="noopener noreferrer" data-loading={loading}>
      <div className="melu-bookmark-text">
        <span className="melu-bookmark-title">{str(block.props, 'title') || url}</span>
        {str(block.props, 'description') ? (
          <span className="melu-bookmark-desc">{str(block.props, 'description')}</span>
        ) : null}
        <span className="melu-bookmark-site">
          {str(block.props, 'favicon') ? <img src={str(block.props, 'favicon')} alt="" width={14} height={14} /> : null}
          {str(block.props, 'site') || new URL(url, 'https://x').hostname}
        </span>
      </div>
      {image ? <img className="melu-bookmark-thumb" src={image} alt="" loading="lazy" /> : null}
    </a>
  )
}

const Embed: Renderer = function Embed({ id, block, readOnly }) {
  const src = str(block.props, 'src')
  if (!src) return <Placeholder id={id} icon="embed" label="Incrustado" />
  return (
    <figure className="melu-figure" style={mediaStyle(block.props)}>
      <iframe
        src={src}
        className="melu-frame"
        style={{ height: num(block.props, 'height', 420) }}
        title={str(block.props, 'provider') || 'Contenido incrustado'}
        allowFullScreen={bool(block.props, 'allowFullscreen', true)}
        loading="lazy"
      />
      <Caption value={rich(block.props, 'caption')} />
      {!readOnly ? <ResizeHandles id={id} /> : null}
    </figure>
  )
}

/** Las manijas de los costados. El ancho es un porcentaje que el spec recorta, así que no se va de rango. */
function ResizeHandles({ id }: { id: BlockId }) {
  const editor = useEditor()
  const ref = useRef<HTMLDivElement>(null)

  const start = useCallback(
    (side: 'left' | 'right') => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const figure = ref.current?.closest<HTMLElement>('.melu-figure')
      const column = figure?.parentElement
      if (!figure || !column) return
      const columnWidth = column.getBoundingClientRect().width
      const startX = e.clientX
      const startWidth = figure.getBoundingClientRect().width
      const move = (ev: PointerEvent) => {
        const delta = (ev.clientX - startX) * (side === 'right' ? 1 : -1)
        const pct = Math.round(((startWidth + delta * 2) / columnWidth) * 100)
        editor.run('resizeBlock', { id, width: pct })
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [editor, id],
  )

  return (
    <div ref={ref} className="melu-resize" {...SKIP}>
      <button type="button" className="melu-grip-left" aria-label="Angostar" onPointerDown={start('left')} />
      <button type="button" className="melu-grip-right" aria-label="Ensanchar" onPointerDown={start('right')} />
    </div>
  )
}

// ---------------------------------------------------------------------------- layout

const Table: Renderer = function Table({ id, block, readOnly, children }) {
  const editor = useEditor()
  const header = bool(block.props, 'header', true)
  // Las columnas se cuentan de la primera fila. El normalizador mantiene la tabla rectangular,
  // así que la primera fila es la medida de todas.
  const cols = Math.max(1, childrenOf(editor.doc, childrenOf(editor.doc, id)[0] ?? '').length)
  return (
    <div className="melu-table-wrap">
      <div className="melu-table" data-header={header} role="table" style={{ ['--melu-cols' as string]: cols }}>
        {children}
      </div>
      <Caption value={rich(block.props, 'caption')} />
      {!readOnly ? <TableControls id={id} /> : null}
    </div>
  )
}

const TableRow: Renderer = function TableRow({ children }) {
  return (
    <div className="melu-row" role="row">
      {children}
    </div>
  )
}

const TableCell: Renderer = function TableCell({ id, block, readOnly }) {
  return (
    <div className="melu-cell" role="cell" style={styleOf(block.props)}>
      <BlockText id={id} value={block.text} readOnly={readOnly} />
    </div>
  )
}

function TableControls({ id }: { id: BlockId }) {
  const editor = useEditor()
  const first = childrenOf(editor.doc, childrenOf(editor.doc, id)[0] ?? '')[0]
  return (
    <div className="melu-table-controls" {...SKIP}>
      <button type="button" className="melu-ghost" onClick={() => editor.run('addRow', { id: first ?? id })}>
        <Icon name="plus" size={14} /> Fila
      </button>
      <button type="button" className="melu-ghost" onClick={() => editor.run('addColumn', { id: first ?? id })}>
        <Icon name="plus" size={14} /> Columna
      </button>
    </div>
  )
}

const Columns: Renderer = function Columns({ block, children }) {
  return (
    <div
      className="melu-columns"
      style={{ gap: num(block.props, 'gap', 24), ['--melu-stack' as string]: `${num(block.props, 'stackBelow', 640)}px` }}
    >
      {children}
    </div>
  )
}

const Column: Renderer = function Column({ block, children }) {
  return (
    <div className="melu-column" style={{ flexGrow: num(block.props, 'grow', 1) }}>
      {children}
    </div>
  )
}

const TableOfContents: Renderer = function TableOfContents({ block }) {
  const editor = useEditor()
  const depth = num(block.props, 'depth', 3)
  const headings = childrenOf(editor.doc, editor.doc.root)
    .map((child) => editor.block(child))
    .filter((b): b is Block => Boolean(b) && /^heading_[123]$/.test(b!.type))
    .filter((b) => Number(b.type.slice(-1)) <= depth)
  if (headings.length === 0) {
    return <div className="melu-toc melu-toc-empty">El índice se arma solo con los títulos de la página.</div>
  }
  return (
    <nav className="melu-toc" aria-label="Índice">
      {headings.map((h) => (
        <button
          key={h.id}
          type="button"
          className="melu-toc-item"
          data-level={h.type.slice(-1)}
          onClick={() => editor.run('focusBlock', { id: h.id, at: 'start' })}
        >
          {plain(h.text) || 'Sin título'}
        </button>
      ))}
    </nav>
  )
}

const Timer: Renderer = function Timer({ block }) {
  const total = num(block.props, 'seconds', 300)
  const [left, setLeft] = useState(total)
  const [running, setRunning] = useState(bool(block.props, 'autostart'))
  useEffect(() => setLeft(total), [total])
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000)
    return () => clearInterval(t)
  }, [running])
  useEffect(() => {
    if (left === 0) setRunning(false)
  }, [left])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="melu-timer" data-running={running} data-done={left === 0}>
      <button type="button" className="melu-timer-face" onClick={() => setRunning((r) => !r)}>
        <Icon name="timer" size={18} />
        <span className="melu-timer-time">
          {mm}:{ss}
        </span>
      </button>
      {str(block.props, 'label') ? <span className="melu-timer-label">{str(block.props, 'label')}</span> : null}
      <button type="button" className="melu-ghost" onClick={() => { setLeft(total); setRunning(false) }}>
        Reiniciar
      </button>
      <div className="melu-timer-bar" style={{ ['--melu-progress' as string]: `${total ? (left / total) * 100 : 0}%` }} />
    </div>
  )
}

/**
 * Una fórmula. Acá no hay motor de LaTeX: sería una dependencia grande. La plataforma inyecta uno
 * por `view.math`, y hasta entonces se muestra la fuente, que es honesto y sigue siendo editable.
 */
const MathBlock: Renderer = function MathBlock({ id, block }) {
  const editor = useEditor()
  const latex = str(block.props, 'latex')
  const render = editor.view['math'] as ((latex: string) => string) | undefined
  const [editing, setEditing] = useState(latex === '')
  const html = render && latex ? render(latex) : null
  return (
    <div className="melu-math" data-align={str(block.props, 'align', 'center')}>
      {editing ? (
        <input
          className="melu-math-input"
          defaultValue={latex}
          placeholder="a^2 + b^2 = c^2"
          autoFocus
          onBlur={(e) => {
            editor.run('setBlockProps', { id, props: { latex: e.target.value } })
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <button type="button" className="melu-math-view" onClick={() => setEditing(true)}>
          {html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <code>{latex || 'Escribí la fórmula'}</code>}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------- activity

/**
 * Las preguntas, del lado de quien las escribe. Lo que ve un aprendiz no es esto: la plataforma
 * dibuja ese lado con sus componentes, y la corrección vive en Go.
 */
function Ask({ id, block, readOnly, children, icon, label, extra }: BlockViewProps & { icon: IconName; label: string; extra?: ReactNode }) {
  const editor = useEditor()
  const spec = editor.state.schema.specOr(block.type)
  const points = num(block.props, 'points', 0)
  return (
    <section className="melu-ask" data-type={block.type}>
      <header className="melu-ask-head" {...SKIP}>
        <Icon name={icon} size={15} />
        <span className="melu-ask-label">{label}</span>
        {points ? <span className="melu-ask-points">{points} pt</span> : null}
      </header>
      <BlockText id={id} value={block.text} className="melu-ask-prompt" placeholder={spec.placeholder} readOnly={readOnly} />
      {extra}
      {children}
    </section>
  )
}

/** Las opciones de una pregunta: cada una es texto suelto, y una o varias son la correcta. */
function OptionList({ id, block, multi }: { id: BlockId; block: Block; multi: boolean }) {
  const editor = useEditor()
  const options = Array.isArray(block.props?.options) ? (block.props.options as RichTextValue[]) : []
  const correct = num(block.props, 'correct', 0)
  const correctMulti = Array.isArray(block.props?.correctMulti) ? (block.props.correctMulti as number[]) : []
  const set = (i: number, text: string) => {
    const next = options.map((o, k) => (k === i ? (text ? [{ text }] : []) : o))
    editor.run('setBlockProps', { id, props: { options: next } })
  }
  const pick = (i: number) => {
    if (!multi) return editor.run('setBlockProps', { id, props: { correct: i } })
    const next = correctMulti.includes(i) ? correctMulti.filter((x) => x !== i) : [...correctMulti, i].sort((a, b) => a - b)
    return editor.run('setBlockProps', { id, props: { correctMulti: next } })
  }
  const isRight = (i: number) => (multi ? correctMulti.includes(i) : correct === i)
  return (
    <div className="melu-options" {...SKIP}>
      {options.map((option, i) => (
        <div key={i} className="melu-option" data-right={isRight(i)}>
          <button
            type="button"
            className="melu-option-mark"
            aria-label={isRight(i) ? 'Es la correcta' : 'Marcar como correcta'}
            aria-pressed={isRight(i)}
            onClick={() => pick(i)}
          >
            {multi ? <Icon name="check" size={13} /> : <span className="melu-radio" />}
          </button>
          <input
            className="melu-option-text"
            value={plain(option)}
            placeholder={`Opción ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
          />
          <button
            type="button"
            className="melu-ghost melu-option-drop"
            aria-label="Quitar la opción"
            onClick={() => editor.run('removeOption', { id, index: i })}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
      <button type="button" className="melu-ghost" onClick={() => editor.run('addOption', { id })}>
        <Icon name="plus" size={14} /> Otra opción
      </button>
    </div>
  )
}

/**
 * Mientras se escribe manda lo tecleado y no el número guardado. Atado directo a las props no se
 * podía escribir un decimal: al teclear "0." se guardaba 0 y React reescribía el campo en "0".
 */
function NumField({ id, block, name, label, step }: { id: BlockId; block: Block; name: string; label: string; step?: number }) {
  const editor = useEditor()
  const guardado = num(block.props, name, 0)
  const [tecleado, setTecleado] = useState<string | null>(null)

  return (
    <label className="melu-field">
      <span>{label}</span>
      <input
        type="number"
        step={step ?? 'any'}
        value={tecleado ?? String(guardado)}
        onChange={(e) => {
          setTecleado(e.target.value)
          const n = Number(e.target.value)
          // Un valor a medio escribir ("0." o "-") no se guarda, pero tampoco se pierde: queda en
          // el campo hasta que sea un número.
          if (e.target.value !== '' && Number.isFinite(n)) {
            editor.run('setBlockProps', { id, props: { [name]: n } })
          }
        }}
        onBlur={() => setTecleado(null)}
      />
    </label>
  )
}

function TextField({ id, block, name, label, placeholder }: { id: BlockId; block: Block; name: string; label: string; placeholder?: string }) {
  const editor = useEditor()
  return (
    <label className="melu-field">
      <span>{label}</span>
      <input
        value={str(block.props, name)}
        placeholder={placeholder}
        onChange={(e) => editor.run('setBlockProps', { id, props: { [name]: e.target.value } })}
      />
    </label>
  )
}

function PickField({ id, block, name, label, options }: { id: BlockId; block: Block; name: string; label: string; options: { value: string; label: string }[] }) {
  const editor = useEditor()
  const current = str(block.props, name, options[0]?.value ?? '')
  return (
    <div className="melu-field">
      <span>{label}</span>
      <div className="melu-pills">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="melu-pill"
            aria-pressed={current === o.value}
            onClick={() => editor.run('setBlockProps', { id, props: { [name]: o.value } })}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const asks: Renderers = {
  choice: (p) => <Ask {...p} icon="choice" label="Opciones" extra={<OptionList id={p.id} block={p.block} multi={false} />} />,
  multi: (p) => <Ask {...p} icon="multi" label="Varias correctas" extra={<OptionList id={p.id} block={p.block} multi />} />,
  number: (p) => (
    <Ask
      {...p}
      icon="number"
      label="Número"
      extra={
        <div className="melu-fields" {...SKIP}>
          <NumField id={p.id} block={p.block} name="answer" label="Respuesta" />
          <NumField id={p.id} block={p.block} name="tolerance" label="Tolerancia" />
          <TextField id={p.id} block={p.block} name="unit" label="Unidad" placeholder="m" />
        </div>
      }
    />
  ),
  fill_in: (p) => {
    const blanks = Array.isArray(p.block.props?.blanks) ? (p.block.props.blanks as string[]) : []
    return (
      <Ask
        {...p}
        icon="fillIn"
        label="Completar"
        extra={
          <div className="melu-blanks" {...SKIP}>
            {blanks.length === 0 ? (
              <span className="melu-hint">Poné las respuestas entre llaves dobles: la capital es {'{{París}}'}</span>
            ) : (
              blanks.map((b, i) => (
                <span key={i} className="melu-blank-chip">
                  {i + 1}. {b}
                </span>
              ))
            )}
          </div>
        }
      />
    )
  },
  order: (p) => <Ask {...p} icon="order" label="Ordenar" extra={<ListField id={p.id} block={p.block} name="items" label="En el orden correcto" />} />,
  match: (p) => <Ask {...p} icon="match" label="Emparejar" extra={<PairField id={p.id} block={p.block} />} />,
  question: (p) => (
    <Ask
      {...p}
      icon="question"
      label="Pregunta abierta"
      extra={
        <div className="melu-fields" {...SKIP}>
          <NumField id={p.id} block={p.block} name="rows" label="Renglones" step={1} />
          <NumField id={p.id} block={p.block} name="minWords" label="Mínimo de palabras" step={1} />
        </div>
      }
    />
  ),
  evidence: (p) => (
    <Ask
      {...p}
      icon="evidence"
      label="Evidencia"
      extra={
        <div className="melu-fields" {...SKIP}>
          <PickField
            id={p.id}
            block={p.block}
            name="media"
            label="Qué se pide"
            options={[
              { value: 'photo', label: 'Foto' },
              { value: 'audio', label: 'Audio' },
              { value: 'file', label: 'Archivo' },
            ]}
          />
        </div>
      }
    />
  ),
  self_report: (p) => (
    <Ask
      {...p}
      icon="selfReport"
      label="Autoreporte"
      extra={
        <div className="melu-fields" {...SKIP}>
          <TextField id={p.id} block={p.block} name="low" label="Extremo bajo" />
          <TextField id={p.id} block={p.block} name="high" label="Extremo alto" />
          <NumField id={p.id} block={p.block} name="steps" label="Puntos" step={1} />
        </div>
      }
    />
  ),
  game: (p) => (
    <Ask
      {...p}
      icon="game"
      label="Juego"
      extra={
        <div className="melu-fields" {...SKIP}>
          <PickField
            id={p.id}
            block={p.block}
            name="engine"
            label="Mecánica"
            options={[
              { value: 'sort', label: 'Clasificar' },
              { value: 'memory', label: 'Memoria' },
              { value: 'time_attack', label: 'Contrarreloj' },
            ]}
          />
          <NumField id={p.id} block={p.block} name="seconds" label="Tiempo (s)" step={5} />
        </div>
      }
    />
  ),
  manipulative: (p) => (
    <Ask
      {...p}
      icon="figure"
      label="Figura"
      extra={
        <div className="melu-fields" {...SKIP}>
          <PickField
            id={p.id}
            block={p.block}
            name="figure"
            label="Qué figura"
            options={[
              { value: 'number_line', label: 'Recta' },
              { value: 'fraction_bar', label: 'Fracción' },
              { value: 'balance', label: 'Balanza' },
            ]}
          />
          <NumField id={p.id} block={p.block} name="min" label="Desde" />
          <NumField id={p.id} block={p.block} name="max" label="Hasta" />
          <NumField id={p.id} block={p.block} name="answer" label="Respuesta" />
        </div>
      }
    />
  ),
}

/** Una lista de textos sueltos guardada en una prop. */
function ListField({ id, block, name, label }: { id: BlockId; block: Block; name: string; label: string }) {
  const editor = useEditor()
  const items = Array.isArray(block.props?.[name]) ? (block.props[name] as string[]) : []
  const write = (next: string[]) => editor.run('setBlockProps', { id, props: { [name]: next } })
  return (
    <div className="melu-fields melu-stack" {...SKIP}>
      <span className="melu-field-label">{label}</span>
      {items.map((item, i) => (
        <div key={i} className="melu-option">
          <span className="melu-ordinal">{i + 1}.</span>
          <input
            className="melu-option-text"
            value={item}
            placeholder={`Elemento ${i + 1}`}
            onChange={(e) => write(items.map((x, k) => (k === i ? e.target.value : x)))}
          />
          <button
            type="button"
            className="melu-ghost"
            aria-label="Quitar"
            onClick={() => write(items.filter((_, k) => k !== i))}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
      <button type="button" className="melu-ghost" onClick={() => write([...items, ''])}>
        <Icon name="plus" size={14} /> Agregar
      </button>
    </div>
  )
}

function PairField({ id, block }: { id: BlockId; block: Block }) {
  const editor = useEditor()
  const pairs = Array.isArray(block.props?.pairs) ? (block.props.pairs as { left?: string; right?: string }[]) : []
  const write = (next: { left: string; right: string }[]) => editor.run('setBlockProps', { id, props: { pairs: next } })
  const normalized = pairs.map((p) => ({ left: p.left ?? '', right: p.right ?? '' }))
  return (
    <div className="melu-fields melu-stack" {...SKIP}>
      <span className="melu-field-label">Las parejas</span>
      {normalized.map((pair, i) => (
        <div key={i} className="melu-pair">
          <input
            className="melu-option-text"
            value={pair.left}
            placeholder="Una cosa"
            onChange={(e) => write(normalized.map((p, k) => (k === i ? { ...p, left: e.target.value } : p)))}
          />
          <Icon name="match" size={14} />
          <input
            className="melu-option-text"
            value={pair.right}
            placeholder="Su par"
            onChange={(e) => write(normalized.map((p, k) => (k === i ? { ...p, right: e.target.value } : p)))}
          />
          <button type="button" className="melu-ghost" aria-label="Quitar" onClick={() => write(normalized.filter((_, k) => k !== i))}>
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
      <button type="button" className="melu-ghost" onClick={() => write([...normalized, { left: '', right: '' }])}>
        <Icon name="plus" size={14} /> Otra pareja
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------- registry

/**
 * El estilo del envoltorio de un bloque, no de su contenido. Hoy una cosa: un ítem que arranca en
 * otro número reinicia el contador acá, porque el alcance de un contador CSS llega a los hermanos
 * que siguen y puesto adentro le servía solo a él.
 */
export function wrapperStyle(block: Block): CSSProperties | undefined {
  if (block.type !== 'numbered_list') return undefined
  const start = num(block.props, 'start', 1)
  return start > 1 ? { counterReset: `melu-ol ${start - 1}` } : undefined
}

export const defaultRenderers: Renderers = {
  paragraph: Paragraph,
  heading_1: Heading1,
  heading_2: Heading2,
  heading_3: Heading3,
  bulleted_list: Bulleted,
  numbered_list: Numbered,
  todo: Todo,
  toggle: Toggle,
  quote: Quote,
  callout: Callout,
  code: Code,
  divider: Divider,
  image: Image,
  video: Video,
  audio: Audio,
  file: FileBlock,
  bookmark: Bookmark,
  embed: Embed,
  table: Table,
  table_row: TableRow,
  table_cell: TableCell,
  columns: Columns,
  column: Column,
  table_of_contents: TableOfContents,
  timer: Timer,
  math: MathBlock,
  ...asks,
}

/** Un tipo que nadie registró: el texto sigue editable y dice qué es. Un documento más nuevo se abre igual. */
export const Unknown: Renderer = function Unknown({ id, block, readOnly, children }) {
  const editor = useEditor()
  const spec = editor.state.schema.spec(block.type)
  return (
    <div className="melu-unknown">
      <span className="melu-unknown-label" {...SKIP}>
        {hasIcon(spec?.icon) ? <Icon name={spec.icon} size={13} /> : null}
        {spec?.name ?? block.type}
      </span>
      <BlockText id={id} value={block.text} className="melu-paragraph" readOnly={readOnly} />
      {children}
    </div>
  )
}
