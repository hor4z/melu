/**
 * Los once bloques de pregunta.
 *
 * Son la razón de existir del package y entre todos tenían tres tests, todos de uno solo. Lo que se
 * prueba acá no es cómo se dibujan: es que una pregunta recién insertada esté lista para contestarse
 * y para corregirse, porque una que llega a medio armar no se nota hasta que hay treinta chicos
 * contestándola.
 */

import { describe, expect, it } from 'vitest'
import { at, makeFullEditor, press, propsAt, sketch, typeAt, caretAt } from '../test/engine.ts'

const TIPOS = [
  'choice',
  'multi',
  'number',
  'fill_in',
  'order',
  'match',
  'question',
  'evidence',
  'self_report',
  'game',
  'manipulative',
] as const

/** Un editor con una pregunta de ese tipo recién insertada, como la deja el menú. */
function conPregunta(type: string) {
  const e = makeFullEditor([{ type: 'paragraph', text: [] }])
  e.run('insertBlock', { type })
  return e
}

describe('una pregunta recién insertada', () => {
  for (const type of TIPOS) {
    it(`un ${type} llega con sus props puestas y del tipo que declara`, () => {
      const e = conPregunta(type)
      expect(typeAt(e, 0)).toBe(type)
      const spec = e.state.schema.specOr(type)
      // Todo lo que el spec declara con default tiene que estar: una prop ausente es una pregunta
      // que se corrige con lo que el corrector suponga.
      for (const [nombre, prop] of Object.entries(spec.props ?? {})) {
        if (prop.default === undefined) continue
        expect(propsAt(e, 0)).toHaveProperty(nombre)
      }
    })
  }

  it('una de opciones llega con dos, porque una sola no se puede contestar mal', () => {
    const e = conPregunta('choice')
    expect((propsAt(e, 0).options as unknown[]).length).toBeGreaterThanOrEqual(2)
  })

  it('una de ordenar llega con dos ítems, por lo mismo', () => {
    const e = conPregunta('order')
    expect((propsAt(e, 0).items as unknown[]).length).toBeGreaterThanOrEqual(2)
  })

  it('una de emparejar llega con dos parejas vacías, y no con una tarjeta en blanco', () => {
    const e = conPregunta('match')
    const parejas = propsAt(e, 0).pairs as { left?: string; right?: string }[]
    expect(parejas).toHaveLength(2)
    expect(parejas.every((p) => p.left === '' && p.right === '')).toBe(true)
  })

  it('las que no se corrigen solas llegan sin puntos', () => {
    // Una pregunta abierta, una evidencia y un autoreporte los mira una persona, no el corrector.
    expect(propsAt(conPregunta('question'), 0).points).toBe(0)
    expect(propsAt(conPregunta('evidence'), 0).points).toBe(0)
    expect(propsAt(conPregunta('self_report'), 0)).not.toHaveProperty('points')
  })

  it('las que sí se corrigen solas valen un punto', () => {
    expect(propsAt(conPregunta('choice'), 0).points).toBe(1)
    expect(propsAt(conPregunta('number'), 0).points).toBe(1)
  })

  it('un autoreporte trae los dos extremos escritos, para que se entienda sin explicación', () => {
    const props = propsAt(conPregunta('self_report'), 0)
    expect(String(props.low)).not.toBe('')
    expect(String(props.high)).not.toBe('')
  })
})

describe('escribir alrededor de una pregunta', () => {
  for (const type of TIPOS) {
    it(`Enter al final de un ${type} da un párrafo, y no otra pregunta`, () => {
      const e = conPregunta(type)
      caretAt(e, 0, 0)
      press(e, 'Enter')
      // Encadenar preguntas sin querer es la forma más rápida de arruinar una actividad.
      expect(typeAt(e, 1)).toBe('paragraph')
    })
  }

  it('una pregunta no comparte renglón: es un bloque de punta a punta', () => {
    const e = conPregunta('choice')
    expect(e.state.schema.specOr('choice').standalone).toBe(true)
  })
})

describe('cambiar de tipo', () => {
  it('de una correcta a varias, las opciones se quedan', () => {
    const e = makeFullEditor([
      { type: 'choice', text: [{ text: '¿Cuál?' }], props: { options: [[{ text: 'a' }], [{ text: 'b' }]], correct: 1 } },
    ])
    e.run('setBlockType', { type: 'multi', id: at(e, 0) })
    expect(typeAt(e, 0)).toBe('multi')
    expect(sketch(e)).toEqual(['multi: ¿Cuál?'])
  })

  it('a un párrafo, la consigna se queda como texto', () => {
    const e = makeFullEditor([{ type: 'number', text: [{ text: '¿Cuántos metros?' }], props: { answer: 12 } }])
    e.run('setBlockType', { type: 'paragraph', id: at(e, 0) })
    expect(sketch(e)).toEqual(['paragraph: ¿Cuántos metros?'])
  })
})

describe('los rangos que declara el spec', () => {
  it('un valor fuera de rango se recorta al entrar, y no queda guardado', () => {
    const e = conPregunta('evidence')
    e.run('setBlockProps', { id: at(e, 0), props: { maxSeconds: 99_999 } })
    const spec = e.state.schema.specOr('evidence').props?.maxSeconds
    const max = spec && 'max' in spec ? spec.max : undefined
    expect(propsAt(e, 0).maxSeconds).toBe(max)
  })

  it('una opción que no está entre las declaradas cae en el default', () => {
    const e = conPregunta('game')
    const antes = propsAt(e, 0).engine
    e.run('setBlockProps', { id: at(e, 0), props: { engine: 'inventado' } })
    expect(propsAt(e, 0).engine).toBe(antes)
  })

  it('los puntos no pueden ser negativos', () => {
    const e = conPregunta('choice')
    e.run('setBlockProps', { id: at(e, 0), props: { points: -5 } })
    expect(Number(propsAt(e, 0).points)).toBeGreaterThanOrEqual(0)
  })
})
