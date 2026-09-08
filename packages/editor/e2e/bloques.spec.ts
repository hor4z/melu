/**
 * Insertar bloques por cada puerta que existe, y que entre **uno**.
 *
 * "Agregué un video y se agregaron dos" fue el bug que abrió toda esta capa, y no lo pescaba nada:
 * la causa vivía en un `onReady` que corría dos veces bajo `StrictMode`, que es lo que hace una app
 * de React de verdad y no hacía ningún test. El taller sí monta en `StrictMode`, así que estos
 * tests corren en la misma condición donde el bug existía.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, escribir, esperarSketch, expect, outline, sketch, typeAt, where } from './apoyo/taller.ts'

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

/** Los bloques del primer nivel, que es donde se cuenta si entró uno o dos. */
const arriba = (page: Parameters<typeof sketch>[0]) =>
  page.evaluate(() => window.melu.state.doc.blocks[window.melu.state.doc.root]!.children)

test.describe('cada tipo, por el menú, uno solo', () => {
  /**
   * Todos los tipos que el menú ofrece, en una sola pasada.
   *
   * "Agregué un video y se agregaron dos" fue un bug de un tipo, pero podía ser de cualquiera: la
   * causa no tenía nada que ver con el video. Así que se prueban todos, y en un solo test porque
   * abrir el taller treinta y cuatro veces cuesta un minuto y no agrega nada.
   */
  test('los treinta y pico entran de a uno, y el documento queda consistente', async ({ page }) => {
    await abrir(page, 'uno')
    const tipos = await page.evaluate(() => {
      const el = document.querySelector('[data-melu-surface]')
      void el
      return window.melu.state.schema.groups.flatMap((g) => g.items.map((s) => ({ type: s.type, name: s.name })))
    })
    expect(tipos.length).toBeGreaterThan(30)

    for (const { type, name } of tipos) {
      // Cada uno desde cero, y por la puerta que usa una persona: el menú "/" en un bloque vacío.
      await page.evaluate(() => window.taller.cargar('uno'))
      await clickEn(page, 0, 'fin')
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => window.taller.where().startsWith('1:'))
      await escribir(page, `/${name}`)
      const menu = page.getByRole('listbox')
      await menu.waitFor({ state: 'visible' })
      const primero = await page.evaluate(() => document.querySelector('[role=option]')?.textContent ?? '')
      // El menú tiene que estar ofreciendo el que se buscó: si no, el test estaría probando otro.
      expect(primero, `buscando ${name}`).toContain(name)
      await page.keyboard.press('Enter')
      // El bloque vacío donde se escribió la barra se convierte en el elegido: quedan dos arriba,
      // nunca tres. Un tercero sería el bloque que se insertó dos veces, o el vacío que quedó
      // huérfano al costado.
      await expect.poll(() => typeAt(page, 1), { message: `insertando ${type}` }).toBe(type)
      expect(await arriba(page), `${type} dejó de más`).toHaveLength(2)
      // Y el documento sigue siendo dibujable: ningún tipo se lleva el párrafo que había.
      expect((await sketch(page))[0], `${type} se llevó el párrafo`).toBe('paragraph: uno')
    }
  })
})

test.describe('el desplegable', () => {
  test('esconde lo que tiene adentro, y clickearlo lo muestra', async ({ page }) => {
    await abrir(page, 'La pista\n\nla respuesta')
    await page.evaluate(() => {
      window.melu.run('setBlockType', { type: 'toggle', id: window.taller.idAt(0) })
      window.melu.run('moveBlock', { id: window.taller.idAt(1), parent: window.taller.idAt(0), index: 0 })
    })
    await esperarSketch(page, ['toggle: La pista', '  paragraph: la respuesta'])

    // Que el hijo esté en el documento y no se vea es la mitad del bloque; sólo se puede afirmar
    // en un navegador, porque esconderlo es CSS.
    const hijo = page.locator('[data-melu-text]').nth(1)
    await expect(hijo).toBeHidden()
    const twisty = page.getByRole('button', { name: /Abrir|Cerrar/ }).first()
    await expect(twisty).toHaveAttribute('aria-expanded', 'false')
    await twisty.click()
    await expect(hijo).toBeVisible()
    await expect(page.getByRole('button', { name: /Abrir|Cerrar/ }).first()).toHaveAttribute('aria-expanded', 'true')
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
