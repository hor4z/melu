/**
 * Seleccionar con el mouse y con el teclado, en un navegador de verdad.
 *
 * Es el archivo que más se justifica de toda la capa: acá vivían los bugs que se reportaron usando
 * el editor, y ninguno era pescable en jsdom, que no tiene ni geometría ni una selección nativa que
 * se comporte como la de un navegador.
 */

import { test } from '@playwright/test'
import { abrir, bloque, clickEn, escribir, expect, seleccionarArrastrando, sketch, where } from './apoyo/taller.ts'

test.describe('arrastrar el mouse', () => {
  test('de un párrafo a otro pinta letra por letra, en lugar de no pintar nada', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await seleccionarArrastrando(page, 0, 2)
    const donde = await where(page)
    // Un rango con cada punta en un bloque distinto: es lo que el navegador no podía tener cuando
    // cada bloque era su propia región editable.
    expect(donde).toMatch(/^0:\d+-2:\d+$/)
  })

  test('adentro de un solo párrafo sigue siendo texto de ese párrafo', async ({ page }) => {
    await abrir(page, 'un párrafo bastante largo para arrastrar adentro')
    await seleccionarArrastrando(page, 0, 0)
    expect(await where(page)).toMatch(/^0:\d+-?/)
  })

  test('lo elegido cruzando bloques se puede borrar de una', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await seleccionarArrastrando(page, 0, 2)
    await page.keyboard.press('Backspace')
    // La cabeza del primero pegada con la cola del último, y el del medio ya no está.
    await expect.poll(() => sketch(page)).toHaveLength(1)
  })

  test('escribir sobre lo elegido lo reemplaza', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await seleccionarArrastrando(page, 0, 1)
    await escribir(page, 'X')
    await expect.poll(() => sketch(page)).toHaveLength(1)
    await expect.poll(async () => (await sketch(page))[0]).toContain('X')
  })
})

test.describe('el teclado', () => {
  test('Shift+abajo sale del bloque en lugar de morir contra el borde', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 0, 'fin')
    await page.keyboard.press('Shift+ArrowDown')
    await expect.poll(() => where(page)).toMatch(/^0:\d+-1:\d+$/)
  })

  test('Mod+A la primera vez toma el bloque y la segunda la página', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 0)
    await page.keyboard.press('ControlOrMeta+a')
    const unBloque = await where(page)
    await page.keyboard.press('ControlOrMeta+a')
    const todo = await where(page)
    expect(unBloque).not.toBe(todo)
    expect(todo).toMatch(/^bloques /)
  })

  test('Escape toma el bloque entero, y el que sigue elegido después de repintar', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 1)
    await page.keyboard.press('Escape')
    // Elegir un bloque tiene que durar más que un render: el caret viejo del navegador no lo deshace.
    await expect.poll(() => where(page)).toBe('bloques 1')
    await page.waitForTimeout(150)
    await expect.poll(() => where(page)).toBe('bloques 1')
  })

  test('con un bloque elegido las flechas lo mueven por la página', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await clickEn(page, 2)
    await page.keyboard.press('Escape')
    await page.keyboard.press('ArrowUp')
    await expect.poll(() => where(page)).toBe('bloques 1')
  })

  test('Mod+Shift+arriba mueve el bloque donde está el caret', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 1)
    await page.keyboard.press('ControlOrMeta+Shift+ArrowUp')
    await expect.poll(() => sketch(page)).toEqual(['paragraph: dos', 'paragraph: uno'])
  })
})

test.describe('el click', () => {
  test('pone el caret donde se apunta, y no al principio', async ({ page }) => {
    await abrir(page, 'un texto largo para clickear al final')
    await clickEn(page, 0, 'fin')
    const donde = await where(page)
    const offset = Number(donde.split(':')[1])
    expect(offset).toBeGreaterThan(10)
  })

  test('doble click toma una palabra', async ({ page }) => {
    await abrir(page, 'medir el patio')
    // Sobre una letra concreta y no en el medio del bloque: el bloque ocupa todo el ancho, y su
    // centro cae bastante después de donde termina el texto.
    const r = await bloque(page, 0).boundingBox()
    await page.mouse.dblclick(r!.x + 12, r!.y + r!.height / 2)
    await expect.poll(() => where(page)).toMatch(/^0:\d+-0:\d+$/)
  })

  test('después de elegir un bloque, un click vuelve a poner el caret', async ({ page }) => {
    // Tres bloques y se clickea el último: la barra de formato flota arriba de lo elegido, así que
    // clickear el bloque de arriba sería clickear la barra.
    await abrir(page, 'uno\n\ndos\n\ntres')
    await clickEn(page, 0)
    await page.keyboard.press('Escape')
    await expect.poll(() => where(page)).toBe('bloques 0')
    await clickEn(page, 2)
    await expect.poll(() => where(page)).toMatch(/^2:\d+$/)
  })
})
