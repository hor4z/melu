/**
 * Arrastrar un pedazo de texto y soltarlo en otro lado.
 *
 * El gesto lo hace el navegador solo, y hace mal la parte que importa: mueve nodos de un bloque a
 * otro por atrás del modelo. Así que arriba se cancela y el movimiento se hace con un comando, que
 * es lo que se prueba acá. Lo que no se puede probar en jsdom es el gesto (el puntero, el punto
 * donde se suelta): eso está en `e2e/arrastrar.spec.ts`.
 */

import { describe, expect, it } from 'vitest'
import { at, caretAt, doc as md, makeEditor, selectRange, sketch, textAt } from '../test/engine.ts'
import { point } from './selection.ts'

/** Elige un rango y lo suelta en un punto, como lo haría un arrastre. */
const mover = (e: ReturnType<typeof makeEditor>, desde: [number, number], hasta: [number, number], destino: [number, number]) => {
  selectRange(e, desde, hasta)
  return e.run('moveSelection', { to: point(at(e, destino[0]), destino[1]) })
}

describe('adentro de un bloque', () => {
  it('una palabra se va de donde estaba y aparece donde se soltó', () => {
    const e = makeEditor(md('uno dos tres'))
    // "dos " se suelta al principio.
    expect(mover(e, [0, 4], [0, 8], [0, 0])).toBe(true)
    expect(textAt(e, 0)).toBe('dos uno tres')
  })

  it('soltarla más adelante en el mismo bloque cuenta el hueco que dejó', () => {
    const e = makeEditor(md('uno dos tres'))
    // "uno " al final: el destino era el 12, y al sacar cuatro letras es el 8.
    expect(mover(e, [0, 0], [0, 4], [0, 12])).toBe(true)
    expect(textAt(e, 0)).toBe('dos tresuno ')
  })

  it('se lleva el formato puesto, y no el texto pelado', () => {
    const e = makeEditor([{ type: 'paragraph', text: [{ text: 'medir ' }, { text: 'el patio', marks: [{ type: 'bold' }] }] }])
    mover(e, [0, 6], [0, 14], [0, 0])
    const runs = e.block(at(e, 0))!.text!
    expect(runs[0]).toMatchObject({ text: 'el patio', marks: [{ type: 'bold' }] })
  })

  it('soltarla adentro de sí misma no hace nada', () => {
    const e = makeEditor(md('uno dos tres'))
    expect(mover(e, [0, 0], [0, 8], [0, 4])).toBe(false)
    expect(textAt(e, 0)).toBe('uno dos tres')
  })

  it('queda elegido lo que se movió, para verlo donde cayó', () => {
    const e = makeEditor(md('uno dos tres'))
    mover(e, [0, 4], [0, 8], [0, 0])
    // "dos " cayó al principio y queda elegido: se ve qué se movió y se puede volver a arrastrar.
    expect(e.selection).toEqual({
      kind: 'text',
      anchor: { block: at(e, 0), offset: 0 },
      head: { block: at(e, 0), offset: 4 },
    })
  })

  it('y todo el movimiento se deshace de una sola vez', () => {
    const e = makeEditor(md('uno dos tres'))
    const antes = textAt(e, 0)
    mover(e, [0, 4], [0, 8], [0, 0])
    e.undo()
    expect(textAt(e, 0)).toBe(antes)
  })
})

describe('de un bloque a otro', () => {
  it('el pedazo se va del primero y entra en el otro', () => {
    const e = makeEditor(md('uno dos', 'tres'))
    expect(mover(e, [0, 4], [0, 7], [1, 4])).toBe(true)
    expect(sketch(e)).toEqual(['paragraph: uno ', 'paragraph: tresdos'])
  })

  it('soltarlo en el medio de una oración no la corta', () => {
    const e = makeEditor(md('uno dos', 'la casa'))
    mover(e, [0, 4], [0, 7], [1, 3])
    expect(textAt(e, 1)).toBe('la doscasa')
  })
})

describe('un rango que cruza bloques', () => {
  it('se lleva el pedazo de cada uno, y el destino queda con los dos', () => {
    const e = makeEditor(md('uno dos', 'tres cuatro', 'abajo'))
    expect(mover(e, [0, 4], [1, 4], [2, 5])).toBe(true)
    // Lo que quedó arriba: la cabeza del primero pegada a la cola del segundo.
    expect(textAt(e, 0)).toBe('uno  cuatro')
    // Y abajo, los dos pedazos, uno por bloque: entran por el mismo camino que un pegado, así que
    // arrastrar y pegar lo mismo dejan lo mismo.
    expect(sketch(e).slice(1)).toEqual(['paragraph: abajo', 'paragraph: dos', 'paragraph: tres'])
  })

  it('soltarlo adentro de lo elegido no hace nada', () => {
    const e = makeEditor(md('uno dos', 'tres cuatro'))
    const antes = sketch(e)
    expect(mover(e, [0, 4], [1, 4], [1, 2])).toBe(false)
    expect(sketch(e)).toEqual(antes)
  })

  it('tampoco en un bloque que se va a ir con el movimiento', () => {
    const e = makeEditor(md('uno', 'del medio', 'tres'))
    const antes = sketch(e)
    expect(mover(e, [0, 1], [2, 2], [1, 3])).toBe(false)
    expect(sketch(e)).toEqual(antes)
  })
})

describe('lo que no se puede mover', () => {
  it('sin nada elegido no hay nada que mover', () => {
    const e = makeEditor(md('uno dos'))
    caretAt(e, 0, 2)
    expect(e.run('moveSelection', { to: point(at(e, 0), 0) })).toBe(false)
  })

  it('a un bloque que no está, tampoco', () => {
    const e = makeEditor(md('uno dos'))
    selectRange(e, [0, 0], [0, 3])
    expect(e.run('moveSelection', { to: point('fantasma', 0) })).toBe(false)
  })

  it('adentro de un bloque sin texto no se suelta: no hay dónde escribir', () => {
    const e = makeEditor([
      { type: 'paragraph', text: [{ text: 'uno dos' }] },
      { type: 'divider' },
    ])
    selectRange(e, [0, 0], [0, 3])
    expect(e.run('moveSelection', { to: point(at(e, 1), 0) })).toBe(false)
  })
})
