/**
 * La tabla, en un navegador.
 *
 * Es el bloque con más superficie visible del editor: una grilla de CSS con una celda editable en
 * cada hueco, y un pie con lo que se puede hacerle. Lo que se prueba acá es lo que sólo se puede
 * ver dibujado: que una fila recién agregada mida lo mismo que sus vecinas, y que los controles
 * estén a la vista cuando hacen falta.
 */

import { test } from '@playwright/test'
import { abrir, expect, sketch, where } from './apoyo/taller.ts'

const dosPorTres = '| a | b | c |\n| --- | --- | --- |\n| d | e | f |'

/** Las celdas dibujadas, que son los huecos de la grilla. */
const celdas = (page: Parameters<typeof sketch>[0]) => page.locator('.melu-cell')
/** Un botón del pie, por su nombre exacto: "Fila" y "Quitar fila" comparten palabra. */
const boton = (page: Parameters<typeof sketch>[0], nombre: string) =>
  page.locator('.melu-table-controls').getByRole('button', { name: nombre, exact: true })
const alturas = (page: Parameters<typeof sketch>[0]) =>
  celdas(page).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))

test.describe('agregar', () => {
  test('una fila nueva mide lo mismo que las que ya estaban, y no aplastada', async ({ page }) => {
    await abrir(page, dosPorTres)
    await celdas(page).first().click()
    await boton(page, 'Fila').click()
    await expect.poll(() => celdas(page).count()).toBe(9)
    // Una celda vacía sin altura mínima salía de 15px contra los 39 de sus vecinas con texto, y el
    // caret adentro no se veía: parecía que la fila no se había agregado.
    const medidas = await alturas(page)
    const nuevas = medidas.slice(6)
    const viejas = medidas.slice(3, 6)
    expect(Math.min(...nuevas)).toBeGreaterThanOrEqual(Math.min(...viejas) - 1)
  })

  test('la fila va al final, y se puede escribir en ella sin volver a clickear', async ({ page }) => {
    await abrir(page, dosPorTres)
    await celdas(page).first().click()
    await boton(page, 'Fila').click()
    await expect.poll(() => celdas(page).count()).toBe(9)
    await page.keyboard.type('nueva')
    // El botón está abajo de todo, así que agrega abajo de todo: antes caía entre las dos que ya
    // estaban. Y el caret queda adentro, que es lo que deja seguir escribiendo.
    await expect.poll(async () => (await sketch(page)).at(-3)).toBe('    table_cell: nueva')
  })

  test('la columna va a la derecha de todo', async ({ page }) => {
    await abrir(page, dosPorTres)
    await celdas(page).first().click()
    await boton(page, 'Columna').click()
    await expect.poll(() => celdas(page).count()).toBe(8)
    await page.keyboard.type('X')
    await expect.poll(async () => (await sketch(page)).slice(2, 7)).toEqual([
      '    table_cell: a',
      '    table_cell: b',
      '    table_cell: c',
      '    table_cell: X',
      '  table_row',
    ])
  })
})

test.describe('quitar', () => {
  test('con el caret en una celda se puede quitar su fila y su columna', async ({ page }) => {
    await abrir(page, dosPorTres)
    // La celda "e", del medio de la segunda fila.
    await celdas(page).nth(4).click()
    await expect.poll(() => where(page)).toMatch(/^\d+:/)
    await boton(page, 'Quitar fila').click()
    await expect.poll(() => sketch(page)).toEqual([
      'table',
      '  table_row',
      '    table_cell: a',
      '    table_cell: b',
      '    table_cell: c',
    ])
    await boton(page, 'Quitar columna').click()
    await expect.poll(async () => (await sketch(page)).length).toBe(4)
  })

  test('sin el caret adentro no se ofrece, porque no se sabe cuál', async ({ page }) => {
    await abrir(page, `uno\n\n${dosPorTres}`)
    await expect(boton(page, 'Quitar fila')).toBeDisabled()
    await expect(boton(page, 'Quitar columna')).toBeDisabled()
  })

  test('la última fila y la última columna no se pueden quitar', async ({ page }) => {
    await abrir(page, '| a |\n| --- |')
    await celdas(page).first().click()
    await expect(boton(page, 'Quitar fila')).toBeDisabled()
    await expect(boton(page, 'Quitar columna')).toBeDisabled()
  })
})

test.describe('el pie', () => {
  test('se queda a la vista mientras el caret está en una celda', async ({ page }) => {
    await abrir(page, `uno\n\n${dosPorTres}`)
    const controles = page.locator('.melu-table-controls')
    // Sin el caret adentro y sin el puntero encima, no estorba.
    await expect.poll(() => controles.evaluate((e) => getComputedStyle(e).opacity)).toBe('0')
    await celdas(page).nth(1).click()
    // `:focus-within` no alcanza: el foco vive en la superficie y no adentro de la tabla, así que
    // los controles aparecían sólo al pasar el puntero, que es justo cuando no hacen falta.
    await expect.poll(() => controles.evaluate((e) => getComputedStyle(e).opacity)).toBe('1')
  })
})

test.describe('la selección no se sale de una celda', () => {
  test('arrastrar el mouse de una celda a otra no arma un rango que las cruce', async ({ page }) => {
    await abrir(page, '| aaa | bbb |\n| --- | --- |\n| ccc | ddd |')
    const a = (await celdas(page).nth(0).boundingBox())!
    const d = (await celdas(page).nth(3).boundingBox())!
    await page.mouse.move(a.x + 8, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(d.x + 24, d.y + d.height / 2, { steps: 10 })
    await page.mouse.up()
    // Recortado a la celda donde arrancó: las dos puntas en el mismo bloque.
    await expect.poll(async () => {
      const donde = await where(page)
      const [desde, hasta] = donde.split('-')
      return hasta === undefined || desde!.split(':')[0] === hasta.split(':')[0]
    }).toBe(true)
    // Y por eso borrar no desarma la tabla, que es lo que hacía: quedaba de una celda.
    await page.keyboard.press('Backspace')
    await expect.poll(() => celdas(page).count()).toBe(4)
  })

  test('Shift+arriba adentro de una celda se queda adentro', async ({ page }) => {
    await abrir(page, '| aaa | bbb |\n| --- | --- |\n| ccc | ddd |')
    await celdas(page).nth(3).click()
    await page.keyboard.press('Shift+ArrowUp')
    await expect.poll(async () => {
      const donde = await where(page)
      const [desde, hasta] = donde.split('-')
      return hasta === undefined || desde!.split(':')[0] === hasta.split(':')[0]
    }).toBe(true)
    await page.keyboard.press('Backspace')
    await expect.poll(() => celdas(page).count()).toBe(4)
  })

  test('pero la flecha sola sigue yendo a la celda de arriba', async ({ page }) => {
    await abrir(page, '| aaa | bbb |\n| --- | --- |\n| ccc | ddd |')
    await celdas(page).nth(3).click()
    const antes = await where(page)
    await page.keyboard.press('ArrowUp')
    await expect.poll(() => where(page)).not.toBe(antes)
    // De "ddd" para arriba está "bbb", que es la segunda celda de la primera fila.
    await expect.poll(async () => (await sketch(page))[3]).toBe('    table_cell: bbb')
  })
})
