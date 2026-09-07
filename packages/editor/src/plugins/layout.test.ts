// Las tablas y las columnas: la misma tecla en dos plugins, y lo que el normalizador arregla solo.

import { describe, expect, it } from 'vitest'
import { at, caretAt, ids, makeEditor, makeFullEditor, press } from '../test/engine.ts'
import { plain } from '../core/text.ts'

describe('la cadena de bindings', () => {
  it('Tab en una tabla mueve de celda, y afuera anida: la misma tecla, dos plugins', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('insertTable', { rows: 2, cols: 2 })
    const celdas = ids(e).filter((id) => e.block(id)!.type === 'table_cell')
    expect(e.selection?.kind).toBe('text')
    expect(celdas).toHaveLength(4)

    // El caret arranca en la primera celda; Tab lo lleva a la segunda.
    press(e, 'Tab')
    expect(e.selection && e.selection.kind === 'text' ? e.selection.head.block : '').toBe(celdas[1])
  })

  it('Enter en una celda baja de fila en lugar de partir la celda', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('insertTable', { rows: 2, cols: 2 })
    const celdas = ids(e).filter((id) => e.block(id)!.type === 'table_cell')
    press(e, 'Enter')
    expect(e.selection && e.selection.kind === 'text' ? e.selection.head.block : '').toBe(celdas[2])
  })

  it('Tab en la última celda agrega una fila', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('insertTable', { rows: 1, cols: 2 })
    const antes = ids(e).filter((id) => e.block(id)!.type === 'table_row').length
    press(e, 'Tab')
    press(e, 'Tab')
    const despues = ids(e).filter((id) => e.block(id)!.type === 'table_row').length
    expect(despues).toBe(antes + 1)
  })
})

describe('lo que el normalizador arregla solo', () => {
  it('una tabla siempre es rectangular', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('insertTable', { rows: 2, cols: 3 })
    const tabla = ids(e).find((id) => e.block(id)!.type === 'table')!
    const filas = e.block(tabla)!.children
    // Se le saca una celda a mano: el normalizador la repone.
    e.exec((ctx) => {
      ctx.tr.remove(ctx.tr.doc.blocks[filas[0]!]!.children[0]!)
      return true
    })
    for (const fila of e.block(tabla)!.children) {
      expect(e.block(fila)!.children).toHaveLength(3)
    }
  })

  it('un armado de columnas que queda con una sola devuelve su contenido a la página', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.run('insertColumns', { count: 2 })
    const cols = ids(e).find((id) => e.block(id)!.type === 'columns')!
    const segunda = e.block(cols)!.children[1]!
    e.exec((ctx) => {
      ctx.tr.remove(segunda)
      return true
    })
    expect(ids(e).some((id) => e.block(id)!.type === 'columns')).toBe(false)
    expect(ids(e).some((id) => e.block(id)!.type === 'column')).toBe(false)
  })

  it('un separador no se queda con hijos, porque no se ven', () => {
    const e = makeEditor([{ type: 'divider' }, { type: 'paragraph', text: [{ text: 'x' }] }])
    caretAt(e, 1, 0)
    e.exec((ctx) => {
      ctx.tr.move(at(e, 1), at(e, 0), 0)
      return true
    })
    expect(e.block(at(e, 0))!.children).toEqual([])
    expect(plain(e.block(at(e, 1))!.text)).toBe('x')
  })
})
