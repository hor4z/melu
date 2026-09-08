// El panel de bloques.

import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mount } from '../test/view.tsx'
import { ids } from '../test/engine.ts'
import { parentOf } from '../core/doc.ts'

describe('la caja de herramientas', () => {
  it('lista todos los bloques por grupo', () => {
    mount('', { toolbox: true })
    // "Básicos" en el DOM: lo que se ve en mayúsculas lo hace el CSS, no el texto.
    expect(screen.getByText('Básicos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imagen/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Emparejar/ })).toBeInTheDocument()
  })

  it('un click inserta el bloque', async () => {
    const user = userEvent.setup()
    const { editor } = mount('', { toolbox: true })
    await user.click(screen.getByRole('button', { name: /Separador/ }))
    const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
    expect(tipos).toContain('divider')
  })

  it('soltar un párrafo sobre una celda no lo mete adentro de la fila', () => {
    const { editor } = mount('| a | b |\n| --- | --- |\n| c | d |', { toolbox: true })
    const celda = ids(editor).find((id) => editor.block(id)!.type === 'table_cell')!
    const el = document.querySelector<HTMLElement>(`[data-melu-block="${celda}"]`)!
    // El elemento bajo el puntero al soltar es el más interno, que sobre una tabla es una celda.
    document.elementFromPoint = () => el
    const boton = screen.getByRole('button', { name: /^Texto/ })
    act(() => {
      boton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 }))
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 40, clientY: 40 }))
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 40, clientY: 40 }))
    })
    // Un párrafo entre las celdas de una fila es un documento roto que ningún normalizador arregla.
    const dentroDeUnaFila = ids(editor).some(
      (id) => editor.block(id)!.type === 'paragraph' && editor.block(parentOf(editor.doc, id) ?? '')?.type === 'table_row',
    )
    expect(dentroDeUnaFila).toBe(false)
  })

  it('un click inserta una sola vez, no dos', async () => {
    const user = userEvent.setup()
    const { editor } = mount('', { toolbox: true })
    const antes = editor.doc.blocks[editor.doc.root]!.children.length
    // El `pointerup` del arrastre y el `click` del botón corrían los dos: cancelar el
    // `pointerdown` no cancela el `click`.
    await user.click(screen.getByRole('button', { name: /Separador/ }))
    const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
    expect(tipos.filter((t) => t === 'divider')).toHaveLength(1)
    expect(editor.doc.blocks[editor.doc.root]!.children).toHaveLength(antes + 1)
  })

  it('la búsqueda filtra', async () => {
    const user = userEvent.setup()
    mount('', { toolbox: true })
    await user.type(screen.getByPlaceholderText('Buscar un bloque'), 'audio')
    expect(screen.getByRole('button', { name: /Audio/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Título 1/ })).toBeNull()
  })
})

/**
 * El asa: el más y el agarre que aparecen al costado del bloque.
 *
 * Todo lo de acá salió de usarlo, no de pensarlo: el asa se pintaba afuera de la superficie y un
 * contenedor con scroll la borraba, entre el bloque y el asa quedaba un hueco que el puntero
 * tenía que cruzar (y al cruzarlo el asa desaparecía, así que el más era imposible de clickear),
 * y en un título quedaba flotando por encima de las letras.
 *
 * jsdom no dibuja, así que la geometría se le pone a mano: cada bloque ocupa una banda de 40px.
 * Es lo que hace que estas afirmaciones sean sobre la geometría y no sobre el DOM.
 */
