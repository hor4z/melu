// El texto editable de un bloque, y dos reglas que son la diferencia entre un editor que anda y
// uno que corrompe lo que escribís.
//
// El navegador inserta las letras y nosotros las leemos de vuelta. Interceptar cada tecla se rompe
// con el primer acento de tecla muerta o el primer dictado. Así que el navegador se queda con lo
// que pasa adentro de un párrafo, y el motor con todo lo que cruza un borde de bloque.
//
// Acá adentro no hay eventos: el foco vive en la superficie, que es la región editable de verdad,
// y las teclas y el `input` llegan todos allá. De este lado quedan dibujar los runs y poner el
// caret cuando el rango es de este bloque.
//
// React no maneja los hijos de este elemento: los runs se ponen a mano. No es preferencia, es
// obligación, porque React compara contra el árbol que dibujó y el navegador lo estuvo editando
// por atrás. Si se lo deja reconciliar, duplica texto.

import { memo, useLayoutEffect, useRef, type CSSProperties, type JSX } from 'react'
import type { BlockId } from '../core/doc.ts'
import type { Editor } from '../core/editor.ts'
import type { Mark, RichText, Span } from '../core/text.ts'
import { plain } from '../core/text.ts'
import { isText } from '../core/selection.ts'
import { composing } from './composing.ts'
import { useEditor } from './hooks.ts'
import {
  MARKS_ATTR,
  TEXT_ATTR,
  domFromOffset,
  offsetFromDom,
  offsetOfCaret,
  readText,
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
}: BlockTextProps) {
  const editor = useEditor()
  const ref = useRef<HTMLElement>(null)

  const text = value ?? []
  const empty = plain(text) === ''

  // Después de cada render, y en un efecto de layout para que nada se vea fuera de lugar.
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || composing.current) return
    const rebuilt = reconcile(root, text)

    const sel = editor.selection
    // Un rango que cruza bloques no es de nadie de acá: lo pone la superficie, que ve las dos
    // puntas. Si este bloque intentara poner la suya, colapsaría la selección al pintarse.
    if (!isText(sel) || sel.head.block !== id || sel.anchor.block !== id) return
    const from = sel.anchor.offset
    const to = sel.head.offset
    // Si el navegador ya tiene el caret ahí, no se lo toca: reescribirlo cancela una composición
    // y hace parpadear la selección.
    if (!rebuilt && caretIsAt(root, from, to)) return
    // El foco vive en la superficie, que es la región editable: no hay foco por bloque que poner.
    // Adentro del editor manda el modelo, y así Enter deja escribiendo en el bloque nuevo. Si el
    // foco está afuera no se le roba: una página de fondo no se queda con el teclado.
    const surface = root.closest('[data-melu-surface]')
    if (!surface?.contains(document.activeElement)) return
    placeCaret(root, from, to)
  })

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
    />
  )
})

/**
 * Lee de vuelta lo que el navegador escribió adentro de un bloque y lo pone en el modelo.
 *
 * Corre después del hecho, a propósito: la letra ya está puesta, con su acento compuesto y lo que
 * haya decidido el teclado del celular, y acá solo se averigua cuál fue. La llama la superficie,
 * que es donde llega el `input`, porque el foco es de ella y no de cada bloque.
 */
export function syncBlock(editor: Editor, root: HTMLElement, id: BlockId): void {
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

