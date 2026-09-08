/**
 * Arrastrar bloques con el asa.
 *
 * Es lo que jsdom no puede: acá el navegador mide, y sobre todo acá el navegador **compite**. Un
 * `contenteditable=false` adentro de una región editable es arrastrable por defecto, así que el
 * arrastre nativo se lleva el gesto si nadie lo frena. Ese bug dejaba la página pegada hasta
 * recargar y no había forma de verlo sin un navegador.
 */

import { test } from '@playwright/test'
import { abrir, arrastrarAsa, caja, clickEn, esperarSketch, expect, sketch, where } from './apoyo/taller.ts'

test.describe('el asa', () => {
  test('mueve un bloque abajo de otro', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await arrastrarAsa(page, 0, 2)
    await esperarSketch(page, ['paragraph: dos', 'paragraph: tres', 'paragraph: uno'])
  })

  test('un paso a la derecha lo mete adentro del de arriba', async ({ page }) => {
    await abrir(page, '- uno\n- dos')
    await arrastrarAsa(page, 1, 0, 1)
    await esperarSketch(page, ['bulleted_list: uno', '  bulleted_list: dos'])
  })

  test('se lleva los hijos con él', async ({ page }) => {
    await abrir(page, '- padre\n  - hijo\n- otro')
    await arrastrarAsa(page, 0, 2)
    await esperarSketch(page, ['bulleted_list: otro', 'bulleted_list: padre', '  bulleted_list: hijo'])
  })

  test('no deja la página pegada: el arrastre nativo del navegador no se lleva el gesto', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await arrastrarAsa(page, 0, 2)
    // `melu-dragging` pone el cursor de agarre y `user-select: none` en toda la página. Si queda
    // puesto, el editor es inusable hasta recargar.
    expect(await page.evaluate(() => document.body.classList.contains('melu-dragging'))).toBe(false)
    expect(await page.locator('.melu-drop-line, .melu-drop-inside').count()).toBe(0)
  })

  test('después de arrastrar se puede seguir escribiendo', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    await arrastrarAsa(page, 0, 2)
    await clickEn(page, 0, 'fin')
    await page.keyboard.type('!')
    await expect.poll(async () => (await sketch(page))[0]).toContain('!')
  })

  test('arrastrar varios elegidos se los lleva a todos, y la selección los sigue', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres\n\ncuatro')
    await page.evaluate(() => window.taller.selectBlocks(0, 1))
    await arrastrarAsa(page, 0, 3)
    await esperarSketch(page, ['paragraph: tres', 'paragraph: cuatro', 'paragraph: uno', 'paragraph: dos'])
    expect(await where(page)).toBe('bloques 2,3')
  })

  test('soltar afuera de la página no mueve nada', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    const antes = await sketch(page)
    const origen = await caja(page, 0).boundingBox()
    await page.mouse.move(origen!.x + 40, origen!.y + origen!.height / 2)
    const grip = page.locator('.melu-grip')
    await grip.waitFor({ state: 'visible' })
    const g = await grip.boundingBox()
    await page.mouse.move(g!.x + 5, g!.y + 5)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(g!.x + 5, g!.y + 5 + i * 10)
    // Hasta bien afuera de la superficie, que es como se cancela un arrastre.
    await page.mouse.move(4, 4)
    await page.mouse.up()
    expect(await sketch(page)).toEqual(antes)
    expect(await page.evaluate(() => document.body.classList.contains('melu-dragging'))).toBe(false)
  })

  test('el asa señala el bloque que se está tocando y no el de al lado', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    const segundo = await caja(page, 1).boundingBox()
    await page.mouse.move(segundo!.x + 40, segundo!.y + segundo!.height / 2)
    await page.locator('.melu-grip').waitFor({ state: 'visible' })
    const asa = await page.locator('.melu-handle').boundingBox()
    // El asa se dibuja a la altura del bloque que señala.
    expect(asa!.y).toBeGreaterThanOrEqual(segundo!.y - 8)
    expect(asa!.y).toBeLessThanOrEqual(segundo!.y + segundo!.height)
  })
})
