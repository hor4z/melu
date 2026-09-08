/**
 * Pegar cosas de afuera, con un `DataTransfer` de verdad.
 *
 * jsdom tiene uno falso, hecho a mano en `src/test/setup.ts`, así que ahí se prueba qué hace el
 * motor con los bytes. Acá se prueba lo otro: que el evento llegue, que el navegador no meta nada
 * por su cuenta, y que un pegado que nadie entiende no entre crudo al DOM.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, esperarSketch, expect, outline, pegar, sketch, textAt } from './apoyo/taller.ts'

test.describe('pegar de afuera', () => {
  test('texto con varios párrafos entra como varios bloques', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await pegar(page, { 'text/plain': 'dos\n\ntres' })
    await expect.poll(async () => (await sketch(page)).length).toBeGreaterThan(1)
  })

  test('HTML con una lista entra como lista, y no como párrafos con guiones', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await pegar(page, { 'text/html': '<ul><li>uno</li><li>dos</li></ul>' })
    await expect.poll(() => outline(page)).toContain('bulleted_list')
  })

  test('HTML de Word no trae media pantalla de estilos suyos', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await pegar(page, {
      'text/html':
        '<!--StartFragment--><p class=MsoNormal style="mso-margin-top-alt:auto"><span style=\'font-family:"Calibri",sans-serif;mso-fareast-font-family:"Times New Roman"\'>desde Word<o:p></o:p></span></p><!--EndFragment-->',
    })
    await expect.poll(async () => (await sketch(page)).join(' ')).toContain('desde Word')
    // Ni el `o:p` que Word mete al final ni la fuente de Word sobreviven.
    expect((await sketch(page)).join(' ')).not.toContain('o:p')
  })

  test('un script pegado es texto y no se ejecuta', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await page.evaluate(() => {
      ;(window as unknown as { __corrio: boolean }).__corrio = false
    })
    await pegar(page, { 'text/html': '<p>antes</p><script>window.__corrio = true</script><p>después</p>' })
    expect(await page.evaluate(() => (window as unknown as { __corrio: boolean }).__corrio)).toBe(false)
  })

  test('una imagen con onerror pegada no se lleva el manejador', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await pegar(page, { 'text/html': '<img src="x" onerror="window.__malo = true">' })
    expect(await page.locator('[data-melu-surface] img[onerror]').count()).toBe(0)
  })

  test('un pegado que nadie entiende no entra crudo al DOM', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await clickEn(page, 0, 'fin')
    const antes = await sketch(page)
    // Un mime que ningún handler mira: es lo que llega al pegar una imagen del sistema.
    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.setData('application/x-cosa-rara', 'lo que sea')
      document
        .querySelector('[data-melu-surface]')!
        .dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    })
    await page.waitForTimeout(120)
    // Mejor que no pase nada a que el navegador inyecte contenido ajeno adentro del bloque.
    expect(await sketch(page)).toEqual(antes)
  })

  test('pegar una dirección de YouTube ofrece qué hacer, y no adivina', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await pegar(page, { 'text/plain': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    // Lo menos destructivo primero: el texto con su link, y un menú al lado con el resto.
    await expect.poll(() => textAt(page, 0)).toContain('youtube.com')
    await expect(page.getByRole('menu', { name: 'Qué hacer con el link' })).toBeVisible()
  })

  test('y elegir el video deja un video solo, sin el link pegado', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    await pegar(page, { 'text/plain': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    await page.getByRole('menu', { name: 'Qué hacer con el link' }).waitFor({ state: 'visible' })
    await page.getByRole('menuitem', { name: /video/i }).click()
    await expect.poll(async () => (await outline(page)).filter((l) => l.trim() === 'video')).toHaveLength(1)
    await expect.poll(() => textAt(page, 0)).not.toContain('youtube.com')
  })
})

test.describe('copiar y pegar adentro del editor', () => {
  test('lo copiado vuelve con su formato, que markdown no sabe decir', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('ControlOrMeta+b')
    // El formato quedó puesto: es lo que un pegado tiene que conservar.
    await expect.poll(async () => (await page.evaluate(() => window.taller.marksAt(0))).join()).toContain('bold')
  })

  test('cortar una selección que cruza dos bloques los junta', async ({ page }) => {
    await abrir(page, 'uno\n\ndos')
    await page.evaluate(() => window.taller.selectRange([0, 1], [1, 1]))
    await page.keyboard.press('ControlOrMeta+x')
    await esperarSketch(page, ['paragraph: uos'])
  })
})
