/**
 * Insertar bloques por cada puerta que existe, y que entre **uno**.
 *
 * "Agregué un video y se agregaron dos" fue el bug que abrió toda esta capa, y no lo pescaba nada:
 * la causa vivía en un `onReady` que corría dos veces bajo `StrictMode`, que es lo que hace una app
 * de React de verdad y no hacía ningún test. El taller sí monta en `StrictMode`, así que estos
 * tests corren en la misma condición donde el bug existía.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, escribir, expect, outline, sketch, typeAt, where } from './apoyo/taller.ts'

/**
 * Deja el caret en un bloque vacío al final, que es donde alguien escribe la barra o una regla.
 *
 * Se hace con Enter y no con markdown: los renglones en blanco del final no arman un bloque, y
 * además así el caret queda donde lo dejaría una persona.
 */
async function enBloqueVacio(page: Parameters<typeof outline>[0]): Promise<void> {
  await clickEn(page, 0, 'fin')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => window.taller.where().startsWith('1:'))
}

/** Cuántos bloques de un tipo hay en la página. */
const cuantos = async (page: Parameters<typeof outline>[0], tipo: string) =>
  (await outline(page)).filter((l) => l.trim() === tipo).length

test.describe('el menú "/"', () => {
  test('escribir la barra lo abre, y elegir inserta uno solo', async ({ page }) => {
    await abrir(page, 'uno')
    await enBloqueVacio(page)
    await escribir(page, '/video')
    const menu = page.getByRole('listbox')
    await menu.waitFor({ state: 'visible' })
    await page.keyboard.press('Enter')
    await expect.poll(() => cuantos(page, 'video')).toBe(1)
  })

  test('se recorre con las flechas y se elige con Enter, sin tocar el mouse', async ({ page }) => {
    await abrir(page, 'uno')
    await enBloqueVacio(page)
    await escribir(page, '/')
    await page.getByRole('listbox').waitFor({ state: 'visible' })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    // Sea cual sea el segundo del menú, el bloque vacío se convirtió en algo.
    await expect.poll(() => typeAt(page, 1)).not.toBe('paragraph')
  })

  test('Escape lo cierra y deja la barra escrita, en lugar de insertar', async ({ page }) => {
    await abrir(page, 'uno')
    await enBloqueVacio(page)
    await escribir(page, '/vid')
    await page.getByRole('listbox').waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toHaveCount(0)
    expect(await sketch(page)).toHaveLength(2)
  })

  test('una tabla elegida por el menú llega armada, y el caret queda en la primera celda', async ({ page }) => {
    await abrir(page, 'uno')
    await enBloqueVacio(page)
    await escribir(page, '/tabla')
    await page.getByRole('listbox').waitFor({ state: 'visible' })
    await page.keyboard.press('Enter')
    await expect.poll(() => cuantos(page, 'table_cell')).toBe(9)
    // Una tabla recién puesta se empieza a llenar arriba a la izquierda, sin tener que clickear.
    await expect.poll(() => typeAt(page, 3)).toBe('table_cell')
  })

  test('una barra en el medio de una palabra no lo abre', async ({ page }) => {
    await abrir(page, 'uno')
    await enBloqueVacio(page)
    await escribir(page, 'y/o')
    await expect(page.getByRole('listbox')).toHaveCount(0)
  })
})

test.describe('la caja de bloques', () => {
  test('un click inserta uno solo, y no dos', async ({ page }) => {
    await abrir(page, 'uno')
    await page.getByRole('button', { name: /^Caja/ }).click()
    await page.getByRole('button', { name: /^Video/ }).click()
    await expect.poll(() => cuantos(page, 'video')).toBe(1)
  })

  test('la tabla llega con sus filas, y no vacía', async ({ page }) => {
    await abrir(page, 'uno')
    await page.getByRole('button', { name: /^Caja/ }).click()
    await page.getByRole('button', { name: /^Tabla/ }).click()
    await expect.poll(() => cuantos(page, 'table_cell')).toBeGreaterThan(0)
  })
})

test.describe('el más de abajo', () => {
  test('abre hacia arriba y entra en la ventana', async ({ page }) => {
    await abrir(page, 'uno')
    const boton = page.getByRole('button', { name: 'Agregar un bloque' })
    const b = await boton.boundingBox()
    await boton.click()
    const menu = page.getByRole('menu', { name: 'Agregar un bloque' })
    await menu.waitFor({ state: 'visible' })
    const m = await menu.boundingBox()
    expect(m!.y + m!.height).toBeLessThanOrEqual(b!.y + 4)
    expect(m!.y).toBeGreaterThanOrEqual(0)
  })

  test('inserta uno solo', async ({ page }) => {
    await abrir(page, 'uno')
    await page.getByRole('button', { name: 'Agregar un bloque' }).click()
    await page.getByRole('menu', { name: 'Agregar un bloque' }).waitFor({ state: 'visible' })
    await page.getByRole('menuitem', { name: /^Video/ }).click()
    await expect.poll(() => cuantos(page, 'video')).toBe(1)
  })
})

test.describe('las reglas de tipeo', () => {
  const casos = [
    { escrito: '# ', tipo: 'heading_1' },
    { escrito: '## ', tipo: 'heading_2' },
    { escrito: '- ', tipo: 'bulleted_list' },
    { escrito: '1. ', tipo: 'numbered_list' },
    { escrito: '[ ] ', tipo: 'todo' },
    { escrito: '> ', tipo: 'toggle' },
  ]

  for (const { escrito, tipo } of casos) {
    test(`"${escrito}" da un ${tipo}`, async ({ page }) => {
      await abrir(page, 'uno')
      await enBloqueVacio(page)
      await escribir(page, escrito)
      await expect.poll(() => typeAt(page, 1)).toBe(tipo)
    })
  }

  test('el separador deja un párrafo abajo donde seguir escribiendo', async ({ page }) => {
    await abrir(page, 'uno')
    await enBloqueVacio(page)
    await escribir(page, '--- ')
    await expect.poll(() => cuantos(page, 'divider')).toBe(1)
    // Sin esto, un separador al final deja la página sin dónde poner el caret.
    await expect.poll(() => where(page)).toMatch(/^\d+:\d+$/)
  })
})
