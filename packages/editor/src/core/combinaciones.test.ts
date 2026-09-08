/**
 * Los tipos mezclados entre sí, que es como queda un documento de verdad.
 *
 * Cada tipo está probado solo, y solo anda. Lo que nadie había probado es lo que pasa cuando se
 * tocan: una tabla adentro de una lista, un rango que arranca en un párrafo y termina pasando por
 * una imagen, Backspace pegado a una tabla, Tab sobre unas columnas. Ahí es donde un comando
 * escrito pensando en párrafos hace algo que nadie quiso.
 */

import { describe, expect, it } from 'vitest'
import { childrenOf } from './doc.ts'
import {
  at,
  caretAt,
  doc as md,
  ids,
  makeFullEditor,
  press,
  selectBlocks,
  selectRange,
  sketch,
  textAt,
  typeAt,
} from '../test/engine.ts'

/** Una tabla chica, para meterla adentro de otras cosas. */
const tabla = (texto = 'a') => ({
  type: 'table',
  children: [{ type: 'table_row', children: [{ type: 'table_cell', text: [{ text: texto }] }] }],
})

describe('lo que puede vivir adentro de qué', () => {
  it('una tabla adentro de un ítem de lista se queda ahí', () => {
    const e = makeFullEditor([
      { type: 'bulleted_list', text: [{ text: 'medir' }], children: [tabla()] },
      { type: 'paragraph', text: [{ text: 'después' }] },
    ])
    expect(sketch(e)).toEqual([
      'bulleted_list: medir',
      '  table',
      '    table_row',
      '      table_cell: a',
      'paragraph: después',
    ])
  })

  it('un párrafo suelto adentro de una fila no se queda: una fila sólo tiene celdas', () => {
    const e = makeFullEditor([
      { type: 'table', children: [{ type: 'table_row', children: [{ type: 'table_cell', text: [{ text: 'a' }] }] }] },
    ])
    const fila = ids(e).find((id) => e.block(id)?.type === 'table_row')!
    e.exec((ctx) => {
      ctx.tr.append(fila, { type: 'paragraph', text: [{ text: 'colado' }] })
      return true
    })
    // El normalizador lo saca en la misma transacción: si no, la tabla no se puede dibujar.
    expect(childrenOf(e.doc, fila).every((id) => e.block(id)?.type === 'table_cell')).toBe(true)
  })

  it('un desplegable puede tener adentro cualquier cosa, incluida una tabla', () => {
    const e = makeFullEditor([{ type: 'toggle', text: [{ text: 'ver' }], children: [tabla()] }])
    expect(sketch(e)[1]).toBe('  table')
  })

  it('unas columnas con una tabla en cada lado quedan como se armaron', () => {
    const e = makeFullEditor([
      {
        type: 'columns',
        children: [
          { type: 'column', children: [tabla('izq')] },
          { type: 'column', children: [tabla('der')] },
        ],
      },
    ])
    expect(sketch(e).filter((l) => l.includes('table_cell'))).toHaveLength(2)
  })
})

describe('anidar y desanidar sobre cosas que no son párrafos', () => {
  it('Tab sobre un bloque que no acepta hijos no lo mete adentro', () => {
    const e = makeFullEditor([
      { type: 'divider' },
      { type: 'paragraph', text: [{ text: 'abajo' }] },
    ])
    caretAt(e, 1, 0)
    press(e, 'Tab')
    // Un separador no puede tener hijos: el párrafo se queda donde estaba.
    expect(sketch(e)).toEqual(['divider', 'paragraph: abajo'])
  })

  it('Tab adentro de una celda no anida: en una tabla esa tecla es moverse', () => {
    const e = makeFullEditor([
      {
        type: 'table',
        children: [
          {
            type: 'table_row',
            children: [
              { type: 'table_cell', text: [{ text: 'a' }] },
              { type: 'table_cell', text: [{ text: 'b' }] },
            ],
          },
        ],
      },
    ])
    const primera = ids(e).findIndex((id) => e.block(id)?.type === 'table_cell')
    caretAt(e, primera, 1)
    press(e, 'Tab')
    expect(typeAt(e, primera)).toBe('table_cell')
    expect(childrenOf(e.doc, at(e, primera))).toHaveLength(0)
  })

  it('un ítem con una tabla adentro se anida con su tabla', () => {
    const e = makeFullEditor([
      { type: 'bulleted_list', text: [{ text: 'uno' }] },
      { type: 'bulleted_list', text: [{ text: 'dos' }], children: [tabla()] },
    ])
    caretAt(e, 1, 0)
    press(e, 'Tab')
    expect(sketch(e)).toEqual([
      'bulleted_list: uno',
      '  bulleted_list: dos',
      '    table',
      '      table_row',
      '        table_cell: a',
    ])
  })
})

describe('borrar un rango que pasa por bloques sin texto', () => {
  it('de un párrafo a otro pasando por una imagen se lleva la imagen', () => {
    const e = makeFullEditor([
      { type: 'paragraph', text: [{ text: 'antes' }] },
      { type: 'image', props: { src: 'https://x.ar/p.png' } },
      { type: 'paragraph', text: [{ text: 'después' }] },
    ])
    selectRange(e, [0, 2], [2, 3])
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph: anpués'])
  })

  it('de un párrafo a otro pasando por un separador, lo mismo', () => {
    const e = makeFullEditor(md('antes', '---', 'después'))
    selectRange(e, [0, 5], [2, 0])
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph: antesdespués'])
  })

  it('un rango que pasa por una tabla se lleva la tabla entera, y no media', () => {
    const e = makeFullEditor([
      { type: 'paragraph', text: [{ text: 'antes' }] },
      tabla(),
      { type: 'paragraph', text: [{ text: 'después' }] },
    ])
    selectRange(e, [0, 5], [ids(e).length - 1, 7])
    e.run('deleteSelection')
    expect(sketch(e).some((l) => l.includes('table'))).toBe(false)
  })
})

describe('Backspace en las juntas raras', () => {
  it('al principio del párrafo que sigue a una tabla, la tabla no se rompe', () => {
    const e = makeFullEditor([tabla(), { type: 'paragraph', text: [{ text: 'abajo' }] }])
    const ultimo = ids(e).length - 1
    caretAt(e, ultimo, 0)
    press(e, 'Backspace')
    // Lo que no puede pasar es que el texto termine adentro de una celda sin que nadie lo pidiera,
    // ni que la tabla quede a medio armar.
    expect(sketch(e).filter((l) => l.trim().startsWith('table_cell'))).toHaveLength(1)
  })

  it('al principio del párrafo que sigue a una imagen, la imagen se elige antes de borrarse', () => {
    const e = makeFullEditor([
      { type: 'image', props: { src: 'https://x.ar/p.png' } },
      { type: 'paragraph', text: [{ text: 'abajo' }] },
    ])
    caretAt(e, 1, 0)
    press(e, 'Backspace')
    // La primera vez se ve qué se está por borrar, y recién la segunda se borra. Una imagen que
    // desaparece de un teclazo, sin haberla visto elegida, es la peor forma de perder algo.
    expect(e.selection).toEqual({ kind: 'blocks', ids: [at(e, 0)], anchor: at(e, 0) })
    expect(sketch(e)).toEqual(['image', 'paragraph: abajo'])
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['paragraph: abajo'])
  })

  it('con una imagen elegida, Backspace se la lleva y deja dónde escribir', () => {
    const e = makeFullEditor([
      { type: 'paragraph', text: [{ text: 'arriba' }] },
      { type: 'image', props: { src: 'https://x.ar/p.png' } },
    ])
    selectBlocks(e, 1)
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['paragraph: arriba'])
    expect(e.selection?.kind).toBe('text')
  })
})

describe('convertir entre familias', () => {
  it('un ítem de lista con hijos convertido en título se queda con sus hijos', () => {
    const e = makeFullEditor([
      {
        type: 'bulleted_list',
        text: [{ text: 'medir' }],
        children: [{ type: 'bulleted_list', text: [{ text: 'el largo' }] }],
      },
    ])
    e.run('setBlockType', { type: 'heading_2', id: at(e, 0) })
    expect(sketch(e)).toEqual(['heading_2: medir', '  bulleted_list: el largo'])
  })

  it('un párrafo con texto convertido en imagen pierde el texto, porque una imagen no tiene', () => {
    const e = makeFullEditor(md('una foto'))
    e.run('setBlockType', { type: 'image', id: at(e, 0) })
    expect(typeAt(e, 0)).toBe('image')
    expect(textAt(e, 0)).toBe('')
  })

  it('una pregunta convertida en párrafo deja de tener opciones', () => {
    const e = makeFullEditor([
      { type: 'choice', text: [{ text: '¿Cuánto mide?' }], props: { options: [[{ text: 'doce' }]], correct: 0 } },
    ])
    e.run('setBlockType', { type: 'paragraph', id: at(e, 0) })
    expect(typeAt(e, 0)).toBe('paragraph')
    expect(textAt(e, 0)).toBe('¿Cuánto mide?')
    expect(e.block(at(e, 0))!.props?.options).toBeUndefined()
  })
})

describe('convertir donde no se puede', () => {
  it('una celda no se convierte en lista: la fila sólo tiene celdas, y la celda se iba del documento', () => {
    const e = makeFullEditor(md('| a | b |', '| --- | --- |', '| c | d |'))
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    const antes = sketch(e)
    expect(e.run('setBlockType', { type: 'bulleted_list', id: celda })).toBe(false)
    expect(sketch(e)).toEqual(antes)
  })

  it('una columna tampoco se convierte en otra cosa', () => {
    const e = makeFullEditor([
      {
        type: 'columns',
        children: [
          { type: 'column', children: [{ type: 'paragraph', text: [{ text: 'izq' }] }] },
          { type: 'column', children: [{ type: 'paragraph', text: [{ text: 'der' }] }] },
        ],
      },
    ])
    const columna = ids(e).find((id) => e.block(id)?.type === 'column')!
    expect(e.run('setBlockType', { type: 'quote', id: columna })).toBe(false)
  })

  it('pero adentro de una celda el texto se convierte como en cualquier lado', () => {
    const e = makeFullEditor([
      { type: 'columns', children: [
        { type: 'column', children: [{ type: 'paragraph', text: [{ text: 'izq' }] }] },
        { type: 'column', children: [{ type: 'paragraph', text: [{ text: 'der' }] }] },
      ] },
    ])
    const parrafo = ids(e).find((id) => e.block(id)?.type === 'paragraph')!
    expect(e.run('setBlockType', { type: 'bulleted_list', id: parrafo })).toBe(true)
  })
})

describe('mover bloques compuestos', () => {
  it('bajar una tabla la baja entera, con sus filas', () => {
    const e = makeFullEditor([tabla(), { type: 'paragraph', text: [{ text: 'abajo' }] }])
    const laTabla = at(e, 0)
    e.run('moveDown', { id: laTabla })
    expect(sketch(e)).toEqual([
      'paragraph: abajo',
      'table',
      '  table_row',
      '    table_cell: a',
    ])
  })

  it('un ítem con hijos se mueve con sus hijos, y no los deja atrás', () => {
    const e = makeFullEditor([
      { type: 'bulleted_list', text: [{ text: 'uno' }], children: [{ type: 'bulleted_list', text: [{ text: 'hijo' }] }] },
      { type: 'paragraph', text: [{ text: 'abajo' }] },
    ])
    e.run('moveDown', { id: at(e, 0) })
    expect(sketch(e)).toEqual(['paragraph: abajo', 'bulleted_list: uno', '  bulleted_list: hijo'])
  })

  it('una celda no se puede sacar de su fila arrastrándola a la página', () => {
    const e = makeFullEditor([tabla()])
    const celda = ids(e).find((id) => e.block(id)?.type === 'table_cell')!
    expect(e.run('moveBlock', { id: celda, parent: e.doc.root, index: 0 })).toBe(false)
  })
})
