// La barra de formato. Lo único que no puede hacer es tomar el foco: una barra que se lleva el
// caret no tiene qué formatear cuando llega el click, y de eso se ocupa `keepFocus`.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MarkType } from '../core/text.ts'
import { isBlocks, isText, selectedBlocks } from '../core/selection.ts'
import { useActiveMarks, useEditor, useSelection } from '../react/hooks.ts'
import { useDragHandle } from '../react/Surface.tsx'
import { BLOCK_ATTR } from '../react/dom.ts'
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
  const { surface: surfaceOf } = useDragHandle()
  const marks = useActiveMarks()
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [panel, setPanel] = useState<'none' | 'turn' | 'color' | 'link'>('none')

  /**
   * Con texto seleccionado y también con bloques elegidos. Lo segundo hace falta porque una
   * selección nativa no cruza dos regiones: arrastrar sobre varios párrafos da bloques, y sin esto
   * no había forma de pedir negrita con el mouse.
   */
  const visible = useMemo(() => {
    if (editor.readOnly) return false
    if (isBlocks(selection)) return selection.ids.length > 0
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
      // Con bloques elegidos no hay caret que medir: se mide lo que abarcan.
      const rect = isBlocks(selection) ? boxOf(surfaceOf(), selection.ids) : caretRect()
      if (rect) setAnchor({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height })
    })
    return () => cancelAnimationFrame(frame)
  }, [visible, selection, surfaceOf])

  const close = useCallback(() => setPanel('none'), [])

  /**
   * Mod+K abre el panel del link. Va acá y no en el keymap del motor porque lo que abre es un
   * panel de esta barra: los comandos con nombre son para lo que cambia el documento.
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
          // El nombre dice qué hace y en qué está: "Texto" solo, leído en voz alta, es un botón
          // llamado Texto y no un botón para convertir.
          aria-label={`Convertir en: ${nombreDelTipo(editor)}`}
        >
          {nombreDelTipo(editor)}
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

/** Lo que abarcan los bloques elegidos, para colgar la barra arriba de todo eso. */
function boxOf(surface: HTMLElement | null, ids: readonly string[]): DOMRect | null {
  if (!surface) return null
  const cajas = ids
    .map((id) => surface.querySelector(`[${BLOCK_ATTR}="${cssId(id)}"]`)?.getBoundingClientRect())
    .filter((r): r is DOMRect => Boolean(r?.height))
  if (cajas.length === 0) return null
  const top = Math.min(...cajas.map((r) => r.top))
  const left = Math.min(...cajas.map((r) => r.left))
  const right = Math.max(...cajas.map((r) => r.right))
  const bottom = Math.max(...cajas.map((r) => r.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

const cssId = (id: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&'))

/**
 * El tipo que muestra el botón de convertir, o nada si lo elegido tiene varios.
 *
 * Miraba sólo una punta, y `setBlockType` cambia todos los bloques que toca la selección: el rótulo
 * decía "Texto" y el botón convertía cinco títulos. Con tipos mezclados no hay un tipo que mostrar,
 * y decirlo es más honesto que elegir uno.
 */
/** Cómo se llama lo elegido, o "Varios" cuando hay tipos mezclados. */
const nombreDelTipo = (editor: ReturnType<typeof useEditor>): string => {
  const tipo = currentType(editor)
  return tipo ? editor.state.schema.specOr(tipo).name : 'Varios'
}

const currentType = (editor: ReturnType<typeof useEditor>): string | undefined => {
  const sel = editor.selection
  if (!sel) return 'paragraph'
  const tocados = selectedBlocks(editor.doc, sel)
  if (tocados.length === 0) return 'paragraph'
  const tipos = new Set(tocados.map((id) => editor.block(id)?.type ?? 'paragraph'))
  return tipos.size === 1 ? [...tipos][0] : undefined
}
