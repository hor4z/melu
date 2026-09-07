/**
 * The format bar: appears over a selection, and disappears when there is nothing selected.
 *
 * The one thing it must not do is take the focus. A toolbar that steals the caret has nothing to
 * format by the time the click lands, which is why `keepFocus` cancels the pointer down on the
 * popover and every button acts on the selection the engine already has.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MarkType } from '../core/text.ts'
import { isText } from '../core/selection.ts'
import { useActiveMarks, useEditor, useSelection } from '../react/hooks.ts'
import { caretRect } from '../react/dom.ts'
import { Icon, type IconName } from '../react/icons.tsx'
import { Popover } from './Popover.tsx'
import { TONES } from '../plugins/text.ts'
import type { Anchor } from './float.ts'

const MARKS: { type: MarkType; icon: IconName; label: string; key: string }[] = [
  { type: 'bold', icon: 'bold', label: 'Negrita', key: 'Mod+B' },
  { type: 'italic', icon: 'italic', label: 'Cursiva', key: 'Mod+I' },
  { type: 'underline', icon: 'underline', label: 'Subrayado', key: 'Mod+U' },
  { type: 'strike', icon: 'strike', label: 'Tachado', key: 'Mod+Shift+S' },
  { type: 'code', icon: 'code', label: 'Código', key: 'Mod+E' },
]

/** Los tipos que ofrece el conversor rápido, en el orden en que se usan. */
const TURN_INTO = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list', 'numbered_list', 'todo', 'quote', 'callout', 'code']

export function FormatBar() {
  const editor = useEditor()
  const selection = useSelection()
  const marks = useActiveMarks()
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [panel, setPanel] = useState<'none' | 'turn' | 'color' | 'link'>('none')

  const visible = useMemo(() => {
    if (editor.readOnly) return false
    if (!isText(selection)) return false
    return selection.anchor.offset !== selection.head.offset || selection.anchor.block !== selection.head.block
  }, [selection, editor.readOnly])

  // La barra sigue a la selección: se mide después de que el navegador la pintó.
  useEffect(() => {
    if (!visible) {
      setAnchor(null)
      setPanel('none')
      return
    }
    const frame = requestAnimationFrame(() => {
      const rect = caretRect()
      if (rect) setAnchor({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height })
    })
    return () => cancelAnimationFrame(frame)
  }, [visible, selection])

  const close = useCallback(() => setPanel('none'), [])

  /**
   * Mod+K abre el panel del link.
   *
   * El botón anunciaba el atajo y el atajo no existía, que es peor que no anunciarlo. Va acá y no
   * en el keymap del motor porque lo que abre es un panel de esta barra, y el motor no sabe qué
   * paneles hay: los comandos con nombre son para lo que cambia el documento.
   */
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey) return
      e.preventDefault()
      setPanel((p) => (p === 'link' ? 'none' : 'link'))
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [visible])

  if (!visible || !anchor) return null

  const active = (type: MarkType) => marks.some((m) => m.type === type)

  return (
    <>
      <Popover
        anchor={anchor}
        open
        onClose={close}
        placement="top-center"
        role="toolbar"
        aria-label="Formato"
        dismissable={false}
        keepFocus
        className="melu-bar"
      >
        <button
          type="button"
          className="melu-bar-btn melu-bar-turn"
          onClick={() => setPanel((p) => (p === 'turn' ? 'none' : 'turn'))}
          aria-expanded={panel === 'turn'}
        >
          {editor.state.schema.specOr(currentType(editor)).name}
          <Icon name="chevron" size={12} className="melu-rot" />
        </button>
        <span className="melu-bar-sep" />
        {MARKS.map((m) => (
          <button
            key={m.type}
            type="button"
            className="melu-bar-btn"
            data-active={active(m.type) || undefined}
            aria-pressed={active(m.type)}
            title={`${m.label} · ${m.key}`}
            aria-label={m.label}
            onClick={() => editor.run('toggleMark', { type: m.type })}
          >
            <Icon name={m.icon} size={16} />
          </button>
        ))}
        <button
          type="button"
          className="melu-bar-btn"
          data-active={marks.some((m) => m.type === 'link') || undefined}
          title="Link · Mod+K"
          aria-label="Link"
          onClick={() => setPanel((p) => (p === 'link' ? 'none' : 'link'))}
        >
          <Icon name="link" size={16} />
        </button>
        <span className="melu-bar-sep" />
        <button
          type="button"
          className="melu-bar-btn"
          title="Color"
          aria-label="Color"
          aria-expanded={panel === 'color'}
          onClick={() => setPanel((p) => (p === 'color' ? 'none' : 'color'))}
        >
          <Icon name="palette" size={16} />
        </button>
        <button
          type="button"
          className="melu-bar-btn"
          title="Quitar el formato · Mod+Shift+C"
          aria-label="Quitar el formato"
          onClick={() => editor.run('clearFormatting')}
        >
          <Icon name="close" size={15} />
        </button>
      </Popover>

      {panel === 'turn' ? (
        <Popover anchor={anchor} open onClose={close} placement="bottom-start" aria-label="Convertir en" keepFocus>
          <div className="melu-menu">
            {TURN_INTO.filter((t) => editor.state.schema.spec(t)).map((type) => {
              const spec = editor.state.schema.specOr(type)
              return (
                <button
                  key={type}
                  type="button"
                  className="melu-menu-item"
                  onClick={() => {
                    editor.run('setBlockType', { type })
                    close()
                  }}
                >
                  <span className="melu-menu-icon">
                    <Icon name={(spec.icon as IconName) ?? 'text'} size={16} />
                  </span>
                  <span className="melu-menu-name">{spec.name}</span>
                </button>
              )
            })}
          </div>
        </Popover>
      ) : null}

      {panel === 'color' ? (
        <Popover anchor={anchor} open onClose={close} placement="bottom-start" aria-label="Color" keepFocus>
          <div className="melu-swatches">
            <div className="melu-menu-title">Color del texto</div>
            <div className="melu-swatch-row">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  className="melu-swatch"
                  data-tone={tone}
                  title={tone}
                  aria-label={`Texto ${tone}`}
                  onClick={() => {
                    editor.run('toggleMark', { type: 'color', value: tone })
                    close()
                  }}
                >
                  A
                </button>
              ))}
            </div>
            <div className="melu-menu-title">Fondo</div>
            <div className="melu-swatch-row">
              {TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  className="melu-swatch melu-swatch-bg"
                  data-tone={tone}
                  title={tone}
                  aria-label={`Fondo ${tone}`}
                  onClick={() => {
                    editor.run('toggleMark', { type: 'bg', value: tone })
                    close()
                  }}
                />
              ))}
            </div>
          </div>
        </Popover>
      ) : null}

      {panel === 'link' ? <LinkPanel anchor={anchor} onClose={close} /> : null}
    </>
  )
}

function LinkPanel({ anchor, onClose }: { anchor: Anchor; onClose: () => void }) {
  const editor = useEditor()
  const [value, setValue] = useState('')
  return (
    <Popover anchor={anchor} open onClose={onClose} placement="bottom-start" role="dialog" aria-label="Link">
      <form
        className="melu-link-form"
        onSubmit={(e) => {
          e.preventDefault()
          editor.run('setLink', { href: normalizeHref(value) })
          onClose()
        }}
      >
        <input
          autoFocus
          className="melu-link-input"
          value={value}
          placeholder="https://"
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="melu-ghost">
          Poner
        </button>
        <button
          type="button"
          className="melu-ghost"
          onClick={() => {
            editor.run('setLink', { href: '' })
            onClose()
          }}
        >
          Quitar
        </button>
      </form>
    </Popover>
  )
}

/** Alguien que pega "educabot.com" quiere un link, no una ruta relativa. */
export const normalizeHref = (raw: string): string => {
  const value = raw.trim()
  if (value === '') return ''
  if (/^(https?:|mailto:|tel:|\/|#)/.test(value)) return value
  return `https://${value}`
}

const currentType = (editor: ReturnType<typeof useEditor>): string => {
  const sel = editor.selection
  const id = sel?.kind === 'text' ? sel.head.block : sel?.kind === 'blocks' ? sel.anchor : undefined
  return id ? (editor.block(id)?.type ?? 'paragraph') : 'paragraph'
}
