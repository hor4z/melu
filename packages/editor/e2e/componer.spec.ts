/**
 * Componer una letra: acentos con tecla muerta, IME, dictado.
 *
 * Es la costura que el `AGENTS.md` marca como la razón de dejarle el texto al navegador, y la que
 * jsdom no puede tocar: no hay `compositionstart` de verdad, ni un teclado que arme una letra en
 * varios pasos. Si esto se rompe, el editor deja de servir en español antes que en cualquier otro
 * idioma.
 */

import { test } from '@playwright/test'
import { abrir, clickEn, componer, expect, textAt } from './apoyo/taller.ts'

test.describe('componer', () => {
  test('un acento con tecla muerta entra como una sola letra', async ({ page }) => {
    await abrir(page, 'medir')
    await clickEn(page, 0, 'fin')
    // Los pasos intermedios son lo que muestra el navegador mientras se compone.
    await componer(page, ['´'], 'á')
    await expect.poll(() => textAt(page, 0)).toBe('medirá')
  })

  test('la ñ compuesta tampoco deja dos caracteres', async ({ page }) => {
    await abrir(page, 'ni')
    await clickEn(page, 0, 'fin')
    await componer(page, ['~'], 'ñ')
    await expect.poll(() => textAt(page, 0)).toBe('niñ')
  })

  test('un IME con varios pasos deja lo confirmado y no los pasos', async ({ page }) => {
    await abrir(page, '')
    await clickEn(page, 0)
    await componer(page, ['s', 'su', 'すし'], '寿司')
    await expect.poll(() => textAt(page, 0)).toBe('寿司')
  })

  test('componer en el medio de un texto no lo desordena', async ({ page }) => {
    await abrir(page, 'casa')
    // Con el teclado y no por el modelo: lo que compone es el navegador, y el navegador escribe
    // donde está **su** caret.
    await clickEn(page, 0)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await componer(page, ['´'], 'á')
    await expect.poll(() => textAt(page, 0)).toBe('caása')
  })

  test('el bloque no se repinta en el medio, que es lo que se llevaba la letra', async ({ page }) => {
    await abrir(page, 'uno')
    await clickEn(page, 0, 'fin')
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.imeSetComposition', { text: '´', selectionStart: 1, selectionEnd: 1 })
    // A mitad de camino el DOM tiene la letra provisoria y el modelo todavía no: es a propósito.
    const enElMedio = await page.evaluate(() => document.querySelectorAll('[data-melu-text]')[0]?.textContent)
    expect(enElMedio).toContain('´')
    await cdp.send('Input.insertText', { text: 'á' })
    await cdp.detach()
    await expect.poll(() => textAt(page, 0)).toBe('unoá')
  })
})
