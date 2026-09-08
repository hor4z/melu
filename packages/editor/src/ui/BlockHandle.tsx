/**
 * The handle: the plus and the grip that show up next to the block you are pointing at.
 *
 * It is one element that follows the pointer rather than one per block. Rendering a handle inside
 * every block would put two more nodes in the page for each paragraph and, worse, would make each
 * block re-render on hover. This way a page of a thousand blocks has exactly one handle.
 *
 * Three things about it are not obvious and all three were bugs first:
 *
 * **Which block is being pointed at comes from the pointer position, not from the event target.**
 * Asking the event what it hit means that the moment the pointer leaves the text on its way to the
 * handle, it is over nothing, the handle disappears, and it can never be clicked. There is no gap
 * small enough to get away with: the pointer has to cross it. So the block is whichever one's
 * vertical band the pointer is in, anywhere across the surface, and sliding left out of the text
 * keeps pointing at the same block.
 *
 * **The handle lives inside the surface, in a rail reserved for it.** Painting it to the left of
 * the surface works until any ancestor scrolls or clips, and then it is simply gone. Notion keeps
 * its handles in the space beside the page for the same reason.
 *
 * **It is centred on the first line, not on the block.** A block can be six lines tall or hold a
 * whole table; the handle belongs next to where the text starts.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BlockId } from '../core/doc.ts'
import { childrenOf, parentOf } from '../core/doc.ts'
import { plain } from '../core/text.ts'
import { activeBlock } from '../core/selection.ts'
import { useEditor, useSelection } from '../react/hooks.ts'
import { useDragHandle } from '../react/Surface.tsx'
import { BLOCK_ATTR, SKIP, focusSurface } from '../react/dom.ts'
import { Icon, hasIcon, type IconName } from '../react/icons.tsx'
import { Popover } from './Popover.tsx'
import { rectOf, type Anchor } from './float.ts'
import { TONES } from '../plugins/text.ts'

/** Where the handle sits, in coordinates relative to the surface. */
type Spot = { id: BlockId; top: number; left: number }

export function BlockHandle() {
  const editor = useEditor()
  const selection = useSelection()
  const { startDrag, surface: surfaceOf } = useDragHandle()
  const [hover, setHover] = useState<Spot | null>(null)
  const [menu, setMenu] = useState<{ id: BlockId; anchor: Anchor } | null>(null)
  const gripRef = useRef<HTMLButtonElement>(null)
  /** Mientras el menú está abierto el asa no se mueve, aunque el puntero se vaya. */
  const pinned = useRef(false)

  /** Dónde poner el asa para un bloque, o null si ese bloque no la quiere. */
  const spotFor = useCallback(
    (surface: HTMLElement, id: BlockId): Spot | null => {
      const el = surface.querySelector<HTMLElement>(`[${BLOCK_ATTR}="${cssId(id)}"]`)
      if (!el) return null
      const box = surface.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      // Centrada en el primer renglón: un bloque puede medir seis líneas o traer una tabla, y el
      // asa va al lado de donde empieza el texto.
      const line = firstLine(el.querySelector<HTMLElement>('[data-melu-text]') ?? el) ?? {
        top: rect.top,
        height: 24,
      }
      const top = line.top + (line.height - HANDLE) / 2
      return { id, top: top - box.top, left: rect.left - box.left - RAIL }
    },
    [],
  )

  useEffect(() => {
    const surface = surfaceOf()
    if (!surface) return

    /** El último bloque señalado y su banda vertical, para no medir la página en cada pixel. */
    let ultimo: { id: BlockId; top: number; bottom: number } | null = null

    const onMove = (e: PointerEvent) => {
      if (pinned.current || editor.readOnly) return
      // Mientras el puntero siga adentro de la banda del bloque anterior, la respuesta es la misma
      // y no hace falta preguntarla: medir todos los bloques era un layout entero por movimiento
      // del mouse, y en una página larga se nota.
      if (ultimo && e.clientY >= ultimo.top && e.clientY <= ultimo.bottom && editor.block(ultimo.id)) return
      const id = blockUnder(surface, editor, e.clientY)
      ultimo = null
      if (!id) {
        setHover(null)
        return
      }
      const el = surface.querySelector<HTMLElement>(`[${BLOCK_ATTR}="${cssId(id)}"]`)
      const caja = el?.getBoundingClientRect()
      if (caja) ultimo = { id, top: caja.top, bottom: caja.bottom }
      const spot = spotFor(surface, id)
      // Solo se escribe si cambió: si no, cada movimiento del mouse es un render.
      setHover((now) => (now && now.id === spot?.id && now.top === spot.top && now.left === spot.left ? now : spot))
    }

    const onLeave = () => {
      if (!pinned.current) setHover(null)
    }

    surface.addEventListener('pointermove', onMove)
    surface.addEventListener('pointerleave', onLeave)
    return () => {
      surface.removeEventListener('pointermove', onMove)
      surface.removeEventListener('pointerleave', onLeave)
    }
  }, [editor, spotFor, surfaceOf])

  /**
   * Sin el puntero encima, el asa acompaña al caret. Es lo que hace que esté a mano mientras
   * alguien escribe, en lugar de aparecer solo si se acuerda de ir a buscarla con el mouse.
   */
  useEffect(() => {
    if (pinned.current || editor.readOnly) return
    const surface = surfaceOf()
    if (!surface?.contains(document.activeElement)) return
    const id = activeBlock(selection)
    if (!id) return
    const spot = spotFor(surface, id)
    setHover((now) => (now && now.id === spot?.id ? now : spot))
  }, [selection, editor, spotFor, surfaceOf])

  const openMenu = useCallback(() => {
    if (!hover) return
    const el = gripRef.current
    if (!el) return
    pinned.current = true
    editor.run('selectBlock', { id: hover.id })
    setMenu({ id: hover.id, anchor: rectOf(el) })
  }, [hover, editor])

  const closeMenu = useCallback(() => {
    pinned.current = false
    setMenu(null)
  }, [])

  if (!hover || editor.readOnly) return null

  return (
    <>
      <div className="melu-handle" style={{ top: hover.top, left: hover.left }} {...SKIP}>
        <button
          type="button"
          className="melu-handle-btn"
          title="Insertar un bloque abajo"
          aria-label="Insertar un bloque abajo"
          onClick={() => insertBelow(editor, hover.id, surfaceOf)}
        >
          <Icon name="plus" size={16} />
        </button>
        <button
          ref={gripRef}
          type="button"
          className="melu-handle-btn melu-grip"
          title="Arrastrar para mover, click para el menú"
          aria-label="Opciones del bloque"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            // Acá y no en `startDrag`: cancelar la acción por defecto sólo sirve mientras el evento
            // se está despachando, y `startDrag` se llama después, desde un `pointermove`. Sin
            // esto el navegador arranca su propio arrastre del elemento y se lleva el gesto.
            e.preventDefault()
            // Un click abre el menú y un arrastre mueve: se decide por cuánto se movió el puntero.
            const startX = e.clientX
            const startY = e.clientY
            const id = hover.id
            let dragged = false
            const move = (ev: PointerEvent) => {
              if (dragged) return
              if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return
              dragged = true
              cleanup()
              startDrag(id, e)
            }
            const up = () => {
              cleanup()
              if (!dragged) openMenu()
            }
            const cleanup = () => {
              window.removeEventListener('pointermove', move)
              window.removeEventListener('pointerup', up)
            }
            window.addEventListener('pointermove', move)
            window.addEventListener('pointerup', up)
          }}
        >
          <Icon name="grip" size={16} />
        </button>
      </div>

      {menu ? <BlockMenu id={menu.id} anchor={menu.anchor} onClose={closeMenu} /> : null}
    </>
  )
}

/** El alto del asa, y el ancho del canal que se le reserva. Los dos están en el CSS también. */
const HANDLE = 26
const RAIL = 52

/**
 * Dónde está el primer renglón de un bloque, medido sobre el renglón y no sobre la caja.
 *
 * La caja de un título incluye el aire que lleva arriba (`padding-top: 1.2em`), así que alinear
 * contra ella deja el asa flotando 25px por encima de las letras. Un rango sobre el primer
 * carácter da el renglón de verdad. Sin texto, se cae al borde de contenido, que es lo mismo sin
 * el padding.
 */
function firstLine(el: HTMLElement): { top: number; height: number } | null {
  const node = el.firstChild?.firstChild ?? el.firstChild
  if (node?.nodeType === 3 && (node as Text).length > 0) {
    try {
      const range = document.createRange()
      range.setStart(node, 0)
      range.setEnd(node, 1)
      const rect = range.getBoundingClientRect()
      if (rect.height) return { top: rect.top, height: rect.height }
    } catch {
      /* sin layout que consultar: se cae al borde de contenido */
    }
  }
  const cs = getComputedStyle(el)
  const height = parseFloat(cs.lineHeight) || 24
  return { top: el.getBoundingClientRect().top + parseFloat(cs.paddingTop || '0'), height }
}

/**
 * Which block the pointer is pointing at, decided by its vertical position over the whole surface.
 *
 * The innermost one wins, because that is the one being looked at: over a nested list item the
 * handle should move that item, not the whole list. Blocks that cannot be moved (a table cell, a
 * row, a column) are skipped and the pointer resolves to whatever contains them.
 */
function blockUnder(surface: HTMLElement, editor: ReturnType<typeof useEditor>, y: number): BlockId | null {
  let best: { id: BlockId; height: number } | null = null
  for (const el of surface.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}]`)) {
    const id = el.getAttribute(BLOCK_ATTR)
    if (!id) continue
    if (editor.state.schema.specOr(editor.block(id)?.type ?? '').draggable === false) continue
    const rect = el.getBoundingClientRect()
    if (rect.height === 0 || y < rect.top || y > rect.bottom) continue
    if (!best || rect.height < best.height) best = { id, height: rect.height }
  }
  return best?.id ?? null
}

/**
 * Lo que hace el más: un bloque nuevo abajo, con el menú abierto.
 *
 * Sobre un bloque vacío no crea otro vacío: se queda en ese y abre el menú ahí, que es lo que
 * alguien quiso decir al apretarla.
 *
 * El foco se lleva a mano, y hace falta. Un bloque toma el foco cuando el caret entra en él, pero
 * solo si el foco ya estaba adentro del editor: una página montada de fondo no se queda con el
 * teclado. Apretar este botón es lo contrario de eso, es pedirlo, así que acá se pide. Sin esto,
 * quien pasa el mouse por un bloque y aprieta el más sin haber escrito nada antes se queda con un
 * bloque vacío, sin caret y sin menú.
 */
function insertBelow(editor: ReturnType<typeof useEditor>, id: BlockId, surfaceOf: () => HTMLElement | null): void {
  const block = editor.block(id)
  const vacio = block && editor.state.schema.isTextual(block.type) && plain(block.text) === ''
  if (vacio) editor.run('focusBlock', { id, at: 'end' })
  else editor.run('insertBlock', { type: 'paragraph', target: id, at: 'after' })

  // Las dos cosas en el cuadro siguiente, y en este orden. El bloque recién existe en el DOM
  // cuando React lo dibujó, así que buscarlo antes no encuentra nada; y el menú se ubica midiendo
  // dónde está el caret, así que el foco tiene que estar puesto antes de escribir la barra.
  requestAnimationFrame(() => {
    const surface = surfaceOf()
    if (surface) focusSurface(surface)
    if (editor.selection?.kind === 'text') editor.run('insertText', { text: '/' })
  })
}

/** El menú del bloque: convertir, mover, duplicar, pintar y borrar. */
export function BlockMenu({ id, anchor, onClose }: { id: BlockId; anchor: Anchor; onClose: () => void }) {
  const editor = useEditor()
  const block = editor.block(id)
  const [page, setPage] = useState<'main' | 'turn' | 'color'>('main')
  if (!block) return null

  const run = (name: string, args?: unknown) => {
    editor.run(name, args)
    onClose()
  }

  const convertir = (type: string) => run('setBlockType', { type, id })

  const canIndent = Boolean(previousSibling(editor, id))

  return (
    <Popover anchor={anchor} open onClose={onClose} role="menu" aria-label="Opciones del bloque">
      {page === 'main' ? (
        <div className="melu-menu">
          <button type="button" role="menuitem" className="melu-menu-item" onClick={() => setPage('turn')}>
            <span className="melu-menu-icon">
              <Icon name="text" size={16} />
            </span>
            <span className="melu-menu-name">Convertir en</span>
            <Icon name="chevron" size={13} className="melu-menu-more" />
          </button>
          <button type="button" role="menuitem" className="melu-menu-item" onClick={() => setPage('color')}>
            <span className="melu-menu-icon">
              <Icon name="palette" size={16} />
            </span>
            <span className="melu-menu-name">Color</span>
            <Icon name="chevron" size={13} className="melu-menu-more" />
          </button>
          <div className="melu-menu-line" />
          <MenuItem icon="copy" label="Duplicar" hint="Mod+D" onClick={() => run('duplicateBlock', { id })} />
          <MenuItem icon="arrowUp" label="Subir" hint="Mod+Shift+↑" onClick={() => run('moveUp', { id })} />
          <MenuItem icon="arrowDown" label="Bajar" hint="Mod+Shift+↓" onClick={() => run('moveDown', { id })} />
          {canIndent ? <MenuItem icon="indent" label="Anidar" hint="Tab" onClick={() => run('indent', { id })} /> : null}
          {parentOf(editor.doc, id) !== editor.doc.root ? (
            <MenuItem icon="outdent" label="Sacar un nivel" hint="Shift+Tab" onClick={() => run('outdent', { id })} />
          ) : null}
          <div className="melu-menu-line" />
          <MenuItem icon="trash" label="Borrar" danger onClick={() => run('removeBlock', { id })} />
        </div>
      ) : null}

      {page === 'turn' ? (
        <div className="melu-menu melu-menu-scroll">
          {editor.state.schema.groups.map((group) => (
            <div key={group.group} className="melu-menu-group">
              <div className="melu-menu-title">{group.group}</div>
              {group.items.map((spec) => (
                <button
                  key={spec.type}
                  type="button"
                  className="melu-menu-item"
                  role="menuitem"
                  data-active={spec.type === block.type || undefined}
                  onClick={() => convertir(spec.type)}
                >
                  <span className="melu-menu-icon">
                    <Icon name={hasIcon(spec.icon) ? spec.icon : 'text'} size={16} />
                  </span>
                  <span className="melu-menu-name">{spec.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {page === 'color' ? (
        <div className="melu-swatches">
          <div className="melu-menu-title">Color del texto</div>
          <div className="melu-swatch-row">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                className="melu-swatch"
                data-tone={tone}
                aria-label={`Texto ${tone}`}
                onClick={() => run('setBlockProps', { id, props: { color: tone } })}
              >
                A
              </button>
            ))}
          </div>
          <div className="melu-menu-title">Fondo del bloque</div>
          <div className="melu-swatch-row">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                className="melu-swatch melu-swatch-bg"
                data-tone={tone}
                aria-label={`Fondo ${tone}`}
                onClick={() => run('setBlockProps', { id, props: { bg: tone } })}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Popover>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: IconName
  label: string
  hint?: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" role="menuitem" className="melu-menu-item" data-danger={danger || undefined} onClick={onClick}>
      <span className="melu-menu-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="melu-menu-name">{label}</span>
      {hint ? <span className="melu-menu-key">{hint}</span> : null}
    </button>
  )
}

const cssId = (id: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&'))

const previousSibling = (editor: ReturnType<typeof useEditor>, id: BlockId): BlockId | undefined => {
  const parent = parentOf(editor.doc, id)
  if (!parent) return undefined
  const kids = childrenOf(editor.doc, parent)
  const i = kids.indexOf(id)
  return i > 0 ? kids[i - 1] : undefined
}
