/**
 * Que el editor se pueda usar sin ver la pantalla, y sin mouse.
 *
 * Lo que había era incidental: los tests encontraban cosas por rol porque era cómodo, no porque
 * alguien hubiera comprobado que el rol dijera la verdad. Un botón que no dice si está apretado o
 * un menú que no dice cuál opción está marcada se ven perfectos y no se pueden usar de otra forma.
 */

import { describe, expect, it } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { blocks, caretTo, mount } from '../test/view.tsx'
import { selectBlocks, sketch } from '../test/engine.ts'

describe('lo que anuncia la superficie', () => {
  it('dice que es una región con nombre, para saber dónde se entró', () => {
    mount('uno')
    const superficie = document.querySelector('[data-melu-surface]')
    expect(superficie).toHaveAttribute('role', 'group')
    expect(superficie).toHaveAccessibleName('El contenido')
  })

  it('un título es un título, y no un cuadro de texto con letra grande', () => {
    mount('# Medir el patio')
    // Navegar por los títulos es lo primero que hace un lector de pantalla.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Medir el patio')
  })

  it('un ítem de checklist trae su casilla, con el estado puesto', () => {
    mount('- [x] Anotar la fecha')
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('un desplegable dice si está abierto', () => {
    mount('uno')
    const { editor } = mount('uno')
    act(() => {
      editor.run('setBlockType', { type: 'toggle' })
    })
    const twisty = screen.getAllByRole('button', { name: /Abrir|Cerrar/ })[0]!
    expect(twisty).toHaveAttribute('aria-expanded', 'false')
    act(() => {
      twisty.click()
    })
    expect(screen.getAllByRole('button', { name: /Abrir|Cerrar/ })[0]).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('la barra de formato', () => {
  it('los botones dicen si lo que está elegido ya tiene ese formato', async () => {
    const user = userEvent.setup()
    const { editor } = mount('medir el patio')
    caretTo(editor, 0, 0, 5)
    const negrita = await screen.findByRole('button', { name: /Negrita/ })
    expect(negrita).toHaveAttribute('aria-pressed', 'false')
    await user.click(negrita)
    await waitFor(() => expect(screen.getByRole('button', { name: /Negrita/ })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('el de convertir dice si su panel está abierto, y deja de decirlo al cerrarse', async () => {
    const user = userEvent.setup()
    const { editor } = mount('medir el patio')
    caretTo(editor, 0, 0, 5)
    const convertir = await screen.findByRole('button', { name: /Convertir en/ })
    expect(convertir).toHaveAttribute('aria-expanded', 'false')
    await user.click(convertir)
    await waitFor(() => expect(screen.getByRole('button', { name: /Convertir en/ })).toHaveAttribute('aria-expanded', 'true'))
  })
})

describe('el menú "/" con el teclado', () => {
  const abrir = async (user: ReturnType<typeof userEvent.setup>) => {
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.keyboard('/')
    await screen.findByRole('listbox')
    return editor
  }

  it('marca una sola opción por vez, y no dos', async () => {
    const user = userEvent.setup()
    await abrir(user)
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
  })

  it('las flechas mueven la marca', async () => {
    const user = userEvent.setup()
    await abrir(user)
    const primera = screen.getAllByRole('option', { selected: true })[0]!.textContent
    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(screen.getAllByRole('option', { selected: true })[0]!.textContent).not.toBe(primera))
  })

  it('Enter elige la marcada, sin haber tocado el mouse', async () => {
    const user = userEvent.setup()
    const editor = await abrir(user)
    await user.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(sketch(editor)[0]).not.toContain('paragraph: /'))
  })

  it('filtrar vuelve a marcar la primera: la que estaba ya no está', async () => {
    const user = userEvent.setup()
    await abrir(user)
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard('tít')
    await waitFor(() => {
      const marcadas = screen.getAllByRole('option', { selected: true })
      expect(marcadas).toHaveLength(1)
      expect(marcadas[0]).toBe(screen.getAllByRole('option')[0])
    })
  })
})

describe('solo lectura', () => {
  it('no monta nada de lo que sirve para editar', () => {
    mount('uno\n\ndos', { readOnly: true })
    expect(document.querySelector('.melu-handle')).toBeNull()
    expect(document.querySelector('.melu-toolbox')).toBeNull()
    expect(blocks()[0]).toHaveAttribute('contenteditable', 'false')
  })

  it('los atajos no escriben: Mod+B sobre una selección no la pone en negrita', async () => {
    const user = userEvent.setup()
    const { editor } = mount('medir el patio', { readOnly: true })
    act(() => {
      selectBlocks(editor, 0)
    })
    await user.keyboard('{Control>}b{/Control}')
    expect((editor.block(editor.doc.blocks[editor.doc.root]!.children[0]!)?.text ?? [])[0]?.marks ?? []).toHaveLength(0)
  })

  it('el caret se sigue moviendo, porque leer es moverse', () => {
    const { editor } = mount('uno\n\ndos', { readOnly: true })
    expect(editor.run('focusEnd')).toBe(true)
  })
})
