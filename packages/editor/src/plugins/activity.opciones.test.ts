/**
 * Las opciones de una pregunta: agregar, sacar, y qué pasa con la respuesta correcta.
 *
 * Es la aritmética que más silenciosamente puede arruinar una actividad. Borrar una opción corre
 * los índices de lo que estaba marcado como correcto, y un off-by-one acá no rompe nada visible: la
 * pregunta sigue andando y corrige mal. Un aprendiz contesta bien y le dice que no.
 */

import { describe, expect, it } from 'vitest'
import { plain } from '../core/index.ts'
import { at, makeFullEditor, propsAt } from '../test/engine.ts'

/** Una pregunta con las opciones puestas, y el índice de la correcta. */
const conOpciones = (type: 'choice' | 'multi', textos: readonly string[], extra: Record<string, unknown> = {}) =>
  makeFullEditor([
    {
      type,
      text: [{ text: 'Una pregunta' }],
      props: { options: textos.map((t) => [{ text: t }]), ...extra },
    },
  ])

const opciones = (editor: ReturnType<typeof makeFullEditor>): string[] =>
  ((propsAt(editor, 0).options ?? []) as { text: string }[][]).map((o) => plain(o))

describe('agregar una opción', () => {
  it('la agrega al final, vacía y lista para escribir', () => {
    const e = conOpciones('choice', ['uno', 'dos'])
    expect(e.run('addOption', { id: at(e, 0) })).toBe(true)
    expect(opciones(e)).toEqual(['uno', 'dos', ''])
  })

  it('se le puede dar el texto de una', () => {
    const e = conOpciones('choice', ['uno'])
    e.run('addOption', { id: at(e, 0), text: 'tres' })
    expect(opciones(e)).toEqual(['uno', 'tres'])
  })

  it('sobre un bloque que no está no hace nada, en lugar de romper', () => {
    const e = conOpciones('choice', ['uno', 'dos'])
    expect(e.run('addOption', { id: 'fantasma' })).toBe(false)
  })
})

describe('sacar una opción', () => {
  it('borrar una de más arriba corre la correcta con ella, en vez de dejarla señalando otra', () => {
    const e = conOpciones('choice', ['uno', 'dos', 'tres'], { correct: 2 })
    e.run('removeOption', { id: at(e, 0), index: 0 })
    expect(opciones(e)).toEqual(['dos', 'tres'])
    // "tres" seguía siendo la correcta, y ahora está en la posición uno.
    expect(propsAt(e, 0).correct).toBe(1)
  })

  it('borrar una de más abajo no toca la correcta', () => {
    const e = conOpciones('choice', ['uno', 'dos', 'tres'], { correct: 0 })
    e.run('removeOption', { id: at(e, 0), index: 2 })
    expect(propsAt(e, 0).correct).toBe(0)
  })

  it('borrar la que era correcta no deja la pregunta sin respuesta: se cae a la primera', () => {
    const e = conOpciones('choice', ['uno', 'dos', 'tres'], { correct: 1 })
    e.run('removeOption', { id: at(e, 0), index: 1 })
    expect(opciones(e)).toEqual(['uno', 'tres'])
    expect(propsAt(e, 0).correct).toBeLessThan(2)
  })

  it('no se puede bajar de dos: una pregunta de una sola opción no se puede contestar mal', () => {
    const e = conOpciones('choice', ['uno', 'dos'], { correct: 0 })
    expect(e.run('removeOption', { id: at(e, 0), index: 1 })).toBe(false)
    expect(opciones(e)).toEqual(['uno', 'dos'])
  })

  it('en una de varias correctas, las que quedan se corren y la borrada se va', () => {
    const e = conOpciones('multi', ['uno', 'dos', 'tres', 'cuatro'], { correctMulti: [1, 3] })
    e.run('removeOption', { id: at(e, 0), index: 1 })
    expect(opciones(e)).toEqual(['uno', 'tres', 'cuatro'])
    // La 1 se fue con la opción, y la 3 pasó a ser la 2.
    expect(propsAt(e, 0).correctMulti).toEqual([2])
  })

  it('borrar la última de varias correctas deja la lista vacía, y no una con un índice inventado', () => {
    const e = conOpciones('multi', ['uno', 'dos'], { correctMulti: [1] })
    e.run('addOption', { id: at(e, 0) })
    e.run('removeOption', { id: at(e, 0), index: 1 })
    expect(propsAt(e, 0).correctMulti).toEqual([])
  })

  it('un índice que no existe no cambia nada', () => {
    const e = conOpciones('choice', ['uno', 'dos', 'tres'], { correct: 1 })
    const antes = opciones(e)
    e.run('removeOption', { id: at(e, 0), index: 9 })
    expect(opciones(e)).toEqual(antes)
  })
})

describe('los huecos de un completar', () => {
  it('salen del texto y no de las props: el texto es la fuente de verdad', () => {
    const e = makeFullEditor([{ type: 'fill_in', text: [{ text: 'El {{largo}} por el {{ancho}}' }] }])
    e.run('syncBlanks', { id: at(e, 0) })
    expect(propsAt(e, 0).blanks).toEqual(['largo', 'ancho'])
  })

  it('sacar las llaves dobles del texto se lleva el hueco', () => {
    const e = makeFullEditor([{ type: 'fill_in', text: [{ text: 'El {{largo}} por el {{ancho}}' }] }])
    e.run('syncBlanks', { id: at(e, 0) })
    e.exec((ctx) => {
      ctx.tr.setText(at(e, 0), [{ text: 'El {{largo}} por el ancho' }])
      return true
    })
    expect(propsAt(e, 0).blanks).toEqual(['largo'])
  })

  it('un texto sin llaves deja la lista vacía, y no la anterior', () => {
    const e = makeFullEditor([{ type: 'fill_in', text: [{ text: 'El {{largo}}' }] }])
    e.run('syncBlanks', { id: at(e, 0) })
    e.exec((ctx) => {
      ctx.tr.setText(at(e, 0), [{ text: 'sin huecos' }])
      return true
    })
    expect(propsAt(e, 0).blanks).toEqual([])
  })
})
