/**
 * La tabla: filas, columnas y el rectángulo.
 *
 * Los comandos que la editan no tenían ningún test, y son los que más fácil dejan un documento que
 * no se puede dibujar: una fila más corta que las otras, una tabla sin filas, una columna que se
 * borró en la mitad de las filas. El normalizador tapa parte de eso, y lo que tapa también se
 * prueba acá, porque taparlo en silencio es la otra forma de que un bug viva años.
 */

import { describe, expect, it } from 'vitest'
import { childrenOf } from '../core/doc.ts'
import { tableWidth } from './layout.ts'
import { at, doc as md, ids, makeEditor, sketch, textAt, typeAt } from '../test/engine.ts'

/** Una tabla de dos por tres, con el texto en las celdas para poder seguirlas. */
const tabla = () => makeEditor(md('| a | b | c |', '| --- | --- | --- |', '| d | e | f |'))

const laTabla = (e: ReturnType<typeof tabla>) => ids(e).find((id) => e.block(id)?.type === 'table')!
const celdas = (e: ReturnType<typeof tabla>) =>
  ids(e)
    .filter((id) => e.block(id)?.type === 'table_cell')
    .map((id) => textAt(e, ids(e).indexOf(id)))
const filas = (e: ReturnType<typeof tabla>) => childrenOf(e.doc, laTabla(e)).length

describe('la forma de una tabla', () => {
  it('se lee como filas de celdas, y el ancho es cuántas hay en la primera', () => {
    const e = tabla()
    expect(filas(e)).toBe(2)
    expect(tableWidth(e.doc, laTabla(e))).toBe(3)
    expect(celdas(e)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('una fila corta se rellena sola: una tabla siempre es un rectángulo', () => {
    const e = tabla()
    const primeraFila = childrenOf(e.doc, laTabla(e))[0]!
    e.exec((ctx) => {
      ctx.tr.remove(childrenOf(ctx.tr.doc, primeraFila)[2]!)
      return true
    })
    // El normalizador la vuelve a completar en la misma transacción.
    expect(tableWidth(e.doc, laTabla(e))).toBe(3)
    expect(childrenOf(e.doc, primeraFila)).toHaveLength(3)
  })
})

describe('convertir un párrafo en tabla', () => {
  it('no lo borra: la tabla llega con sus filas puestas', () => {
    const e = makeEditor(md('El patio'))
    expect(e.run('setBlockType', { type: 'table', id: at(e, 0) })).toBe(true)
    // Sin filas, el normalizador barría la tabla en la misma transacción y el párrafo se iba con ella.
    expect(typeAt(e, 0)).toBe('table')
    expect(tableWidth(e.doc, laTabla(e))).toBeGreaterThan(0)
  })

  it('lo que estaba escrito se muda a la primera celda, en vez de perderse', () => {
    const e = makeEditor(md('El patio'))
    e.run('setBlockType', { type: 'table', id: at(e, 0) })
    expect(celdas(e)[0]).toBe('El patio')
  })

  it('el caret queda adentro, listo para llenar la tabla', () => {
    const e = makeEditor(md('El patio'))
    e.run('setBlockType', { type: 'table', id: at(e, 0) })
    const sel = e.selection
    expect(sel?.kind).toBe('text')
    expect(typeAt(e, ids(e).indexOf((sel as { head: { block: string } }).head.block))).toBe('table_cell')
  })

  it('una tabla insertada a secas, como la pediría un agente, es una tabla usable', () => {
    const e = makeEditor(md('El patio'))
    expect(e.run('insertBlock', { type: 'table' })).toBe(true)
    expect(tableWidth(e.doc, laTabla(e))).toBe(3)
    expect(filas(e)).toBe(3)
  })

  it('unas columnas insertadas a secas traen sus dos columnas', () => {
    const e = makeEditor(md('El patio'))
    e.run('insertBlock', { type: 'columns' })
    const armado = ids(e).find((id) => e.block(id)?.type === 'columns')!
    expect(childrenOf(e.doc, armado)).toHaveLength(2)
  })
})

describe('agregar', () => {
  it('una fila entra con todas sus celdas', () => {
    const e = tabla()
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('addRow', { id: celda })).toBe(true)
    expect(filas(e)).toBe(3)
    expect(celdas(e)).toHaveLength(9)
  })

  it('una fila se puede agregar arriba, y queda arriba', () => {
    const e = tabla()
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    e.run('addRow', { id: celda, where: 'before' })
    expect(celdas(e).slice(3)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('una columna se agrega en todas las filas, y no sólo en la que se está tocando', () => {
    const e = tabla()
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('addColumn', { id: celda })).toBe(true)
    expect(tableWidth(e.doc, laTabla(e))).toBe(4)
    expect(celdas(e)).toHaveLength(8)
  })

  it('la columna nueva cae al lado de la que se estaba tocando', () => {
    const e = tabla()
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    e.run('addColumn', { id: celda, where: 'after' })
    expect(celdas(e).slice(0, 4)).toEqual(['a', '', 'b', 'c'])
  })
})

describe('sacar', () => {
  it('una fila se va con sus celdas', () => {
    const e = tabla()
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('removeRow', { id: celda })).toBe(true)
    expect(filas(e)).toBe(1)
    expect(celdas(e)).toEqual(['d', 'e', 'f'])
  })

  it('la última fila no se puede sacar: una tabla sin filas es un hueco, no una tabla', () => {
    const e = makeEditor(md('| a |', '| --- |'))
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('removeRow', { id: celda })).toBe(false)
    expect(filas(e)).toBe(1)
  })

  it('una columna se saca de todas las filas', () => {
    const e = tabla()
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('removeColumn', { id: celda })).toBe(true)
    expect(tableWidth(e.doc, laTabla(e))).toBe(2)
    expect(celdas(e)).toEqual(['b', 'c', 'e', 'f'])
  })

  it('la última columna tampoco se puede sacar', () => {
    const e = makeEditor(md('| a |', '| --- |', '| b |'))
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('removeColumn', { id: celda })).toBe(false)
  })
})

describe('moverse por la tabla', () => {
  it('Tab va a la celda siguiente, en el orden en que se leen', () => {
    const e = tabla()
    const primera = ids(e).findIndex((id) => e.block(id)?.type === 'table_cell')
    e.setSelection({ kind: 'text', anchor: { block: at(e, primera), offset: 0 }, head: { block: at(e, primera), offset: 0 } })
    expect(e.handleKey({ key: 'Tab', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe(true)
    expect(typeAt(e, primera + 1)).toBe('table_cell')
  })

  it('Tab en la última celda hace una fila más, en lugar de escaparse de la tabla', () => {
    const e = tabla()
    const posiciones = ids(e).map((id, i) => (e.block(id)?.type === 'table_cell' ? i : -1)).filter((i) => i >= 0)
    const ultima = posiciones[posiciones.length - 1]!
    e.setSelection({ kind: 'text', anchor: { block: at(e, ultima), offset: 0 }, head: { block: at(e, ultima), offset: 0 } })
    e.handleKey({ key: 'Tab', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })
    expect(filas(e)).toBe(3)
  })
})

describe('las columnas de un armado', () => {
  it('un armado de una sola columna devuelve su contenido a la página', () => {
    const e = makeEditor([
      {
        type: 'columns',
        children: [{ type: 'column', children: [{ type: 'paragraph', text: [{ text: 'adentro' }] }] }],
      },
    ])
    // Un armado de una columna no es un armado: el normalizador lo deshace.
    expect(sketch(e)).toEqual(['paragraph: adentro'])
  })

  it('una columna vacía se queda con un párrafo, porque si no no hay dónde clickear', () => {
    const e = makeEditor([
      {
        type: 'columns',
        children: [
          { type: 'column', children: [{ type: 'paragraph', text: [{ text: 'uno' }] }] },
          { type: 'column', children: [] },
        ],
      },
    ])
    const segunda = childrenOf(e.doc, ids(e).find((id) => e.block(id)?.type === 'columns')!)[1]!
    expect(childrenOf(e.doc, segunda)).toHaveLength(1)
  })
})
