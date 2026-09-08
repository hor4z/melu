// La costura con el DOM: que lo que el navegador escribe llegue al modelo, que lo que el modelo
// cambia llegue a la pantalla, y que el caret vaya donde el modelo dice.

import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { plain } from '../core/index.ts'
import { blocks, caretTo, mount } from '../test/view.tsx'

describe('escribir', () => {
  it('lo que se teclea llega al modelo', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, 'Medir el patio')
    expect(plain(editor.block(editor.doc.blocks[editor.doc.root]!.children[0]!)?.text)).toBe('Medir el patio')
  })

  it('Enter abre otro bloque y deja el caret ahí', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Primero')
    caretTo(editor, 0, 7)
    await user.keyboard('{Enter}')
    expect(editor.doc.blocks[editor.doc.root]!.children).toHaveLength(2)
    const segundo = editor.doc.blocks[editor.doc.root]!.children[1]!
    expect(editor.selection).toMatchObject({ head: { block: segundo, offset: 0 } })
  })

  it('lo que se escribe después de Enter va al bloque nuevo, no al anterior', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Primero')
    caretTo(editor, 0, 7)
    await user.keyboard('{Enter}')
    await user.keyboard('Segundo')
    const ids = editor.doc.blocks[editor.doc.root]!.children
    expect(ids.map((id) => plain(editor.block(id)?.text))).toEqual(['Primero', 'Segundo'])
  })

  it('un cambio del modelo se ve en la pantalla', () => {
    const { editor } = mount('Primero')
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    act(() => {
      editor.exec((ctx) => {
        ctx.tr.setText(id, [{ text: 'Cambiado desde afuera' }])
        return true
      })
    })
    expect(blocks()[0]).toHaveTextContent('Cambiado desde afuera')
  })

  it('el formato se dibuja con la clase que le toca', () => {
    mount('Con **negrita** y `código`')
    const negrita = blocks()[0]!.querySelector('.melu-b')
    const codigo = blocks()[0]!.querySelector('.melu-code')
    expect(negrita).toHaveTextContent('negrita')
    expect(codigo).toHaveTextContent('código')
  })

  it('cada run lleva anotadas sus marcas, que es lo que hace que escribir adentro las herede', () => {
    mount('Con **negrita**')
    const runs = [...blocks()[0]!.children]
    expect(runs.map((el) => el.getAttribute('data-melu-marks'))).toEqual(['[]', '[{"type":"bold"}]'])
  })

  it('tildar un checklist cambia sus props', async () => {
    const user = userEvent.setup()
    const { editor } = mount('- [ ] Traer la cinta')
    await user.click(screen.getByRole('checkbox'))
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    expect(editor.block(id)!.props).toMatchObject({ checked: true })
  })
})

describe('el caret', () => {
  it('el modelo lo manda: apuntar a un bloque lleva el caret ahí', () => {
    const { editor } = mount('uno\n\ndos')
    const segundo = editor.doc.blocks[editor.doc.root]!.children[1]!
    act(() => {
      blocks()[0]!.focus()
      editor.run('focusBlock', { id: segundo, at: 'end' })
    })
    // El foco es de la superficie, que es la región editable: no hay un foco por bloque que
    // mirar. Lo que se mueve es el caret.
    const sel = document.getSelection()!
    expect(blocks()[1]!.contains(sel.focusNode)).toBe(true)
    expect(sel.focusOffset).toBe(3)
  })

  it('sin foco adentro del editor, el modelo no se lo roba', () => {
    const { editor } = mount('uno\n\ndos')
    const afuera = document.createElement('input')
    document.body.append(afuera)
    afuera.focus()
    act(() => {
      editor.run('focusBlock', { id: editor.doc.blocks[editor.doc.root]!.children[1]!, at: 'end' })
    })
    expect(document.activeElement).toBe(afuera)
    afuera.remove()
  })
})
