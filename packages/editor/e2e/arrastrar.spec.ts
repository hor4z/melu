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

/** Deja el puntero agarrando el asa de un bloque, con el botón apretado. */
async function tomarElAsa(page: Parameters<typeof caja>[0], n: number) {
  const origen = (await caja(page, n).boundingBox())!
  await page.mouse.move(origen.x + 40, origen.y + 10)
  const grip = page.locator('.melu-grip')
  await grip.waitFor({ state: 'visible' })
  const g = (await grip.boundingBox())!
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  return g
}

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

  test('mientras se arrastra se ve dónde va a caer, a la altura del bloque que se está tocando', async ({ page }) => {
    await abrir(page, 'uno\n\ndos\n\ntres')
    const g = await tomarElAsa(page, 0)
    const destino = (await caja(page, 2).boundingBox())!
    await page.mouse.move(destino.x + 10, destino.y + destino.height - 4, { steps: 6 })
    const linea = page.locator('.melu-drop-line')
    await linea.waitFor({ state: 'visible' })
    const l = (await linea.boundingBox())!
    // La línea se dibuja donde va a caer, y no en el lugar de donde salió.
    expect(Math.abs(l.y - (destino.y + destino.height))).toBeLessThan(10)
    await page.mouse.up()
    void g
  })

  test('adentro de un desplegable vacío cae adentro, y no debajo', async ({ page }) => {
    await abrir(page, '> La pista\n\nuno')
    // El desplegable vacío es un contenedor abierto: un paso a la derecha sobre él quiere decir
    // "adentro", y es la única forma de meter un bloque en algo que todavía no tiene nada.
    await arrastrarAsa(page, 1, 0, 1)
    await esperarSketch(page, ['quote: La pista', '  paragraph: uno'])
  })

  test('scrollear en el medio del arrastre no corre el destino', async ({ page }) => {
    await abrir(page, Array.from({ length: 30 }, (_, i) => `linea ${i}`).join('\n\n'))
    await tomarElAsa(page, 0)
    const medio = (await caja(page, 6).boundingBox())!
    const x = medio.x + 20
    const y = medio.y + medio.height - 4
    await page.mouse.move(x, y, { steps: 4 })
    // Se scrollea con el botón apretado, que es lo que pasa cuando el destino está más abajo de lo
    // que se ve. Los rects se medían al empezar el arrastre, así que scrollear los corría todos y
    // la línea quedaba señalando un bloque que ya no estaba ahí.
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(150)
    await page.mouse.move(x, y + 2, { steps: 2 })
    const debajo = await page.evaluate(
      ([px, py]) => document.elementFromPoint(px, py)?.closest('[data-melu-block]')?.textContent?.trim() ?? null,
      [x, y + 2],
    )
    await page.mouse.up()
    const despues = await sketch(page)
    const cayo = despues.indexOf('paragraph: linea 0')
    expect(debajo).not.toBeNull()
    // Cayó pegado al bloque que estaba debajo del puntero, y no veinte bloques más arriba, que es
    // donde ese bloque estaba antes de scrollear. De qué lado del borde cayó no importa acá.
    const vecinos = [despues[cayo - 1] ?? '', despues[cayo + 1] ?? '']
    expect(vecinos.some((v) => v.includes(String(debajo)))).toBe(true)
  })

  test('una tabla se arrastra entera, con sus filas', async ({ page }) => {
    await abrir(page, 'uno\n\n| a | b |\n| --- | --- |\n| c | d |')
    const antes = await sketch(page)
    const tabla = antes.findIndex((l) => l.startsWith('table'))
    expect(tabla).toBeGreaterThan(0)
    // Se arrastra el párrafo abajo de la tabla, que es la forma de dejar la tabla arriba.
    await arrastrarAsa(page, 0, tabla)
    const despues = await sketch(page)
    expect(despues[0]).toBe('table')
    // Con sus dos filas y sus cuatro celdas: no se desarmó al moverse.
    expect(despues.filter((l) => l.includes('table_cell'))).toHaveLength(4)
    expect(despues.at(-1)).toBe('paragraph: uno')
  })

  test('una imagen se angosta arrastrando su manija, y el ancho queda en las props', async ({ page }) => {
    await abrir(page, 'uno')
    await page.evaluate(() => {
      window.melu.run('insertBlock', { type: 'image', props: { src: 'https://placehold.co/600x300', width: 100 } })
    })
    const figura = page.locator('.melu-figure').first()
    await figura.waitFor({ state: 'visible' })
    const grip = page.getByRole('button', { name: 'Ensanchar' })
    const g = (await grip.boundingBox())!
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await page.mouse.down()
    // Hacia adentro: el ancho se cuenta desde el centro, así que mover una manija mueve las dos.
    await page.mouse.move(g.x - 120, g.y + g.height / 2, { steps: 8 })
    await page.mouse.up()
    // El ancho es un porcentaje de la columna y no píxeles: la misma actividad entra en un celular
    // y en un proyector.
    await expect.poll(() => page.evaluate(() => window.taller.propsAt(1).width)).toBeLessThan(80)
    await expect.poll(() => page.evaluate(() => window.taller.propsAt(1).width)).toBeGreaterThan(20)
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
