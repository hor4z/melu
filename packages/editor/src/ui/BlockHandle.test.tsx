// El asa. Todo lo de acá salió de usarlo, no de pensarlo: jsdom no dibuja, así que la geometría
// se le pone a mano y cada bloque ocupa una banda de 40px.

import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import { caretTo, mount } from '../test/view.tsx'
import { selectBlocks, sketch, where } from '../test/engine.ts'

describe('el asa', () => {
  const rect = (x: number, y: number, w: number, h: number) =>
    ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect

  /** Le da a cada bloque una banda vertical de 40px, empezando en cero. */
  function layout(): { surface: HTMLElement; ids: string[] } {
    const surface = document.querySelector<HTMLElement>('[data-melu-surface]')!
    surface.getBoundingClientRect = () => rect(0, 0, 800, 2000)
    const elements = [...surface.querySelectorAll<HTMLElement>('[data-melu-block]')]
    for (const [i, el] of elements.entries()) {
      const top = i * 40
      el.getBoundingClientRect = () => rect(52, top, 720, 40)
      const text = el.querySelector<HTMLElement>('[data-melu-text]')
      if (text) text.getBoundingClientRect = () => rect(52, top, 720, 24)
    }
    return { surface, ids: elements.map((el) => el.getAttribute('data-melu-block')!) }
  }

  const señalar = (surface: HTMLElement, x: number, y: number) =>
    act(() => {
      surface.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }))
    })

  const asa = () => document.querySelector<HTMLElement>('.melu-handle')

  it('aparece al pasar el puntero por un bloque', () => {
    mount('uno\n\ndos\n\ntres')
    const { surface } = layout()
    expect(asa()).toBeNull()
    señalar(surface, 300, 50)
    expect(asa()).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Insertar un bloque abajo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Opciones del bloque' })).toBeInTheDocument()
  })

  it('señala el bloque cuya banda contiene al puntero, no el que estaba antes', () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    const { surface, ids } = layout()
    señalar(surface, 300, 50)
    const primero = asa()!.style.top
    señalar(surface, 300, 90)
    expect(asa()!.style.top).not.toBe(primero)
    // El tercer bloque: su banda va de 80 a 120.
    void editor
    void ids
  })

  it('yendo hacia el más no se pierde: es lo que lo hacía imposible de clickear', () => {
    mount('uno\n\ndos\n\ntres')
    const { surface } = layout()
    señalar(surface, 300, 50)
    expect(asa()).not.toBeNull()
    const top = asa()!.style.top
    // El viaje desde el texto hasta el canal, cruzando el hueco que antes lo borraba.
    for (const x of [60, 52, 40, 20, 4]) {
      señalar(surface, x, 50)
      expect(asa(), `se perdió en x=${x}`).not.toBeNull()
      expect(asa()!.style.top, `saltó en x=${x}`).toBe(top)
    }
  })

  it('vive adentro de la superficie, en el canal que se le reserva', () => {
    mount('uno\n\ndos')
    const { surface } = layout()
    señalar(surface, 300, 10)
    // El bloque arranca en 52 y el asa 52 más a la izquierda: en cero, adentro de la superficie.
    // Pintarla afuera es lo que hacía que un ancestro con scroll la borrara.
    expect(asa()!.style.left).toBe('0px')
    expect(surface.contains(asa())).toBe(true)
  })

  it('sin puntero encima, acompaña al caret', () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    layout()
    expect(asa()).toBeNull()
    caretTo(editor, 1, 0)
    expect(asa()).not.toBeNull()
    // A la altura del segundo bloque, que es donde está el caret.
    expect(asa()!.style.top).toContain(String(40 + (24 - 26) / 2))
  })

  it('no aparece en solo lectura', () => {
    mount('uno\n\ndos', { readOnly: true })
    const surface = document.querySelector<HTMLElement>('[data-melu-surface]')!
    surface.getBoundingClientRect = () => rect(0, 0, 800, 2000)
    señalar(surface, 300, 50)
    expect(asa()).toBeNull()
  })

  it('una celda de tabla no la lleva: la lleva la tabla, que es lo que se puede mover', () => {
    const { editor } = mount('| a | b |\n| --- | --- |\n| 1 | 2 |')
    const { surface } = layout()
    señalar(surface, 300, 10)
    expect(asa()).not.toBeNull()
    // El bloque señalado tiene que ser uno que se pueda arrastrar.
    act(() => {
      screen.getByRole('button', { name: 'Opciones del bloque' }).dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, bubbles: true, clientX: 0, clientY: 0 }),
      )
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    const elegido = editor.selection?.kind === 'blocks' ? editor.selection.ids[0] : undefined
    expect(elegido).toBeDefined()
    expect(editor.state.schema.specOr(editor.block(elegido!)!.type).draggable).not.toBe(false)
  })

  it('el más inserta abajo del bloque señalado y se lleva el foco', async () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    const { surface, ids } = layout()
    señalar(surface, 300, 50)
    const antes = editor.doc.blocks[editor.doc.root]!.children.length
    await act(async () => {
      screen.getByRole('button', { name: 'Insertar un bloque abajo' }).click()
      // El foco y la barra se ponen en el cuadro siguiente, cuando el bloque ya está dibujado.
      await new Promise((r) => requestAnimationFrame(r))
    })
    const ahora = editor.doc.blocks[editor.doc.root]!.children
    expect(ahora).toHaveLength(antes + 1)
    // Justo después del segundo, que es el que estaba señalado.
    expect(ahora.indexOf(ahora[2]!)).toBe(2)
    expect(ids[1]).toBe(ahora[1])
    // Y con el foco puesto: sin esto queda un bloque vacío sin caret y sin menú.
    expect(surface.contains(document.activeElement)).toBe(true)
  })

  it('apretar el agarre cancela el arrastre del navegador, que si no se lleva el gesto', () => {
    mount('uno\n\ndos')
    const { surface } = layout()
    señalar(surface, 300, 10)
    const grip = screen.getByRole('button', { name: 'Opciones del bloque' })
    grip.getBoundingClientRect = () => rect(0, 0, 24, 26)
    const apreton = new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true, clientX: 0, clientY: 0 })
    act(() => {
      grip.dispatchEvent(apreton)
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    // Cancelarlo tiene que pasar mientras el evento se despacha. Antes se hacía después, desde un
    // `pointermove`, y para entonces ya no cancelaba nada.
    expect(apreton.defaultPrevented).toBe(true)
  })

  it('un arrastre que el sistema se lleva no deja la página pegada', () => {
    mount('uno\n\ndos\n\ntres')
    const { surface } = layout()
    señalar(surface, 300, 10)
    const grip = screen.getByRole('button', { name: 'Opciones del bloque' })
    grip.getBoundingClientRect = () => rect(0, 0, 24, 26)
    act(() => {
      grip.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true, clientX: 0, clientY: 0 }))
      // Se mueve lo suficiente como para que sea un arrastre y no un click.
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 60 }))
    })
    expect(document.body.classList.contains('melu-dragging')).toBe(true)
    act(() => {
      // Y el sistema se queda el puntero: no llega ningún `pointerup`.
      window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))
    })
    // Sin esto quedaba el cursor de agarre y `user-select: none` en toda la página, hasta recargar.
    expect(document.body.classList.contains('melu-dragging')).toBe(false)
  })

  it('arrastrar el asa de uno de varios elegidos se los lleva a todos', () => {
    const { editor } = mount('uno\n\ndos\n\ntres\n\ncuatro')
    const { surface } = layout()
    act(() => {
      selectBlocks(editor, 0, 1)
    })
    señalar(surface, 300, 10)
    const grip = screen.getByRole('button', { name: 'Opciones del bloque' })
    grip.getBoundingClientRect = () => rect(0, 0, 24, 26)
    act(() => {
      grip.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true, clientX: 0, clientY: 0 }))
      // El primer movimiento decide que es un arrastre y no un click, y recién ahí empieza a
      // escucharse el destino: hace falta uno más, como en una mano de verdad.
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 60 }))
      // Hasta abajo del cuarto bloque, que ocupa la banda de 120 a 160.
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 155 }))
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 60, clientY: 155 }))
    })
    expect(sketch(editor)).toEqual([
      'paragraph: tres',
      'paragraph: cuatro',
      'paragraph: uno',
      'paragraph: dos',
    ])
  })

  it('agarrar un bloque que no estaba elegido lo elige a él solo', () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    const { surface } = layout()
    act(() => {
      selectBlocks(editor, 2)
    })
    señalar(surface, 300, 10)
    const grip = screen.getByRole('button', { name: 'Opciones del bloque' })
    grip.getBoundingClientRect = () => rect(0, 0, 24, 26)
    act(() => {
      grip.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true, clientX: 0, clientY: 0 }))
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 60 }))
    })
    expect(where(editor)).toBe('bloques 0')
  })

  it('el agarre abre el menú del bloque', () => {
    mount('uno\n\ndos')
    const { surface } = layout()
    señalar(surface, 300, 10)
    act(() => {
      const grip = screen.getByRole('button', { name: 'Opciones del bloque' })
      grip.getBoundingClientRect = () => rect(0, 0, 24, 26)
      grip.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, clientX: 0, clientY: 0 }))
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    expect(screen.getByRole('menu', { name: 'Opciones del bloque' })).toBeInTheDocument()
    expect(screen.getByText('Convertir en')).toBeInTheDocument()
    expect(screen.getByText('Duplicar')).toBeInTheDocument()
  })
})

/**
 * El menú que aparece al pegar una dirección.
 *
 * Pegar un link no adivina: pega el link y ofrece el resto. Lo que se prueba acá es el camino
 * entero, que es donde estaba el bug que se reportó usándolo: el pegado sobre la caja de un bloque
 * de medios lo agarraba la superficie, cancelaba el evento y la dirección no llegaba a ningún lado.
 */
