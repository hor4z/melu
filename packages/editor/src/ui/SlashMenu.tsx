/**
 * The "/" menu: how a block gets inserted without anybody learning a shortcut.
 *
 * It is opened by typing a slash on an empty line or after a space, and from then on what you
 * type filters it. Two details are the difference between it feeling instant and feeling like a
 * form: the query lives in the block's own text, so it looks like you are just typing, and
 * closing without picking leaves what you typed exactly where it was.
 *
 * The list comes from the schema, so a plugin's block shows up here with no wiring at all.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BlockSpec } from '../core/schema.ts'
import { plain } from '../core/text.ts'
import { isText } from '../core/selection.ts'
import { useEditor, useSelection } from '../react/hooks.ts'
import { caretRect } from '../react/dom.ts'
import { Icon, hasIcon } from '../react/icons.tsx'
import { Popover } from './Popover.tsx'
import { pointAnchor, type Anchor } from './float.ts'

/** How the menu decides what a block insert should do beyond setting the type. */
export type SlashExtras = Record<string, { command: string; args?: unknown }>

/** Los bloques que no se insertan solos: una tabla necesita filas, unas columnas necesitan columnas. */
const SPECIAL: SlashExtras = {
  table: { command: 'insertTable', args: { rows: 3, cols: 3 } },
  columns: { command: 'insertColumns', args: { count: 2 } },
}

export type SlashMenuProps = {
  /** Extra commands per type, merged over the built-in ones. */
  extras?: SlashExtras
  /** How many results to show. */
  limit?: number
}

export function SlashMenu({ extras, limit = 9 }: SlashMenuProps) {
  const editor = useEditor()
  const selection = useSelection()
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [index, setIndex] = useState(0)
  /** Dónde arrancó la barra, para saber qué parte del texto es la consulta. */
  const started = useRef<{ block: string; offset: number } | null>(null)
  const commands = useMemo(() => ({ ...SPECIAL, ...extras }), [extras])

  const close = useCallback(() => {
    setOpen(false)
    started.current = null
  }, [])

  /** El texto escrito después de la barra. */
  const query = useMemo(() => {
    if (!open || !started.current || !isText(selection)) return ''
    if (selection.head.block !== started.current.block) return ''
    const text = plain(editor.block(started.current.block)?.text)
    return text.slice(started.current.offset, selection.head.offset)
  }, [open, selection, editor])

  const results = useMemo(() => (open ? editor.state.schema.search(query, limit) : []), [open, query, editor, limit])

  useEffect(() => {
    setIndex(0)
  }, [query])

  // El ancla sigue al caret: la consulta se escribe y el caret avanza, así que el menú lo sigue.
  useEffect(() => {
    if (!open) return
    const rect = caretRect()
    if (!rect) return
    setAnchor((now) =>
      now && Math.abs(now.left - rect.left) < 1 && Math.abs(now.top - rect.top) < 1
        ? now
        : pointAnchor(rect.left, rect.top, rect.height || 20),
    )
  }, [open, query])

  // La barra se abre al tipearla, no con un atajo: se escucha el texto, no la tecla.
  useEffect(() => {
    const stop = editor.subscribe((change) => {
      if (!change.docChanged) return
      const sel = editor.selection
      if (!isText(sel)) return
      const block = editor.block(sel.head.block)
      if (!block || !editor.state.schema.isTextual(block.type)) return
      const text = plain(block.text)
      const at = sel.head.offset

      if (started.current) {
        // Se cierra si el caret salió de la consulta o si lo que quedó no es una consulta.
        if (sel.head.block !== started.current.block || at < started.current.offset) close()
        else if (text[started.current.offset - 1] !== '/') close()
        return
      }

      if (at === 0 || text[at - 1] !== '/') return
      // Solo al principio de una línea o después de un espacio: una barra en "y/o" no es un menú.
      const before = at >= 2 ? text[at - 2] : undefined
      if (before !== undefined && !/\s/.test(before)) return
      started.current = { block: sel.head.block, offset: at }
      const rect = caretRect()
      setAnchor(rect ? pointAnchor(rect.left, rect.top, rect.height || 20) : null)
      setOpen(true)
    })
    return stop
  }, [editor, close])

  /** Inserta lo elegido y borra la barra y la consulta que la seguía. */
  const pick = useCallback(
    (spec: BlockSpec) => {
      const from = started.current
      if (!from) return
      const special = commands[spec.type]
      close()
      editor.exec((ctx) => {
        const block = ctx.tr.doc.blocks[from.block]
        if (!block) return false
        const text = plain(block.text)
        // Se saca "/consulta" antes de insertar: lo que se tipeó era el menú, no el contenido.
        const cut = from.offset - 1
        const end = Math.min(text.length, from.offset + query.length)
        ctx.tr.setText(from.block, [
          ...(cut > 0 ? [{ text: text.slice(0, cut) }] : []),
          ...(end < text.length ? [{ text: text.slice(end) }] : []),
        ])
        ctx.tr.select({ kind: 'text', anchor: { block: from.block, offset: cut }, head: { block: from.block, offset: cut } })

        if (special) {
          const cmd = editor.commandOf(special.command)
          return cmd ? cmd(ctx, special.args as never) : false
        }
        const insert = editor.commandOf('insertBlock')!
        return insert(ctx, { type: spec.type, target: from.block, at: 'after' } as never)
      })
    },
    [editor, close, query, commands],
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => (results.length ? (i + 1) % results.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const chosen = results[index]
        if (!chosen) return
        e.preventDefault()
        e.stopPropagation()
        pick(chosen)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    },
    [open, results, index, pick, close],
  )

  useEffect(() => {
    if (!open) return
    // En captura, antes que el keymap del editor: con el menú abierto, Enter elige.
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onKeyDown])

  if (!open) return null

  return (
    <Popover anchor={anchor} open onClose={close} role="listbox" aria-label="Insertar un bloque" keepFocus>
      <div className="melu-menu">
        {results.length === 0 ? (
          <div className="melu-menu-empty">
            No hay ningún bloque que se llame <strong>{query}</strong>
          </div>
        ) : (
          groupBy(results).map(([group, items]) => (
            <div key={group} className="melu-menu-group">
              <div className="melu-menu-title">{group}</div>
              {items.map((spec) => {
                const i = results.indexOf(spec)
                return (
                  <button
                    key={spec.type}
                    type="button"
                    role="option"
                    aria-selected={i === index}
                    className="melu-menu-item"
                    data-active={i === index || undefined}
                    onPointerEnter={() => setIndex(i)}
                    onClick={() => pick(spec)}
                  >
                    <span className="melu-menu-icon">
                      {hasIcon(spec.icon) ? <Icon name={spec.icon} size={17} /> : <Icon name="text" size={17} />}
                    </span>
                    <span className="melu-menu-text">
                      <span className="melu-menu-name">{spec.name}</span>
                      {spec.hint ? <span className="melu-menu-hint">{spec.hint}</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>
    </Popover>
  )
}

const groupBy = (specs: readonly BlockSpec[]): [string, BlockSpec[]][] => {
  const out = new Map<string, BlockSpec[]>()
  for (const spec of specs) {
    const key = spec.group ?? 'Otros'
    const list = out.get(key)
    if (list) list.push(spec)
    else out.set(key, [spec])
  }
  return [...out.entries()]
}
