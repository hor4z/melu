// La barra de formato: cuándo aparece, y que sus botones no le roben el foco al texto.

import { describe, expect, it } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { caretTo, mount } from '../test/view.tsx'

describe('la barra de formato', () => {
  it('aparece cuando hay algo seleccionado y no antes', async () => {
    const { editor } = mount('Medir el patio')
    expect(screen.queryByRole('toolbar')).toBeNull()
    caretTo(editor, 0, 0, 5)
    await waitFor(() => expect(screen.getByRole('toolbar', { name: 'Formato' })).toBeInTheDocument())
  })

  it('sus botones actúan sobre lo seleccionado sin sacarle el foco al texto', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Medir el patio')
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    caretTo(editor, 0, 0, 5)
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Negrita' }))
    expect(editor.block(id)!.text![0]!.marks).toEqual([{ type: 'bold' }])
    expect(editor.selection).toMatchObject({ anchor: { offset: 0 }, head: { offset: 5 } })
  })

  it('también aparece con bloques elegidos, que es como se selecciona con el mouse', async () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    const ids = editor.doc.blocks[editor.doc.root]!.children
    // Una selección nativa no cruza dos regiones editables, así que arrastrar sobre varios
    // párrafos da bloques elegidos. Sin esto no había forma de pedir negrita con el mouse.
    for (const el of document.querySelectorAll<HTMLElement>('[data-melu-block]')) {
      el.getBoundingClientRect = () => ({ x: 52, y: 0, left: 52, top: 0, width: 720, height: 40, right: 772, bottom: 40, toJSON: () => ({}) }) as DOMRect
    }
    act(() => {
      editor.setSelection({ kind: 'blocks', ids: [ids[0]!, ids[1]!], anchor: ids[0]! })
    })
    await waitFor(() => expect(screen.getByRole('toolbar', { name: 'Formato' })).toBeInTheDocument())
  })

  it('y desde ahí la negrita se aplica a todos los bloques elegidos', async () => {
    const user = userEvent.setup()
    const { editor } = mount('uno\n\ndos')
    const ids = editor.doc.blocks[editor.doc.root]!.children
    for (const el of document.querySelectorAll<HTMLElement>('[data-melu-block]')) {
      el.getBoundingClientRect = () => ({ x: 52, y: 0, left: 52, top: 0, width: 720, height: 40, right: 772, bottom: 40, toJSON: () => ({}) }) as DOMRect
    }
    act(() => {
      editor.setSelection({ kind: 'blocks', ids: [...ids], anchor: ids[0]! })
    })
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Negrita' }))
    for (const id of ids) {
      expect(editor.block(id)!.text![0]!.marks, `el bloque ${id}`).toEqual([{ type: 'bold' }])
    }
  })

  it('Mod+K abre el panel del link, que es el atajo que el botón anuncia', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Medir el patio')
    caretTo(editor, 0, 0, 5)
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeInTheDocument())
    await user.keyboard('{Control>}k{/Control}')
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Link' })).toBeInTheDocument())
  })

  it('el panel del link pone el link sobre lo seleccionado', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Medir el patio')
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    caretTo(editor, 0, 0, 5)
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeInTheDocument())
    await user.keyboard('{Control>}k{/Control}')
    const campo = await screen.findByPlaceholderText('https://')
    // Sin esquema: alguien que escribe "educabot.com" quiere un link, no una ruta relativa.
    await user.type(campo, 'educabot.com{Enter}')
    expect(editor.block(id)!.text![0]!.marks).toEqual([{ type: 'link', value: 'https://educabot.com' }])
  })

  it('dice en qué tipo de bloque está el caret', async () => {
    const { editor } = mount('- una cinta')
    caretTo(editor, 0, 0, 3)
    await waitFor(() => expect(screen.getByRole('button', { name: /Lista/ })).toBeInTheDocument())
  })
})
