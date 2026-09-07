// El componente que la plataforma monta, y donde los eventos del navegador se encuentran con el
// motor. Tiene lo que no puede vivir en un bloque: la página, el portapapeles, las selecciones de
// bloques enteros, y lo que flota.

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { BlockId } from '../core/doc.ts'
import { flatten } from '../core/doc.ts'
import type { Editor } from '../core/editor.ts'
import { isBlocks, isText } from '../core/selection.ts'
import { plain } from '../core/text.ts'
import { clipboardFor, MELU_MIME } from '../plugins/paste.ts'
import { EditorProvider, useBlock, useChildren, useEditor, useIsSelected } from './hooks.ts'
import { defaultRenderers, Unknown, wrapperStyle, type Renderers } from './renderers.tsx'
import { BLOCK_ATTR, blockIdOf, readSelection } from './dom.ts'
import { isRealMove, measure, targetAt, type DropTarget } from './dnd.ts'

export type SurfaceProps = {
  editor: Editor
  /** Extra or replacement renderers, merged over the defaults. */
  renderers?: Renderers
  readOnly?: boolean
  /** What floats over the page: menus, bars, handles. Rendered inside the surface. */
  children?: ReactNode
  className?: string
  /** Called when a block is clicked with the handle, so a host can open its own menu. */
  onOpenBlockMenu?: (id: BlockId, at: { x: number; y: number }) => void
  'aria-label'?: string
}

/** The one block component. Memoised and subscribed to its own block, and to nothing else. */
const BlockView = memo(function BlockView({
  id,
  renderers,
  readOnly,
}: {
  id: BlockId
  renderers: Renderers
  readOnly: boolean
}) {
  const editor = useEditor()
  const block = useBlock(id)
  const { active, picked } = useIsSelected(id)
  if (!block) return null

  const spec = editor.state.schema.spec(block.type)
  const Render = renderers[block.type] ?? Unknown
  const children = block.children.length ? <Children ids={block.children} renderers={renderers} readOnly={readOnly} /> : null

  return (
    <div
      className="melu-block"
      data-type={block.type}
      data-active={active || undefined}
      data-picked={picked || undefined}
      data-standalone={spec?.standalone || undefined}
      style={wrapperStyle(block)}
      {...{ [BLOCK_ATTR]: id }}
    >
      <Render id={id} block={block} readOnly={readOnly}>
        {children}
      </Render>
    </div>
  )
})

const Children = memo(function Children({
  ids,
  renderers,
  readOnly,
}: {
  ids: readonly BlockId[]
  renderers: Renderers
  readOnly: boolean
}) {
  return (
    <div className="melu-children">
      {ids.map((id) => (
        <BlockView key={id} id={id} renderers={renderers} readOnly={readOnly} />
      ))}
    </div>
  )
})

/** The top level, which re-renders only when the root's list of children changes. */
const Page = memo(function Page({ renderers, readOnly }: { renderers: Renderers; readOnly: boolean }) {
  const editor = useEditor()
  const ids = useChildren(editor.doc.root)
  return (
    <>
      {ids.map((id) => (
        <BlockView key={id} id={id} renderers={renderers} readOnly={readOnly} />
      ))}
    </>
  )
})

/**
 * Si el evento vino de un control propio de un bloque y no del texto del editor. Sin esto, pegar
 * una dirección en la caja de un video lo agarraba el editor, cancelaba el evento e insertaba un
 * bloque en otro lado. Vale igual para copiar, cortar y deshacer.
 */
const fromWidget = (target: EventTarget | null): boolean => {
  const el = target instanceof Element ? target : null
  return Boolean(el?.closest('input, textarea, select, button, [data-melu-skip]'))
}

export function Surface({
  editor,
  renderers,
  readOnly = false,
  children,
  className,
  onOpenBlockMenu,
  ...rest
}: SurfaceProps) {
  const ref = useRef<HTMLDivElement>(null)
  const merged = useMemo(() => ({ ...defaultRenderers, ...renderers }), [renderers])
  const [drop, setDrop] = useState<DropTarget | null>(null)
  const dragging = useRef<{ id: BlockId; placed: ReturnType<typeof measure> } | null>(null)
  /** El último destino calculado, para el `pointerup` que se registró una sola vez. */
  const latestDrop = useRef<DropTarget | null>(null)
  /** Desde dónde arrancó un arrastre de selección, para saber cuándo pasa a ser de bloques. */
  const anchorBlock = useRef<BlockId | null>(null)

  useEffect(() => {
    editor.readOnly = readOnly
  }, [editor, readOnly])

  // -------------------------------------------------------------------------- selection

  // El navegador no puede seleccionar cruzando dos regiones editables, así que un arrastre que
  // sale del bloque donde empezó se vuelve una selección de bloques enteros, como en Notion.
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const onChange = () => {
      const from = anchorBlock.current
      const sel = document.getSelection()
      if (!sel || !sel.focusNode || !container.contains(sel.focusNode)) return
      const to = blockIdOf(sel.focusNode)
      if (!to) return

      if (from && to !== from) {
        editor.run('selectBlockRange', { id: to })
        return
      }
      const range = readSelection(container)
      if (!range) return
      const current = editor.selection
      // Si el modelo ya dice esto, no vale volver a decirlo: sería un ciclo con el DOM.
      if (
        isText(current) &&
        current.head.block === range.block &&
        Math.min(current.anchor.offset, current.head.offset) === range.from &&
        Math.max(current.anchor.offset, current.head.offset) === range.to
      ) {
        return
      }
      editor.setSelection({
        kind: 'text',
        anchor: { block: range.block, offset: range.backwards ? range.to : range.from },
        head: { block: range.block, offset: range.backwards ? range.from : range.to },
      })
    }
    document.addEventListener('selectionchange', onChange)
    return () => document.removeEventListener('selectionchange', onChange)
  }, [editor])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const id = blockIdOf(e.target as Node)
      anchorBlock.current = id
      // Un click en el hueco de abajo de la página deja el caret en el último bloque, que es lo
      // que espera cualquiera que quiera seguir escribiendo.
      if (!id && e.target === ref.current) editor.run('focusEnd')
    },
    [editor],
  )

  const onPointerUp = useCallback(() => {
    anchorBlock.current = null
  }, [])

  // -------------------------------------------------------------------------- clipboard

  const writeClipboard = useCallback(
    (e: React.ClipboardEvent) => {
      const sel = editor.selection
      if (!isBlocks(sel)) return false
      const data = clipboardFor(editor.doc, sel.ids)
      for (const [type, value] of Object.entries(data)) e.clipboardData.setData(type, value)
      return true
    },
    [editor],
  )

  const onCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (fromWidget(e.target)) return
      if (writeClipboard(e)) e.preventDefault()
    },
    [writeClipboard],
  )

  const onCut = useCallback(
    (e: React.ClipboardEvent) => {
      if (readOnly || fromWidget(e.target)) return
      if (!writeClipboard(e)) return
      e.preventDefault()
      editor.run('deleteSelection')
    },
    [editor, readOnly, writeClipboard],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (readOnly || fromWidget(e.target)) return
      const data: Record<string, string> = {}
      for (const type of [MELU_MIME, 'text/html', 'text/uri-list', 'text/plain']) {
        const value = e.clipboardData.getData(type)
        if (value) data[type] = value
      }
      if (Object.keys(data).length === 0) return
      if (editor.handlePaste(data)) e.preventDefault()
    },
    [editor, readOnly],
  )

  // -------------------------------------------------------------------------- keys outside a block

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.defaultPrevented || fromWidget(e.target)) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) editor.redo()
        else editor.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        editor.redo()
        return
      }
      // Con bloques elegidos el foco no está en ningún texto, así que las teclas llegan acá.
      if (isBlocks(editor.selection)) {
        if (e.key === 'Escape') {
          const id = editor.selection.ids[0]
          if (id) editor.run('focusBlock', { id, at: 'end' })
          e.preventDefault()
          return
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const order = flatten(editor.doc)
          const at = order.indexOf(editor.selection.anchor)
          const next = order[at + (e.key === 'ArrowDown' ? 1 : -1)]
          if (next) {
            editor.run(e.shiftKey ? 'selectBlockRange' : 'selectBlock', { id: next })
            e.preventDefault()
          }
          return
        }
        if (editor.handleKey(e)) e.preventDefault()
      }
    },
    [editor],
  )

  // -------------------------------------------------------------------------- dragging

  const startDrag = useCallback(
    (id: BlockId, e: React.PointerEvent) => {
      const container = ref.current
      if (!container || readOnly) return
      e.preventDefault()
      dragging.current = { id, placed: measure(container, editor.doc) }
      // Se limpia al empezar: un arrastre que cruza el umbral y se suelta sin un solo movimiento
      // más usaba el destino del arrastre anterior y mandaba el bloque ahí.
      latestDrop.current = null
      editor.run('selectBlock', { id })
      document.body.classList.add('melu-dragging')

      const move = (ev: PointerEvent) => {
        const state = dragging.current
        if (!state) return
        const target = targetAt(
          editor.doc,
          state.placed,
          state.id,
          ev.clientX,
          ev.clientY,
          (parent, child) => editor.state.schema.accepts(parent, child),
        )
        // El ref se escribe donde se calcula y no durante el render: `pointerup` se registra una
        // sola vez y necesita el último destino.
        latestDrop.current = target
        setDrop(target)
      }
      const up = () => {
        const state = dragging.current
        const target = latestDrop.current
        dragging.current = null
        latestDrop.current = null
        setDrop(null)
        document.body.classList.remove('melu-dragging')
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (state && target && isRealMove(editor.doc, state.id, target)) {
          editor.run('moveBlock', { id: state.id, parent: target.parent, index: target.index })
        }
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [editor, readOnly],
  )

  const contexto = useMemo<DragContextValue>(
    () => ({ startDrag, surface: () => ref.current, ...(onOpenBlockMenu ? { onOpenBlockMenu } : {}) }),
    [startDrag, onOpenBlockMenu],
  )

  const surface = (
    <div
      ref={ref}
      className={['melu-surface', className].filter(Boolean).join(' ')}
      data-melu-surface="true"
      data-read-only={readOnly || undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onCopy={onCopy}
      onCut={onCut}
      onPaste={onPaste}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      role="group"
      {...rest}
    >
      <Page renderers={merged} readOnly={readOnly} />
      {drop ? <DropIndicator target={drop} surface={ref.current} /> : null}
      <DragContext.Provider value={contexto}>{children}</DragContext.Provider>
      {!readOnly ? <Tail /> : null}
    </div>
  )

  return <EditorProvider value={editor}>{surface}</EditorProvider>
}

/** El pedazo clickeable del final: una página siempre tiene dónde seguir escribiendo. */
function Tail() {
  const editor = useEditor()
  return (
    <div
      className="melu-tail"
      onClick={() => {
        const kids = editor.doc.blocks[editor.doc.root]!.children
        const last = kids[kids.length - 1]
        const block = last ? editor.block(last) : undefined
        const textual = block && editor.state.schema.isTextual(block.type)
        if (textual && plain(block.text) === '') editor.run('focusBlock', { id: last!, at: 'end' })
        else editor.run('insertBlock', { type: 'paragraph', at: 'end' })
      }}
    />
  )
}

/** La línea o el marco que dice dónde va a caer lo que se está arrastrando. */
function DropIndicator({ target, surface }: { target: DropTarget; surface: HTMLElement | null }) {
  if (!surface) return null
  const box = surface.getBoundingClientRect()
  if (target.hint.kind === 'inside') {
    const el = surface.querySelector<HTMLElement>(`[${BLOCK_ATTR}="${target.hint.id.replace(/["\\]/g, '\\$&')}"]`)
    const rect = el?.getBoundingClientRect()
    if (!rect) return null
    return (
      <div
        className="melu-drop-inside"
        style={{ left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height }}
      />
    )
  }
  return (
    <div
      className="melu-drop-line"
      style={{ left: target.hint.x - box.left, top: target.hint.y - box.top, width: target.hint.width }}
    />
  )
}

/** Lo que el asa necesita para arrastrar, sin pasarlo por props por toda la página. */
export type DragContextValue = {
  startDrag: (id: BlockId, e: React.PointerEvent) => void
  /**
   * La superficie de este editor. Por el contexto y no por `querySelector`: con dos editores
   * montados, el asa del segundo medía la página del primero y nunca aparecía.
   */
  surface: () => HTMLElement | null
  onOpenBlockMenu?: (id: BlockId, at: { x: number; y: number }) => void
}

export const DragContext = createContext<DragContextValue>({ startDrag: () => {}, surface: () => null })

export const useDragHandle = () => useContext(DragContext)

export { BlockView, Page }
