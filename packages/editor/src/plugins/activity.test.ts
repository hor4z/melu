// Los huecos de un completar salen del texto: las llaves dobles son la fuente de verdad.

import { describe, expect, it } from 'vitest'
import { at, caretAt, makeFullEditor } from '../test/engine.ts'

describe('los huecos de un completar salen del texto', () => {
  it('escribir {{algo}} deja el hueco en las props', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'fill_in' })
    e.run('insertText', { text: 'La capital de Francia es {{París}}' })
    expect(e.block(at(e, 0))!.props!.blanks).toEqual(['París'])
  })

  it('agregar otro hueco actualiza la lista', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'fill_in' })
    e.run('insertText', { text: '{{a}} y {{b}}' })
    expect(e.block(at(e, 0))!.props!.blanks).toEqual(['a', 'b'])
  })

  it('borrar el texto se lleva los huecos', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'fill_in' })
    e.run('insertText', { text: '{{a}}' })
    e.exec((ctx) => {
      ctx.tr.setText(at(e, 0), [])
      return true
    })
    expect(e.block(at(e, 0))!.props!.blanks).toEqual([])
  })
})
