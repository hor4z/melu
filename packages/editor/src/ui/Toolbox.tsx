// El panel de bloques, del que se arrastra uno. Existe por lo que el menú "/" no puede hacer: el
// menú es más rápido una vez que sabés los nombres, y es invisible hasta entonces. Se mueve y se
// repliega, y no recuerda ninguna de las dos: dónde queda un panel no es parte de una actividad.

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
   * Abierta solo si hay lugar al costado de la columna. Se decide en un efecto porque al crear el
   * estado la columna todavía no está en el documento: este panel es hijo de lo que hay que medir.
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

  /** El bloque no se crea hasta soltar, y cae después de aquel sobre el que se soltó. */
  const startDragTool = useCallback(
    (spec: BlockSpec) => (e: React.PointerEvent) => {
      e.preventDefault()
      const desde = { x: e.clientX, y: e.clientY }
      // Un click no es un arrastre. Sin distinguirlos insertaba dos veces: el `pointerup` y
      // después el `click`, porque cancelar el `pointerdown` no cancela el `click`.
      let arrastro = false
      const ghost = document.createElement('div')
      ghost.className = 'melu-tool-ghost'
      ghost.textContent = spec.name
      const place = (ev: PointerEvent | React.PointerEvent) => {
        ghost.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY + 8}px)`
      }
      place(e)
      let over: string | null = null
      const move = (ev: PointerEvent) => {
        if (!arrastro) {
          if (Math.abs(ev.clientX - desde.x) + Math.abs(ev.clientY - desde.y) < 4) return
          arrastro = true
          setDragging(spec)
          document.body.append(ghost)
        }
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
        // Si no se movió, fue un click y lo atiende `onClick`: insertar acá también sería insertar
        // dos veces.
        if (!arrastro) return
        const el = elementAtPoint(ev.clientX, ev.clientY)
        // Soltar fuera de la página no inserta nada: cancelar un arrastre tiene que ser posible.
        // Soltar sobre el propio panel tampoco, aunque el panel esté adentro de la superficie.
        if (!el?.closest('[data-melu-surface]') || el.closest('.melu-toolbox')) return
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
