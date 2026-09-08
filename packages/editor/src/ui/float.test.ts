// Dónde va lo que flota. Es aritmética pura sobre rectángulos, así que la ventana se declara y no
// se mide: jsdom la da de 1024×768 y acá se la fija a mano para que cada caso diga qué pantalla
// está describiendo.

import { beforeEach, describe, expect, it } from 'vitest'
import { pointAnchor, place, rectOf, relativeTo, type Anchor } from './float.ts'

/** Una ventana de tamaño conocido: los números de cada caso salen de acá. */
function ventana(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

/** Un ancla como la de un botón, con su caja. */
const ancla = (top: number, left: number, width = 100, height = 30): Anchor => ({
  top,
  left,
  width,
  height,
  right: left + width,
  bottom: top + height,
})

beforeEach(() => ventana(1000, 800))

describe('abajo o arriba', () => {
  it('abajo del ancla cuando hay lugar, que es el caso normal', () => {
    const at = place(ancla(100, 200), { width: 200, height: 300 })
    expect(at.placement).toBe('bottom-start')
    expect(at.top).toBe(136)
  })

  it('un menú alto abierto abajo del todo se da vuelta, en lugar de salirse de la pantalla', () => {
    const at = place(ancla(700, 200), { width: 200, height: 300 })
    expect(at.placement).toBe('top-start')
    expect(at.top + 300).toBeLessThanOrEqual(700)
  })

  it('pedir arriba y que arriba dé se respeta', () => {
    const at = place(ancla(500, 200), { width: 200, height: 200 }, { placement: 'top-start' })
    expect(at.placement).toBe('top-start')
  })

  it('pedir arriba sin lugar arriba pero con lugar abajo cae abajo, y lo dice', () => {
    const at = place(ancla(20, 200), { width: 200, height: 300 }, { placement: 'top-start' })
    // Quien dibuja la flechita del menú necesita saber de qué lado quedó.
    expect(at.placement).toBe('bottom-start')
  })

  it('cuando no cabe ni arriba ni abajo dice cuánto lugar hay, para que scrollee adentro', () => {
    ventana(1000, 300)
    const at = place(ancla(120, 200), { width: 200, height: 600 })
    expect(at.maxHeight).toBeLessThan(600)
    expect(at.maxHeight).toBeGreaterThan(0)
  })

  it('nunca devuelve menos de ciento veinte de alto: un menú de dos píxeles no se puede usar', () => {
    ventana(1000, 200)
    const at = place(ancla(90, 200), { width: 200, height: 400 })
    expect(at.maxHeight).toBe(120)
  })

  it('dado vuelta, nunca arranca arriba del margen', () => {
    ventana(1000, 300)
    const at = place(ancla(250, 200), { width: 200, height: 400 })
    expect(at.top).toBeGreaterThanOrEqual(8)
  })
})

describe('el eje horizontal', () => {
  it('arranca en el borde izquierdo del ancla', () => {
    expect(place(ancla(100, 300), { width: 200, height: 100 }).left).toBe(300)
  })

  it('centrado, queda centrado sobre el ancla', () => {
    const at = place(ancla(100, 300, 100), { width: 200, height: 100 }, { placement: 'bottom-center' })
    // El centro del ancla es 350, así que una caja de 200 arranca en 250.
    expect(at.left).toBe(250)
  })

  it('contra el borde derecho se corre para adentro, en vez de salirse', () => {
    const at = place(ancla(100, 900), { width: 300, height: 100 })
    expect(at.left + 300).toBeLessThanOrEqual(1000)
  })

  it('centrado sobre un ancla pegada a la izquierda no arranca en negativo', () => {
    const at = place(ancla(100, 0, 20), { width: 300, height: 100 }, { placement: 'bottom-center' })
    expect(at.left).toBeGreaterThanOrEqual(0)
  })

  it('una caja más ancha que la ventana se queda en el margen y no se corre a la izquierda', () => {
    ventana(300, 800)
    const at = place(ancla(100, 100), { width: 500, height: 100 })
    expect(at.left).toBe(8)
  })

  it('el gap se respeta: un menú pegado al ancla se lee como parte de ella', () => {
    const pegado = place(ancla(100, 200), { width: 100, height: 100 }, { gap: 0 })
    const separado = place(ancla(100, 200), { width: 100, height: 100 }, { gap: 20 })
    expect(separado.top - pegado.top).toBe(20)
  })
})

describe('las anclas', () => {
  it('un ancla de un punto no tiene ancho: es el caret, no una caja', () => {
    const a = pointAnchor(120, 40, 18)
    expect(a).toMatchObject({ left: 120, right: 120, width: 0, top: 40, bottom: 58 })
  })

  it('un ancla de un elemento sale de su caja', () => {
    const el = document.createElement('div')
    el.getBoundingClientRect = () =>
      ({ top: 10, left: 20, right: 120, bottom: 50, width: 100, height: 40, x: 20, y: 10, toJSON: () => ({}) }) as DOMRect
    expect(rectOf(el)).toEqual({ top: 10, left: 20, right: 120, bottom: 50, width: 100, height: 40 })
  })

  it('las coordenadas se pueden pasar a las de un contenedor, para dibujar adentro suyo', () => {
    const caja = document.createElement('div')
    caja.getBoundingClientRect = () =>
      ({ top: 100, left: 50, right: 550, bottom: 600, width: 500, height: 500, x: 50, y: 100, toJSON: () => ({}) }) as DOMRect
    expect(relativeTo(caja, { top: 150, left: 80 })).toEqual({ top: 50, left: 30 })
  })
})
