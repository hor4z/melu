/**
 * Lo que hace legible un test en el navegador.
 *
 * Dos mitades. Preguntarle al modelo, que va por `window.taller` y devuelve exactamente lo mismo
 * que afirma un test de jsdom: `sketch`, `where`, `textAt`. Y empujar el editor con gestos de
 * verdad, que es lo único que este archivo tiene y el de jsdom no puede tener.
 *
 * Nada de esperar milisegundos. `editor.version` sube en cada transacción, así que se espera esa
 * condición y no un número inventado.
 */

import { expect, type Locator, type Page } from '@playwright/test'
import type { Editor } from '../../src/index.ts'
import type { Vocabulary } from '../../src/test/vocabulary.ts'

declare global {
  interface Window {
    melu: Editor
    taller: Vocabulary & {
      soloLectura(v?: boolean): void
      agente(markdown?: string): void
      reiniciar(): void
      cargar(markdown: string): void
    }
  }
}

// ---------------------------------------------------------------------------- preguntarle al modelo

export const sketch = (page: Page): Promise<string[]> => page.evaluate(() => window.taller.sketch())
export const outline = (page: Page): Promise<string[]> => page.evaluate(() => window.taller.outline())
export const where = (page: Page): Promise<string> => page.evaluate(() => window.taller.where())
export const textAt = (page: Page, n: number): Promise<string> => page.evaluate((i) => window.taller.textAt(i), n)
export const typeAt = (page: Page, n: number): Promise<string> => page.evaluate((i) => window.taller.typeAt(i), n)
export const marksAt = (page: Page, n: number): Promise<string[]> => page.evaluate((i) => window.taller.marksAt(i), n)
export const version = (page: Page): Promise<number> => page.evaluate(() => window.taller.version())

/** Reintenta hasta que el modelo diga lo que se espera, en lugar de mirar una sola vez. */
export const esperarSketch = (page: Page, esperado: string[]) => expect.poll(() => sketch(page)).toEqual(esperado)

/**
 * Corre un gesto y espera a que el motor se haya movido de verdad.
 *
 * `version` sube en cada transacción: es una condición y no una apuesta. Es lo que hace que no haya
 * un solo `waitForTimeout` en toda la batería.
 */
export async function conCambio(page: Page, hacer: () => Promise<void>): Promise<void> {
  const antes = await version(page)
  await hacer()
  await page.waitForFunction((v) => window.taller.version() > v, antes)
}

// ---------------------------------------------------------------------------- poner la escena

/** Abre el taller con el documento puesto. Lo primero de cada test. */
export async function abrir(page: Page, markdown?: string): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.taller))
  if (markdown !== undefined) {
    await conCambio(page, () => page.evaluate((m) => window.taller.cargar(m), markdown))
  }
}

/** El elemento de texto de un bloque, por posición de lectura. La misma numeración que `sketch`. */
export function bloque(page: Page, n: number): Locator {
  return page.locator('[data-melu-text]').nth(n)
}

/** El elemento del bloque entero, que es lo que se arrastra y lo que se mide. */
export function caja(page: Page, n: number): Locator {
  return page.locator('[data-melu-block]').nth(n)
}

/**
 * Pone el caret con un click de verdad, adentro del texto de un bloque.
 *
 * Espera a que el modelo se entere antes de volver. El navegador avisa de un caret nuevo en otra
 * vuelta del bucle de eventos, así que un test que clickeaba y seguía de largo corría la tecla
 * siguiente contra el caret viejo. Es la clase de carrera que hace un test intermitente.
 */
export async function clickEn(page: Page, n: number, cerca: 'inicio' | 'fin' = 'inicio'): Promise<void> {
  const el = bloque(page, n)
  const r = await el.boundingBox()
  if (!r) throw new Error(`el bloque ${n} no está dibujado`)
  await page.mouse.click(cerca === 'inicio' ? r.x + 2 : r.x + r.width - 2, r.y + r.height / 2)
  await page.waitForFunction((i) => window.taller.where().startsWith(`${i}:`), n)
}

// ---------------------------------------------------------------------------- gestos

/**
 * Arrastra el mouse desde un bloque hasta otro, con pasos.
 *
 * Los pasos importan: la superficie escucha `pointermove`, y un salto de una sola vez no dispara
 * ninguno en el medio. Una mano tampoco salta.
 */
export async function seleccionarArrastrando(page: Page, desde: number, hasta: number): Promise<void> {
  const antes = await where(page)
  const a = await bloque(page, desde).boundingBox()
  const b = await bloque(page, hasta).boundingBox()
  if (!a || !b) throw new Error('los bloques no están dibujados')
  await page.mouse.move(a.x + 6, a.y + a.height / 2)
  await page.mouse.down()
  const pasos = 8
  for (let i = 1; i <= pasos; i++) {
    await page.mouse.move(
      a.x + 6 + ((b.x + b.width / 2 - a.x - 6) * i) / pasos,
      a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * i) / pasos,
    )
  }
  await page.mouse.up()
  // Igual que el click: el aviso del navegador llega en otra vuelta.
  await page.waitForFunction((v) => window.taller.where() !== v, antes)
}

/**
 * Agarra el asa de un bloque y lo suelta sobre el borde de abajo de otro.
 *
 * `sangria` son pasos de 28px a la derecha, que es como el motor decide el nivel.
 */
export async function arrastrarAsa(page: Page, desde: number, hasta: number, sangria = 0): Promise<void> {
  const origen = await caja(page, desde).boundingBox()
  const destino = await caja(page, hasta).boundingBox()
  if (!origen || !destino) throw new Error('los bloques no están dibujados')

  // El asa aparece al pasar el puntero por el bloque, y vive en el canal de la izquierda.
  await page.mouse.move(origen.x + 40, origen.y + origen.height / 2)
  const grip = page.locator('.melu-grip')
  await grip.waitFor({ state: 'visible' })
  const g = await grip.boundingBox()
  if (!g) throw new Error('el asa no está dibujada')

  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  const x = destino.x + 10 + sangria * 28
  const y = destino.y + destino.height - 4
  const pasos = 8
  for (let i = 1; i <= pasos; i++) {
    await page.mouse.move(
      g.x + g.width / 2 + ((x - g.x - g.width / 2) * i) / pasos,
      g.y + g.height / 2 + ((y - g.y - g.height / 2) * i) / pasos,
    )
  }
  await page.mouse.up()
}

/** Escribe con teclado de verdad, letra por letra. Para poner la escena está `abrir`. */
export const escribir = (page: Page, texto: string) => page.keyboard.type(texto)

/**
 * Pega armando el `DataTransfer` adentro de la página y despachando el evento.
 *
 * Es el camino confiable: no pide permisos, anda sin cabeza, y los bytes son exactamente los que se
 * le pasan. El portapapeles del sistema se usa sólo donde el ida y vuelta es el sujeto del test.
 */
export async function pegar(page: Page, datos: Record<string, string>): Promise<void> {
  await conCambio(page, () =>
    page.evaluate((d) => {
      const dt = new DataTransfer()
      for (const [tipo, valor] of Object.entries(d)) dt.setData(tipo, valor)
      const destino = document.querySelector('[data-melu-surface]')!
      destino.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    }, datos),
  )
}

/**
 * Compone una letra con tecla muerta, por CDP.
 *
 * Es lo único que produce `compositionstart`/`update`/`end` de verdad, que es la costura que el
 * `AGENTS.md` marca como la más delicada y la que jsdom no puede tocar.
 */
export async function componer(page: Page, pasos: readonly string[], confirmado: string): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  for (const paso of pasos) {
    await cdp.send('Input.imeSetComposition', {
      text: paso,
      selectionStart: paso.length,
      selectionEnd: paso.length,
    })
  }
  await cdp.send('Input.insertText', { text: confirmado })
  await cdp.detach()
}

export { expect } from '@playwright/test'
