// El panel de bloques.

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mount } from '../test/view.tsx'

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
