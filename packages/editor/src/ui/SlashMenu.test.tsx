// El menú que se abre al escribir una barra.

import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { plain } from '../core/index.ts'
import { blocks, mount } from '../test/view.tsx'

describe('el menú de la barra', () => {
  it('escribir una barra abre el menú, y filtra con lo que sigue', async () => {
    const user = userEvent.setup()
    mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, '/tabl')
    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: 'Insertar un bloque' })).toBeInTheDocument()
    })
    const opciones = screen.getAllByRole('option').map((el) => el.textContent)
    expect(opciones.join(' ')).toContain('Tabla')
  })

  it('Escape lo cierra y deja lo tecleado donde estaba', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, '/tabl')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeInTheDocument())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(plain(editor.block(editor.doc.blocks[editor.doc.root]!.children[0]!)?.text)).toBe('/tabl')
  })

  it('elegir un bloque lo inserta y se lleva la consulta', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, '/destac')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeInTheDocument())
    await user.click(screen.getAllByRole('option')[0]!)
    await waitFor(() => {
      const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
      expect(tipos).toContain('callout')
    })
    for (const id of editor.doc.blocks[editor.doc.root]!.children) {
      expect(plain(editor.block(id)?.text)).not.toContain('/')
    }
  })

  it('una barra en el medio de una palabra no abre nada', async () => {
    const user = userEvent.setup()
    mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, 'esto y/o aquello')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
