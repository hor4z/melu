// El único contenedor flotante, del que cuelgan los cinco menús del editor. No tenía ningún test,
// así que cada uno de ellos confiaba en esto sin que nadie lo hubiera mirado.

import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Popover } from './Popover.tsx'
import type { Anchor } from './float.ts'

const ancla: Anchor = { top: 100, left: 200, right: 300, bottom: 130, width: 100, height: 30 }

/** Un popover montado, con el tamaño puesto a mano: jsdom no dibuja, así que no mide. */
function montar(props: Partial<Parameters<typeof Popover>[0]> = {}) {
  const onClose = vi.fn()
  const view = render(
    <Popover anchor={ancla} open onClose={onClose} aria-label="Un menú" {...props}>
      <button type="button">Una opción</button>
    </Popover>,
  )
  return { onClose, view }
}

describe('el popover', () => {
  it('cerrado no está en la pantalla, y sin ancla tampoco', () => {
    const { view } = montar({ open: false })
    expect(screen.queryByRole('menu')).toBeNull()
    view.rerender(
      <Popover anchor={null} open onClose={() => {}} aria-label="Un menú">
        <button type="button">Una opción</button>
      </Popover>,
    )
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('abierto se anuncia con su rol y su nombre', () => {
    montar()
    expect(screen.getByRole('menu', { name: 'Un menú' })).toBeInTheDocument()
  })

  it('se ubica contra el ancla, debajo suyo', () => {
    montar()
    const pop = screen.getByRole('menu')
    // Sin alto medido cae en el borde de abajo del ancla, que es el respaldo declarado.
    expect(pop.style.top).not.toBe('')
    expect(pop.style.left).not.toBe('')
  })

  it('Escape lo cierra', () => {
    const { onClose } = montar()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('y ahí se queda el Escape: el editor de atrás no tiene que enterarse', () => {
    const deAtras = vi.fn()
    document.addEventListener('keydown', deAtras)
    montar()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    document.removeEventListener('keydown', deAtras)
    // Se escucha en captura y se corta ahí: si no, Escape cerraría el menú y además haría lo suyo.
    expect(deAtras).not.toHaveBeenCalled()
  })

  it('un apretón afuera lo cierra, y uno adentro no', () => {
    const { onClose } = montar()
    act(() => {
      fireEvent.pointerDown(document.body)
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => {
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Una opción' }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('con dismissable en false no lo cierra nada de eso: lo cierra quien lo abrió', () => {
    const { onClose } = montar({ dismissable: false })
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.pointerDown(document.body)
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('con keepFocus, apretarlo no le saca el caret al texto', () => {
    montar({ keepFocus: true })
    const evento = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    act(() => {
      screen.getByRole('menu').dispatchEvent(evento)
    })
    // Cancelar el apretón es lo que deja la selección donde estaba: si no, la barra de formato se
    // queda sin nada que formatear justo cuando le hacen click.
    expect(evento.defaultPrevented).toBe(true)
  })

  it('sin keepFocus no cancela nada: un menú común sí se puede llevar el foco', () => {
    montar()
    const evento = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    act(() => {
      screen.getByRole('menu').dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(false)
  })

  it('se declara como lo que no es texto del documento', () => {
    montar()
    const pop = screen.getByRole('menu')
    expect(pop).toHaveAttribute('data-melu-skip', 'true')
    expect(pop).toHaveAttribute('contenteditable', 'false')
    // Adentro de una región editable, un `contenteditable=false` es arrastrable por defecto.
    expect(pop).toHaveAttribute('draggable', 'false')
  })

  it('deja de escuchar cuando se va: un menú cerrado no puede seguir atajando Escape', () => {
    const { onClose, view } = montar()
    view.unmount()
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
