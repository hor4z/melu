/**
 * The toolbox: a panel that floats over the page with every block in it, and you drag one out.
 *
 * The point of it is discoverability. A "/" menu is faster once you know the names, and it is
 * invisible until then; a panel you can see is how someone finds out that a timer, a formula or a
 * balance exists at all. So both are here and they do the same thing through the same commands.
 *
 * It can be moved and collapsed, and it remembers neither: where a panel sits is not part of an
 * activity, and reopening it in the corner it always opens in beats reopening it wherever it was
 * left three weeks ago.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { BlockSpec } from '../core/schema.ts'
import { useEditor } from '../react/hooks.ts'
import { Icon, hasIcon } from '../react/icons.tsx'
import { blockIdOf, elementAtPoint } from '../react/dom.ts'

export type ToolboxProps = {
  /** Where it opens, in pixels from the top right of the surface. */
  initial?: { top: number; right: number }
  /** Commands to run instead of a plain insert, per type. */
  extras?: Record<string, { command: string; args?: unknown }>
  title?: string
}

const SPECIAL: Record<string, { command: string; args?: unknown }> = {
  table: { command: 'insertTable', args: { rows: 3, cols: 3 } },
  columns: { command: 'insertColumns', args: { count: 2 } },
}

export function Toolbox({ initial = { top: 16, right: 16 }, extras, title = 'Bloques' }: ToolboxProps) {
  const editor = useEditor()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  /**
   * Arranca abierta solo si hay lugar al costado de la columna de texto: un panel que se abre
   * encima de lo que alguien está escribiendo es peor que uno que hay que abrir.
   *
   * Se decide en un efecto y no al crear el estado porque al crearlo la columna todavía no está
   * en el documento (este panel es hijo de la superficie que hay que medir), así que ahí la
   * respuesta sería siempre la misma. `null` es "todavía no se sabe", y se resuelve antes de que
   * el navegador pinte, así que no se ve abrir y cerrar.
   */
  const [open, setOpen] = useState<boolean | null>(null)
  useLayoutEffect(() => {
    if (open !== null) return
    const column = ref.current?.closest('[data-melu-surface]')?.getBoundingClientRect()
    setOpen(column ? window.innerWidth - column.right > 264 : window.innerWidth > 1180)
  }, [open])
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState<BlockSpec | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const commands = useMemo(() => ({ ...SPECIAL, ...extras }), [extras])

  const groups = useMemo(() => {
    if (query.trim() === '') return editor.state.schema.groups
    const hits = editor.state.schema.search(query, 30)
    return hits.length ? [{ group: 'Resultados', items: hits }] : []
  }, [query, editor])

  /** Mover el panel: se arrastra de su barra de título. */
  const startMove = useCallback((e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    const box = el.getBoundingClientRect()
    const parent = el.offsetParent as HTMLElement | null
    const parentBox = parent?.getBoundingClientRect() ?? { top: 0, left: 0 }
    const dx = e.clientX - box.left
    const dy = e.clientY - box.top
    const move = (ev: PointerEvent) => {
      setPos({ top: ev.clientY - dy - parentBox.top, left: ev.clientX - dx - parentBox.left })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [])

  const insert = useCallback(
    (spec: BlockSpec, target?: string) => {
      const special = commands[spec.type]
      editor.exec((ctx) => {
        if (special) {
          const cmd = editor.commandOf(special.command)
          return cmd ? cmd(ctx, special.args as never) : false
        }
        const cmd = editor.commandOf('insertBlock')!
        return cmd(ctx, { type: spec.type, ...(target ? { target, at: 'after' } : { at: 'end' }) } as never)
      })
    },
    [editor, commands],
  )

  /**
   * Dragging a tool onto the page. The block is not created until the pointer is let go, and it
   * lands after whatever block it was dropped on, so it goes where it looked like it would go.
   */
  const startDragTool = useCallback(
    (spec: BlockSpec) => (e: React.PointerEvent) => {
      e.preventDefault()
      setDragging(spec)
      const ghost = document.createElement('div')
      ghost.className = 'melu-tool-ghost'
      ghost.textContent = spec.name
      document.body.append(ghost)
      const place = (ev: PointerEvent | React.PointerEvent) => {
        ghost.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 8}px)`
      }
      place(e)
      let over: string | null = null
      const move = (ev: PointerEvent) => {
        place(ev)
        const el = elementAtPoint(ev.clientX, ev.clientY)
        const id = el ? blockIdOf(el) : null
        if (id !== over) {
          document.querySelectorAll('[data-melu-drop-hint]').forEach((n) => n.removeAttribute('data-melu-drop-hint'))
          over = id
          if (id) {
            const target = document.querySelector(`[data-melu-block="${cssId(id)}"]`)
            target?.setAttribute('data-melu-drop-hint', 'true')
          }
        }
      }
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        ghost.remove()
        document.querySelectorAll('[data-melu-drop-hint]').forEach((n) => n.removeAttribute('data-melu-drop-hint'))
        setDragging(null)
        const el = elementAtPoint(ev.clientX, ev.clientY)
        // Soltar fuera de la página no inserta nada: cancelar un arrastre tiene que ser posible.
        // Sin geometría tampoco: un click ya inserta, y no hay que adivinar dónde cayó.
        if (!el?.closest('[data-melu-surface]')) return
        insert(spec, blockIdOf(el) ?? undefined)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [insert],
  )

  const style = pos ? { top: pos.top, left: pos.left, right: 'auto' } : { top: initial.top, right: initial.right }

  return (
    <div ref={ref} className="melu-toolbox" style={style} data-open={open === true} data-melu-skip="true">
      <div className="melu-toolbox-bar" onPointerDown={startMove}>
        <Icon name="drag" size={13} className="melu-toolbox-move" />
        <span className="melu-toolbox-title">{title}</span>
        <button
          type="button"
          className="melu-ghost"
          aria-label={open ? 'Replegar' : 'Desplegar'}
          aria-expanded={open === true}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'plus'} size={14} />
        </button>
      </div>

      {open === true ? (
        <div className="melu-toolbox-body">
          <label className="melu-toolbox-search">
            <Icon name="search" size={14} />
            <input
              value={query}
              placeholder="Buscar un bloque"
              onChange={(e) => setQuery(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </label>

          {groups.length === 0 ? <div className="melu-menu-empty">No hay nada que se llame así</div> : null}

          {groups.map((group) => (
            <div key={group.group} className="melu-toolbox-group">
              <div className="melu-menu-title">{group.group}</div>
              <div className="melu-toolbox-grid">
                {group.items.map((spec) => (
                  <button
                    key={spec.type}
                    type="button"
                    className="melu-tool"
                    title={spec.hint ?? spec.name}
                    data-dragging={dragging?.type === spec.type || undefined}
                    onPointerDown={startDragTool(spec)}
                    onClick={() => insert(spec)}
                  >
                    <Icon name={hasIcon(spec.icon) ? spec.icon : 'text'} size={18} />
                    <span>{spec.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="melu-toolbox-foot">
            Arrastralos a la página, o escribí <kbd>/</kbd> donde quieras uno.
          </p>
        </div>
      ) : null}
    </div>
  )
}

const cssId = (id: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&'))
