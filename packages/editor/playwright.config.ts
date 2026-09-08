/**
 * Los tests que corren en un navegador de verdad.
 *
 * No duplican a los de jsdom: hay una sola regla para decidir dónde va cada caso, y es qué cosas
 * jsdom inventa. Inventa tres: la **geometría** (todo mide cero), la **composición** (no hay tecla
 * muerta, ni IME, ni dictado) y el **portapapeles** (no hay `DataTransfer` de verdad, ni archivos).
 * Todo lo demás va a jsdom, que corre en un segundo.
 *
 * Corren contra el taller, que es la misma página que se usa para probar a mano, y afirman contra
 * el modelo (`window.taller`) y no contra el HTML. Es la ventaja que tenemos: el HTML se rompe con
 * cada refactor de los renderizadores sin que nada esté mal, y el modelo no.
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Un test que sólo pasa cuando corre solo no pasa. Cada uno abre su página y el taller no guarda
  // nada entre recargas, así que son independientes de verdad.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Ninguno tarda: el que llegue a quince segundos está esperando algo que no va a pasar.
  timeout: 15_000,
  expect: { timeout: 4_000 },

  use: {
    baseURL: 'http://localhost:5176',
    trace: 'on-first-retry',
    video: 'off',
    screenshot: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  /**
   * Su propio servidor, en su propio puerto, y siempre nuevo.
   *
   * Reusar el que uno tiene abierto para mirar el taller parece más rápido y sale caro: un servidor
   * de desarrollo que estuvo horas arriba puede quedarse con un módulo viejo en su caché, y
   * entonces los tests fallan por algo que en el código ya está arreglado. Perseguir eso una vez
   * cuesta más que el segundo que tarda levantar uno limpio.
   */
  webServer: {
    command: 'npm run dev -- --port 5176 --strictPort',
    url: 'http://localhost:5176',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
