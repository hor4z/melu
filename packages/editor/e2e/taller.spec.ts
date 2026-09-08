/**
 * El taller mismo.
 *
 * No prueba el motor: prueba que la herramienta con la que se prueba el motor sirva. Un panel que
 * miente o un botón que no hace nada cuestan más que un bug, porque hacen desconfiar de todo lo que
 * se mira ahí adentro.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, expect, sketch, textAt, typeAt, where } from './apoyo/taller.ts'

test.describe('el árbol de la izquierda', () => {
  test('muestra una fila por bloque, y las cuenta', async ({ page }) => {
    await abrir(page)
    const filas = page.locator('.taller-fila')
    const cuantas = await filas.count()
    expect(cuantas).toBeGreaterThan(20)
    await expect(page.locator('.taller-panel-cuenta')).toContainText(String(cuantas))
  })

  test('clickear una fila lleva el caret a ese bloque', async ({ page }) => {
    await abrir(page)
    await page.locator('.taller-fila').nth(6).click()
    await expect.poll(() => where(page)).toMatch(/^6[:,]|^bloques 6$/)
  })

  test('la fila del bloque donde está el caret se marca sola', async ({ page }) => {
    await abrir(page)
    await page.locator('.taller-fila').nth(3).click()
    await expect(page.locator('.taller-fila[data-activa="true"]')).toHaveCount(1)
  })

  test('el buscador filtra por lo que dice el bloque', async ({ page }) => {
    await abrir(page)
    const antes = await page.locator('.taller-fila').count()
    await page.getByPlaceholder('Buscar en el documento').fill('patio')
    await expect.poll(async () => page.locator('.taller-fila').count()).toBeLessThan(antes)
  })
})

test.describe('el panel de la derecha', () => {
  test('con un bloque elegido muestra sus props, y no un cartel vacío', async ({ page }) => {
    await abrir(page, '# Título\n\nun párrafo')
    await page.locator('.taller-fila').first().click()
    await expect(page.locator('.taller-cabecera-nombre')).toContainText('Título')
    await expect(page.locator('.taller-campo')).not.toHaveCount(0)
  })

  test('tocar una prop cambia el bloque de verdad', async ({ page }) => {
    await abrir(page, '- uno')
    await page.locator('.taller-fila').first().click()
    // La lista numerada declara `start`, la lista con viñeta no: se convierte primero.
    await page.evaluate(() => window.melu.run('setBlockType', { type: 'numbered_list' }))
    const campo = page.locator('.taller-campo', { hasText: 'Empieza en' }).locator('input').last()
    await campo.fill('5')
    await campo.blur()
    await expect.poll(async () => (await page.evaluate(() => window.taller.propsAt(0))).start).toBe(5)
  })

  test('la pestaña Documento muestra la forma del árbol', async ({ page }) => {
    await abrir(page, '# Título\n\nun párrafo')
    await page.getByRole('button', { name: 'Documento' }).click()
    await expect(page.locator('.taller-codigo')).toContainText('heading_1')
  })
})

test.describe('la barra de arriba', () => {
  test('deshacer y rehacer arrancan apagados y se prenden al escribir', async ({ page }) => {
    await abrir(page, 'uno')
    const deshacer = page.getByRole('button', { name: 'Deshacer' })
    await expect(deshacer).toBeDisabled()
    await page.locator('[data-melu-text]').first().click()
    await page.keyboard.type('!')
    await expect(deshacer).toBeEnabled()
    await deshacer.click()
    await expect.poll(() => typeAt(page, 0)).toBe('paragraph')
  })

  test('el botón del agente escribe por la misma puerta que un click', async ({ page }) => {
    await abrir(page, 'uno')
    const antes = (await sketch(page)).length
    await page.getByRole('button', { name: /Escribe el agente/ }).click()
    await expect.poll(async () => (await sketch(page)).length).toBeGreaterThan(antes)
    // Y entra como un solo deshacer, que es lo que hace que un lote sea todo o nada.
    await page.keyboard.press('ControlOrMeta+z')
    await expect.poll(async () => (await sketch(page)).length).toBe(antes)
  })

  test('el más de abajo abre un menú con fondo, y no uno transparente', async ({ page }) => {
    await abrir(page, 'uno')
    await page.getByRole('button', { name: 'Agregar un bloque' }).click()
    const menu = page.locator('.melu-pop')
    await menu.waitFor({ state: 'visible' })
    // Los tokens del editor vivían adentro de la superficie, y un menú que el host monta afuera
    // quedaba sin fondo, sin borde y sin sombra: se leía el documento a través de él. Sólo un
    // navegador de verdad lo puede ver, porque es la cascada de las variables lo que falla.
    const estilo = await menu.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { fondo: cs.backgroundColor, sombra: cs.boxShadow }
    })
    expect(estilo.fondo).not.toBe('rgba(0, 0, 0, 0)')
    expect(estilo.sombra).not.toBe('none')
  })

  test('insertar desde el menú del host deja el bloque nuevo elegido, y no el caret al principio', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await page.getByRole('button', { name: 'Agregar un bloque' }).click()
    await page.locator('.melu-pop').waitFor({ state: 'visible' })
    await page.locator('.melu-pop .melu-menu-item').filter({ hasText: 'Video' }).click()
    // El menú le devuelve el foco a la superficie, y un editable sin selección adentro hace que el
    // navegador se invente un caret al principio de la página. Ese caret llegaba tarde y deshacía
    // la elección: el bloque recién insertado dejaba de estar elegido y el panel mostraba otro.
    await expect.poll(() => where(page)).toMatch(/^bloques /)
    // Y el elegido es el video, no otro: es lo que el panel de props muestra.
    await expect.poll(async () => (await sketch(page)).filter((l) => l.startsWith('video')).length).toBe(1)
    await expect.poll(async () => {
      const donde = await where(page)
      const cual = Number(donde.replace('bloques ', ''))
      return typeAt(page, cual)
    }).toBe('video')
  })

  test('escribir en un documento largo no cuesta el largo del documento', async ({ page }) => {
    /**
     * Se compara contra sí mismo, y no contra un número de milisegundos.
     *
     * Un umbral en milisegundos depende de la máquina y termina siendo un test que a veces falla.
     * Lo que no depende de la máquina es la proporción: escribir en un documento diez veces más
     * largo tiene que costar parecido, no diez veces más. Con las filas del árbol sin memorizar,
     * cada tecla volvía a dibujar una fila por bloque y la proporción era de diez a uno.
     */
    const porTecla = async (cuantos: number) => {
      await page.evaluate((n) => {
        const md = Array.from({ length: n }, (_, i) => `Linea numero ${i} con un poco de texto`).join('\n\n')
        window.taller.cargar(md)
      }, cuantos)
      await expect.poll(async () => (await sketch(page)).length).toBe(cuantos)
      await clickEn(page, 0, 'fin')
      const t0 = Date.now()
      await page.keyboard.type('abcdefghijklmnopqrst', { delay: 0 })
      await expect.poll(() => textAt(page, 0)).toContain('abcdefghijklmnopqrst')
      return (Date.now() - t0) / 20
    }

    await abrir(page, 'uno')
    const corto = await porTecla(40)
    const largo = await porTecla(400)
    expect(largo, `${Math.round(corto)} ms con 40 bloques y ${Math.round(largo)} ms con 400`).toBeLessThan(corto * 6)
  })

  test('el ancho de columna cambia lo que mide la hoja', async ({ page }) => {
    await abrir(page, 'uno')
    const ancho = async () => (await page.locator('[data-melu-surface]').boundingBox())!.width
    const antes = await ancho()
    await page.getByRole('button', { name: /720 px/ }).click()
    await page.getByRole('menuitem', { name: '560 px' }).click()
    await expect.poll(ancho).toBeLessThan(antes)
  })
})
