// El texto editable de un bloque, y dos reglas que son la diferencia entre un editor que anda y
// uno que corrompe lo que escribís.
//
// El navegador inserta las letras y nosotros las leemos de vuelta. Interceptar cada tecla se rompe
// con el primer acento de tecla muerta o el primer dictado. Así que el navegador se queda con lo
// que pasa adentro de un párrafo, y el motor con todo lo que cruza un borde de bloque.
//
// React no maneja los hijos de este elemento: los runs se ponen a mano. No es preferencia, es
// obligación, porque React compara contra el árbol que dibujó y el navegador lo estuvo editando
// por atrás. Si se lo deja reconciliar, duplica texto.

import { memo, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type JSX } from 'react'
import type { BlockId } from '../core/doc.ts'
import { flatten } from '../core/doc.ts'
import type { Editor } from '../core/editor.ts'
import type { Mark, RichText, Span } from '../core/text.ts'
import { plain } from '../core/text.ts'
import { isText } from '../core/selection.ts'
import { useEditor } from './hooks.ts'
import {
  MARKS_ATTR,
  TEXT_ATTR,
  domFromOffset,
  offsetAtPoint,
  offsetFromDom,
  readText,
  textRootOf,
  writeMarks,
} from './dom.ts'

export type BlockTextProps = {
  id: BlockId
  value: RichText | undefined
  placeholder?: string
  /** The tag to render. A heading is an `h1` so a screen reader hears a heading. */
  as?: keyof JSX.IntrinsicElements
  className?: string
  style?: CSSProperties
  readOnly?: boolean
  /** Sees the key before the engine does. Return false to keep the engine out of it. */
  onKeyDownCapture?: (e: React.KeyboardEvent<HTMLElement>) => boolean | void
}

/** The class each mark paints with. Kept in the stylesheet so a theme can restyle them. */
const MARK_CLASS: Partial<Record<Mark['type'], string>> = {
  bold: 'melu-b',
  italic: 'melu-i',
  underline: 'melu-u',
  strike: 'melu-s',
  code: 'melu-code',
  link: 'melu-link',
}

/** One run, as a real element. Always a span, even unformatted: see `readText`. */
function spanElement(sp: Span): HTMLSpanElement {
  const el = document.createElement('span')
  el.textContent = sp.text
  el.setAttribute(MARKS_ATTR, writeMarks(sp.marks))
  const marks = sp.marks ?? []
  const classes = marks.map((m) => MARK_CLASS[m.type]).filter(Boolean)
  if (classes.length) el.className = classes.join(' ')
  const color = marks.find((m) => m.type === 'color')?.value
  const bg = marks.find((m) => m.type === 'bg')?.value
  if (color && color !== 'default') el.style.color = `var(--melu-tone-${color})`
  if (bg && bg !== 'default') el.style.background = `var(--melu-wash-${bg})`
  const href = marks.find((m) => m.type === 'link')?.value
  if (href) {
    el.dataset.href = href
    el.title = href
  }
  return el
}

const sameText = (a: RichText, b: RichText) => a.length === b.length && JSON.stringify(a) === JSON.stringify(b)

/**
 * Hace que el DOM diga lo que dice el modelo, y solo cuando no lo dice ya. Ese "solo cuando" es
 * todo: recién tipeada la letra el DOM ya está bien, y reescribirlo movería el caret y cancelaría
 * el acento que se está componiendo.
 */
function reconcile(root: HTMLElement, text: RichText): boolean {
  if (sameText(readText(root), text)) return false
  root.replaceChildren(...text.map(spanElement))
  return true
}

export const BlockText = memo(function BlockText({
  id,
  value,
  placeholder,
  as = 'div',
  className,
  style,
  readOnly,
  onKeyDownCapture,
}: BlockTextProps) {
  const editor = useEditor()
  const ref = useRef<HTMLElement>(null)
  const composing = useRef(false)

  const text = value ?? []
  const empty = plain(text) === ''

  // Después de cada render, y en un efecto de layout para que nada se vea fuera de lugar.
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || composing.current) return
    const rebuilt = reconcile(root, text)

    const sel = editor.selection
    if (!isText(sel) || sel.head.block !== id) return
    const from = sel.anchor.block === id ? sel.anchor.offset : sel.head.offset
    const to = sel.head.offset
    // Si el navegador ya tiene el caret ahí, no se lo toca: reescribirlo cancela una composición
    // y hace parpadear la selección.
    if (!rebuilt && caretIsAt(root, from, to)) return
    if (document.activeElement !== root && !root.contains(document.activeElement)) {
      // Adentro del editor manda el modelo, y así Enter deja escribiendo en el bloque nuevo. Si
      // el foco está afuera no se le roba: una página de fondo no se queda con el teclado.
      const surface = root.closest('[data-melu-surface]')
      if (!surface?.contains(document.activeElement)) return
      root.focus({ preventScroll: true })
    }
    placeCaret(root, from, to)
  })

  const sync = useCallback(() => {
    const root = ref.current
    if (!root || composing.current) return
    const now = readText(root)
    const before = editor.block(id)?.text ?? []
    if (sameText(now, before)) return
    const caret = offsetOfCaret(root)
    editor.exec(
      (ctx) => {
        ctx.tr.setText(id, now)
        if (caret !== null) {
          ctx.tr.select({ kind: 'text', anchor: { block: id, offset: caret }, head: { block: id, offset: caret } })
        }
        return true
      },
      { coalesce: `type:${id}` },
    )
  }, [editor, id])

  const onInput = useCallback(() => {
    if (composing.current) return
    sync()
    // Las reglas de tipeo miran el texto ya escrito: "# " se vuelve título recién cuando el
    // espacio está puesto.
    editor.applyInputRules()
  }, [editor, sync])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (onKeyDownCapture?.(e) === false) return
      if (composing.current) return

      // Borrar dentro del texto lo hace el navegador: sabe de emojis, de acentos y de lo que
      // seleccionó el mouse mejor que cualquier cosa que escribamos acá.
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const root = ref.current
        const at = root ? offsetOfCaret(root) : null
        const collapsed = document.getSelection()?.isCollapsed ?? true
        const total = plain(editor.block(id)?.text).length
        const boundary = e.key === 'Backspace' ? at === 0 : at === total
        if (!collapsed || !boundary) return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!e.shiftKey && crossBlockArrow(editor, id, ref.current, e.key === 'ArrowUp')) e.preventDefault()
        return
      }

      if (e.key === 'ArrowLeft' && !e.shiftKey) {
        const at = ref.current ? offsetOfCaret(ref.current) : null
        if (at === 0 && editor.run('caretBackward')) {
          e.preventDefault()
          return
        }
      }
      if (e.key === 'ArrowRight' && !e.shiftKey) {
        const at = ref.current ? offsetOfCaret(ref.current) : null
        if (at === plain(editor.block(id)?.text).length && editor.run('caretForward')) {
          e.preventDefault()
          return
        }
      }

      if (editor.handleKey(e)) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [editor, id, onKeyDownCapture],
  )

  const onBeforeInput = useCallback((e: React.FormEvent<HTMLElement>) => {
    const native = e.nativeEvent as InputEvent
    // Un pegado o un arrastre lo maneja la superficie entera, no este bloque.
    if (native.inputType === 'insertFromPaste' || native.inputType === 'insertFromDrop') e.preventDefault()
  }, [])

  const onCompositionStart = useCallback(() => {
    composing.current = true
  }, [])

  const onCompositionEnd = useCallback(() => {
    composing.current = false
    sync()
    editor.applyInputRules()
  }, [editor, sync])

  const onBlurCapture = useCallback(() => {
    // Lo que se escriba después de volver es otro cambio, no la continuación del anterior.
    editor.history.break()
    sync()
  }, [editor, sync])

  // Al desmontar no queda nada que limpiar, pero sí conviene soltar lo que el navegador esté
  // componiendo: un bloque que se va con una composición abierta deja el flag encendido.
  useEffect(() => () => {
    composing.current = false
  }, [])

  const Tag = as as 'div'

  return (
    <Tag
      ref={ref as never}
      className={['melu-text', empty ? 'melu-empty' : '', className].filter(Boolean).join(' ')}
      style={style}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck
      // El idioma se declara: el corrector del navegador lo usa, y en una consigna en español un
      // corrector en inglés subraya la mitad de las palabras.
      lang="es"
      data-placeholder={placeholder}
      {...{ [TEXT_ATTR]: 'true' }}
      // Sin `role`: un `role="textbox"` encima de un `h1` le tapa el rol de título, y navegar por
      // los títulos es lo primero que hace un lector de pantalla. Notion tampoco lo pone.
      onInput={onInput}
      onKeyDown={onKeyDown}
      onBeforeInput={onBeforeInput}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
      onBlurCapture={onBlurCapture}
    />
  )
})

/** The caret offset inside a region, or null when the caret is elsewhere. */
function offsetOfCaret(root: HTMLElement): number | null {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.focusNode) return null
  if (!root.contains(sel.focusNode)) return null
  return offsetFromDom(root, sel.focusNode, sel.focusOffset)
}

function caretIsAt(root: HTMLElement, from: number, to: number): boolean {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !sel.focusNode) return false
  if (!root.contains(sel.focusNode)) return false
  return (
    offsetFromDom(root, sel.anchorNode, sel.anchorOffset) === from &&
    offsetFromDom(root, sel.focusNode, sel.focusOffset) === to
  )
}

function placeCaret(root: HTMLElement, from: number, to: number): void {
  const a = domFromOffset(root, from)
  const b = from === to ? a : domFromOffset(root, to)
  try {
    const range = document.createRange()
    range.setStart(a.node, a.offset)
    range.setEnd(b.node, b.offset)
    const sel = document.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  } catch {
    /* el bloque cambió abajo del caret: el próximo render lo acomoda */
  }
}

/**
 * Si una flecha vertical tiene que salir del bloque, y dónde caer. Solo sale del primer o último
 * renglón, y apunta a la columna donde estaba el caret. Eso es geometría, así que se mide acá.
 */
function crossBlockArrow(editor: Editor, id: BlockId, root: HTMLElement | null, up: boolean): boolean {
  if (!root) return false
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  const bounds = root.getBoundingClientRect()
  const line = parseFloat(getComputedStyle(root).lineHeight) || 24
  const from = rect.height ? rect : bounds
  const leaving = up ? from.top - bounds.top < line * 0.6 : bounds.bottom - from.bottom < line * 0.6
  if (!leaving) return false

  const target = neighbourTextual(editor, id, up)
  if (!target) return false

  const surface = root.closest<HTMLElement>('[data-melu-surface]')
  const targetRoot = surface ? textRootOf(surface, target) : null
  if (!targetRoot) return editor.run('focusBlock', { id: target, at: up ? 'end' : 'start' })

  // La columna manda: se busca el offset del destino que cae bajo la misma x, en su último
  // renglón si se sube y en el primero si se baja.
  const box = targetRoot.getBoundingClientRect()
  const y = up ? box.bottom - line / 2 : box.top + line / 2
  const at = offsetAtPoint(targetRoot, from.left || box.left, y)
  return editor.run('focusBlock', { id: target, at: at ?? (up ? 'end' : 'start') })
}

/** El bloque con texto anterior o siguiente en el orden de lectura. */
function neighbourTextual(editor: Editor, id: BlockId, up: boolean): BlockId | null {
  const order = flatten(editor.doc).filter((b) => editor.state.schema.isTextual(editor.block(b)?.type ?? ''))
  const i = order.indexOf(id)
  if (i === -1) return null
  return (up ? order[i - 1] : order[i + 1]) ?? null
}
