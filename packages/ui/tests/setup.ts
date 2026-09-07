// Lo que el navegador tiene y jsdom no. Sin esto no fallan los tests: fallan los componentes,
// que es peor, porque el error habla de un observer y no de lo que se estaba probando.
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// floating-ui mide el elemento y el viewport para acomodar lo que flota.
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverFalso as unknown as typeof ResizeObserver

// `useMediaQuery` pregunta por esto en el primer render. Por defecto contesta que no: los tests
// que necesiten otra cosa la reemplazan con `respondeMedia`.
respondeMedia(() => false)

/** Hace que `matchMedia` conteste lo que diga `decide` para cada consulta. */
export function respondeMedia(decide: (query: string) => boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: decide(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

// jsdom no dibuja, así que no tiene ninguno de estos.
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.hasPointerCapture ??= () => false

afterEach(() => {
  cleanup()
})
