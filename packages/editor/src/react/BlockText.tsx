/**
 * The editable text of one block.
 *
 * Two rules, and both of them are the difference between an editor that works and one that
 * corrupts what you type.
 *
 * **The browser inserts characters, we read them back.** Intercepting every keystroke and writing
 * the DOM ourselves is the tempting version, and it breaks the moment someone types an accent with
 * a dead key, dictates on a phone, or uses an input method that composes several presses into one
 * letter. In a Spanish speaking classroom those are not edge cases, they are Tuesday. So the
 * browser owns what happens inside a paragraph, and the engine owns everything that crosses a
 * block boundary: Enter, Tab, Backspace at the very start, the shortcuts and the menus.
 *
 * **React does not own the children of this element.** It renders the element and its attributes
 * and stops there; the runs inside are put in by hand. This is not a preference, it is forced:
 * React diffs against the tree it last rendered, and the browser has been editing that tree behind
 * its back, so its idea of "before" is a fiction. Let it reconcile and it duplicates text. Every
 * serious editor arrives at this same split, and this is where it lives here.
 */

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
 * Makes the DOM say what the model says, and only when it does not already.
 *
 * The "only when" is the whole point: right after someone typed a letter the DOM is already
 * correct, and rewriting it would move the caret and cancel the accent being composed. So the
 * common case does nothing at all, and a rebuild happens when a command changed the text from
 * outside: bolding a word, undoing, an agent writing.
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

  /**
   * After every render: bring the DOM in line, and put the caret where the model says. Both in a
   * layout effect so it happens before the browser paints and nothing is ever seen out of place.
   */
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
      // Adentro del editor manda el modelo: si el caret pasó a este bloque, este bloque toma el
      // foco, que es cómo Enter deja escribiendo en el bloque nuevo. Si el foco está afuera del
      // editor no se le roba: una página montada de fondo no se queda con el teclado.
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
      // Sin `role`: un `role="textbox"` encima de un `h1` le tapa el rol de título, y navegar un
      // documento por sus títulos es la primera cosa que hace alguien con un lector de pantalla.
      // Un elemento con `contenteditable` ya se anuncia como editable, así que el rol no hacía
      // falta y costaba. Notion tampoco lo pone, y por esto.
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
 * Whether an up or down arrow should leave the block, and where it should land.
 *
 * It should only leave from the first or the last visual line: in the middle of a long paragraph,
 * down means the next line, not the next block. And it aims at the column the caret was in, which
 * is the difference between walking a page and jumping between boxes. The column is geometry, so
 * it is measured here and not in the engine, which has no idea how anything is drawn.
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
