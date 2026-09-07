// Lo que el navegador tiene y jsdom no. El core no necesita nada de esto; la capa de vista sí.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

class ObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ObserverFalso as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= ObserverFalso as unknown as typeof IntersectionObserver

// jsdom no dibuja, así que no tiene ninguno de estos.
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.hasPointerCapture ??= () => false

afterEach(() => {
  cleanup()
})
