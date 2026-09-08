/**
 * Seleccionar con el mouse y con el teclado, en un navegador de verdad.
 *
 * Es el archivo que más se justifica de toda la capa: acá vivían los bugs que se reportaron usando
 * el editor, y ninguno era pescable en jsdom, que no tiene ni geometría ni una selección nativa que
 * se comporte como la de un navegador.
 */

import { test } from '@playwright/test'
import { abrir, bloque, caja, clickEn, escribir, expect, seleccionarArrastrando, sketch, where } from './apoyo/taller.ts'

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

/** Sostiene Shift mientras se hace algo: `mouse.click` no lleva modificadores. */
async function conShift(page: Parameters<typeof caja>[0], hacer: () => Promise<void>) {
  await page.keyboard.down('Shift')
  await hacer()
  await page.keyboard.up('Shift')
}

test.describe('Shift+click', () => {
  test('estira lo elegido hasta donde se clickea, en el mismo bloque', async ({ page }) => {
    await abrir(page, 'uno dos tres')
    await clickEn(page, 0, 'inicio')
    const b = (await caja(page, 0).boundingBox())!
    await conShift(page, () => page.mouse.click(b.x + 60, b.y + b.height / 2))
    await expect.poll(() => where(page)).toMatch(/^0:0-0:\d+$/)
  })

  test('y también de un bloque a otro, que es como se agarra un pedazo largo', async ({ page }) => {
    await abrir(page, 'uno dos tres\n\ncuatro cinco seis\n\nsiete ocho nueve')
    await clickEn(page, 0, 'inicio')
    const c = (await caja(page, 2).boundingBox())!
    // Esto lo hace el navegador solo, incluso con una región editable por bloque, y por eso el
    // editor no lo toca. Está probado igual porque es la clase de cosa que se rompe de costado.
    await conShift(page, () => page.mouse.click(c.x + 40, c.y + c.height / 2))
    await expect.poll(() => where(page)).toMatch(/^0:0-2:\d+$/)
  })

  test('hacia arriba también, y el ancla se queda donde estaba', async ({ page }) => {
    await abrir(page, 'uno dos tres\n\ncuatro cinco seis')
    await clickEn(page, 1, 'fin')
    const a = (await caja(page, 0).boundingBox())!
    await conShift(page, () => page.mouse.click(a.x + 20, a.y + a.height / 2))
    await expect.poll(() => where(page)).toMatch(/^1:\d+-0:\d+$/)
  })

  test('con un bloque elegido, estira la elección hasta el que se clickea', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await clickEn(page, 0)
    await page.keyboard.press('Escape')
    await expect.poll(() => where(page)).toBe('bloques 0')
    const c = (await caja(page, 2).boundingBox())!
    await conShift(page, () => page.mouse.click(c.x + 20, c.y + c.height / 2))
    await expect.poll(() => where(page)).toBe('bloques 0,1,2')
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
