/**
 * El taller mismo.
 *
 * No prueba el motor: prueba que la herramienta con la que se prueba el motor sirva. Un panel que
 * miente o un botón que no hace nada cuestan más que un bug, porque hacen desconfiar de todo lo que
 * se mira ahí adentro.
 */

import { test } from '@playwright/test'
import { abrir, expect, sketch, typeAt, where } from './apoyo/taller.ts'

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

  test('el ancho de columna cambia lo que mide la hoja', async ({ page }) => {
    await abrir(page, 'uno')
    const ancho = async () => (await page.locator('[data-melu-surface]').boundingBox())!.width
    const antes = await ancho()
    await page.getByRole('button', { name: /720 px/ }).click()
    await page.getByRole('menuitem', { name: '560 px' }).click()
    await expect.poll(ancho).toBeLessThan(antes)
  })
})
