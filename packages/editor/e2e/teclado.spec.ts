/**
 * El tacto del teclado, medido donde el navegador manda.
 *
 * Lo que está acá y no en jsdom es lo que depende de dónde cayó el caret en la pantalla: en qué
 * renglón visual estaba, si una flecha vertical sale del bloque, si la columna se conserva. jsdom
 * dice que todo mide cero, así que ahí esas preguntas no tienen respuesta.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, escribir, esperarSketch, expect, sketch, textAt, where } from './apoyo/taller.ts'

test.describe('las flechas verticales', () => {
  test('bajan al bloque siguiente cuando ya no hay renglón abajo', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 0)
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => where(page)).toMatch(/^1:/)
  })

  test('caen en la misma columna, y no al principio del renglón', async ({ page }) => {
    await abrir(page, 'una línea bastante larga\n\notra línea bastante larga')
    await clickEn(page, 0, 'fin')
    const arriba = Number((await where(page)).split(':')[1])
    await page.keyboard.press('ArrowDown')
    const abajo = Number((await where(page)).split(':')[1])
    // No es un test de igualdad exacta: las dos líneas tienen la misma fuente, así que la columna
    // cae cerca. Lo que se prueba es que no se fue al cero.
    expect(abajo).toBeGreaterThan(arriba - 4)
  })

  test('adentro de un párrafo de varios renglones no salta de bloque', async ({ page }) => {
    const largo = 'palabra '.repeat(40).trim()
    await abrir(page, `${largo}\n\notro`)
    await clickEn(page, 0)
    await page.keyboard.press('ArrowDown')
    // Sigue en el mismo bloque: bajó un renglón, no un bloque.
    await expect.poll(() => where(page)).toMatch(/^0:/)
  })
})

test.describe('Enter y Backspace', () => {
  test('Enter en el medio parte el texto y deja el caret al principio del segundo', async ({ page }) => {
    await abrir(page, 'unodos')
    await clickEn(page, 0)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await esperarSketch(page, ['paragraph: uno', 'paragraph: dos'])
    await expect.poll(() => where(page)).toBe('1:0')
  })

  test('una tecla apretada enseguida de una flecha usa el caret de ahora, no el de antes', async ({ page }) => {
    await abrir(page, 'unodos')
    await clickEn(page, 0)
    // Sin pausa entre una cosa y la otra, que es como escribe alguien rápido o una autorepetición.
    // El navegador mueve el caret al despachar la tecla y avisa después, así que el modelo llegaba
    // atrasado y el Enter partía el bloque donde el caret estaba antes.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await esperarSketch(page, ['paragraph: uno', 'paragraph: dos'])
  })

  test('Backspace al principio junta con el de arriba y el caret queda en la junta', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 1)
    await page.keyboard.press('Backspace')
    await esperarSketch(page, ['paragraph: unodos'])
    // Con `poll` y no de una: el caret lo pone el motor y el navegador lo confirma después, así
    // que leerlo una sola vez es una carrera contra el repintado.
    await expect.poll(() => where(page)).toBe('0:3')
  })

  test('Backspace en un ítem de lista vacío deja de ser lista', async ({ page }) => {
    await abrir(page, '- uno')
    await clickEn(page, 0, 'fin')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Backspace')
    await expect.poll(async () => (await sketch(page)).at(-1)).toContain('paragraph')
  })

  test('Tab anida y Shift+Tab desanida', async ({ page }) => {
    await abrir(page, '- uno\n- dos')
    await clickEn(page, 1)
    await page.keyboard.press('Tab')
    await esperarSketch(page, ['bulleted_list: uno', '  bulleted_list: dos'])
    await page.keyboard.press('Shift+Tab')
    await esperarSketch(page, ['bulleted_list: uno', 'bulleted_list: dos'])
  })
})

test.describe('Enter en cada familia de bloque', () => {
  /**
   * Que después de Enter se pueda seguir escribiendo, en el bloque nuevo.
   *
   * Lo que el modelo hace con Enter está probado tipo por tipo en jsdom. Lo que sólo se puede
   * probar acá es lo otro: que el caret del navegador haya ido al mismo lugar que el del modelo. Si
   * se separan, la letra siguiente aparece en el bloque de arriba, que es de los errores más
   * desconcertantes que puede tener un editor.
   */
  for (const [type, nombre] of [
    ['heading_2', 'un título'],
    ['bulleted_list', 'un ítem de lista'],
    ['todo', 'un ítem de checklist'],
    ['quote', 'una cita'],
    ['callout', 'un destacado'],
    ['choice', 'una consigna de pregunta'],
  ] as const) {
    test(`en ${nombre}, lo que se escribe después cae en el bloque nuevo`, async ({ page }) => {
      await abrir(page, 'uno')
      await page.evaluate((t) => window.melu.run('setBlockType', { type: t, id: window.taller.idAt(0) }), type)
      await clickEn(page, 0, 'fin')
      await page.keyboard.press('Enter')
      await escribir(page, 'dos')
      await expect.poll(() => textAt(page, 1)).toBe('dos')
      // Y el de arriba quedó intacto: la letra no se fue a la mitad de la nada.
      await expect.poll(() => textAt(page, 0)).toBe('uno')
    })
  }
})

test.describe('los atajos de formato', () => {
  test('Mod+B pone negrita sobre lo elegido', async ({ page }) => {
    await abrir(page, 'medir el patio')
    await clickEn(page, 0)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+b')
    await expect.poll(async () => (await page.evaluate(() => window.taller.marksAt(0))).join()).toContain('bold')
  })

  test('deshacer vuelve lo escrito, y rehacer lo trae', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await escribir(page, ' y algo')
    await expect.poll(() => textAt(page, 0)).toBe('uno y algo')
    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(() => textAt(page, 0)).toBe('uno')
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await expect.poll(() => textAt(page, 0)).toBe('uno y algo')
  })

  test('escribir una palabra entera se deshace de una sola vez', async ({ page }) => {
    await abrir(page, '')
    await clickEn(page, 0)
    await escribir(page, 'palabra')
    await page.keyboard.press('ControlOrMeta+z')
    // La coalescencia del historial: una palabra escrita de corrido es un solo cambio.
    await expect.poll(() => textAt(page, 0)).toBe('')
  })
})

test.describe('solo lectura', () => {
  test('no se puede escribir, y el asa no aparece', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await page.getByRole('button', { name: /Solo lectura/ }).click()
    await page.locator('[data-melu-surface][data-read-only]').waitFor()
    const antes = await sketch(page)
    await page.locator('[data-melu-text]').first().click()
    await escribir(page, 'nada')
    expect(await sketch(page)).toEqual(antes)
    const caja = await page.locator('[data-melu-block]').first().boundingBox()
    await page.mouse.move(caja!.x + 40, caja!.y + 10)
    await page.waitForTimeout(150)
    expect(await page.locator('.melu-grip').count()).toBe(0)
  })
})
