/**
 * El taller mismo.
 *
 * No prueba el motor: prueba que la herramienta con la que se prueba el motor sirva. Un panel que
 * miente o un botón que no hace nada cuestan más que un bug, porque hacen desconfiar de todo lo que
 * se mira ahí adentro.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, expect, sketch, textAt, typeAt, where } from './apoyo/taller.ts'

test.describe('el panel de la derecha', () => {
  test('con un bloque elegido muestra sus props, y no un cartel vacío', async ({ page }) => {
    await abrir(page, '# Título\n\nun párrafo')
    await clickEn(page, 0)
    await expect(page.locator('.taller-cabecera-nombre')).toContainText('Título')
    await expect(page.locator('.taller-campo')).not.toHaveCount(0)
  })

  test('sin nada elegido dice qué hacer, en lugar de quedarse vacío', async ({ page }) => {
    await abrir(page, 'uno')
    await page.evaluate(() => window.melu.setSelection(null))
    await expect(page.locator('.taller-vacio')).toContainText('Elegí un bloque')
  })

  test('tocar una prop cambia el bloque de verdad', async ({ page }) => {
    await abrir(page, '- uno')
    await clickEn(page, 0)
    // La lista numerada declara `start`, la lista con viñeta no: se convierte primero.
    await page.evaluate(() => window.melu.run('setBlockType', { type: 'numbered_list' }))
    const campo = page.locator('.taller-campo', { hasText: 'Empieza en' }).locator('input').last()
    await campo.fill('5')
    await campo.blur()
    await expect.poll(async () => (await page.evaluate(() => window.taller.propsAt(0))).start).toBe(5)
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

  test('en solo lectura, lo que no se puede hacer se ve que no se puede', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await page.getByRole('button', { name: /Solo lectura/ }).click()
    // La caja de bloques no se monta en solo lectura, así que su interruptor tampoco puede quedar
    // ofreciéndose: un botón que no hace nada es peor que un botón que no está.
    await expect(page.getByRole('button', { name: /^Caja/ })).toBeDisabled()
    await expect(page.locator('.melu-handle')).toHaveCount(0)
    await page.getByRole('button', { name: /Solo lectura/ }).click()
    await expect(page.getByRole('button', { name: /^Caja/ })).toBeEnabled()
  })

  test('el ancho de columna cambia lo que mide la hoja', async ({ page }) => {
    await abrir(page, 'uno')
    const ancho = async () => (await page.locator('[data-melu-surface]').boundingBox())!.width
    const antes = await ancho()
    await page.getByRole('button', { name: /Ancho de la columna/ }).click()
    await page.getByRole('menuitem', { name: '560 px' }).click()
    await expect.poll(ancho).toBeLessThan(antes)
  })

  test('el lado de la columna la mueve, y al centro la deja en el medio', async ({ page }) => {
    await abrir(page, 'uno')
    const izquierda = async () => Math.round((await page.locator('.taller-hoja').boundingBox())!.x)
    const elegir = async (nombre: string) => {
      await page.getByRole('button', { name: /Lado de la columna/ }).click()
      await page.getByRole('menuitem', { name: nombre }).click()
      await page.waitForTimeout(60)
      return izquierda()
    }
    // Al centro es el default, así que se empieza moviéndola.
    const alaIzquierda = await elegir('A la izquierda')
    const alCentro = await elegir('Al centro')
    const alaDerecha = await elegir('A la derecha')
    expect(alaIzquierda).toBeLessThan(alCentro)
    expect(alCentro).toBeLessThan(alaDerecha)
  })

  test('los dos menús dicen qué cambian, y no sólo en qué están', async ({ page }) => {
    await abrir(page, 'uno')
    // Leído en voz alta, "720 px" es un botón llamado 720 px: el nombre tiene que decir qué hace.
    const ancho = page.getByRole('button', { name: /Ancho de la columna/ })
    await expect(ancho).toHaveAttribute('aria-expanded', 'false')
    await ancho.click()
    await expect(page.getByRole('button', { name: /Ancho de la columna/ })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menu', { name: 'Ancho de la columna' })).toBeVisible()
  })

  test('las acciones y el menú son dos grupos separados', async ({ page }) => {
    await abrir(page, 'uno')
    // Apretar "Solo lectura" buscando "Deshacer" es lo que pasa cuando todo vive en la misma
    // píldora: ahora las acciones están de un lado y cómo se mira, del otro.
    const acciones = (await page.getByRole('toolbar', { name: 'Acciones del taller' }).boundingBox())!
    const menu = (await page.getByRole('toolbar', { name: 'Cómo se mira el taller' }).boundingBox())!
    expect(acciones.x + acciones.width).toBeLessThan(menu.x)
  })
})
