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

/**
 * El portapapeles que jsdom no tiene.
 *
 * `DataTransfer` no existe y `ClipboardEvent` ignora lo que se le pase, así que sin esto no hay
 * forma de probar pegar, que es como se escribe la mayor parte de una actividad.
 */
class PortapapelesFalso {
  private datos = new Map<string, string>()
  getData(tipo: string) {
    return this.datos.get(tipo) ?? ''
  }
  setData(tipo: string, valor: string) {
    this.datos.set(tipo, valor)
  }
  clearData() {
    this.datos.clear()
  }
  get types() {
    return [...this.datos.keys()]
  }
  readonly items = [] as unknown as DataTransferItemList
  readonly files = [] as unknown as FileList
  dropEffect = 'none' as const
  effectAllowed = 'all' as const
}
globalThis.DataTransfer ??= PortapapelesFalso as unknown as typeof DataTransfer

/** Un evento de pegado con su contenido puesto, que es lo que jsdom no sabe armar. */
export function eventoDePegado(datos: Record<string, string>): ClipboardEvent {
  const evento = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
  const portapapeles = new DataTransfer()
  for (const [tipo, valor] of Object.entries(datos)) portapapeles.setData(tipo, valor)
  Object.defineProperty(evento, 'clipboardData', { value: portapapeles, configurable: true })
  return evento
}

// jsdom no dibuja, así que no tiene ninguno de estos.
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.hasPointerCapture ??= () => false

afterEach(() => {
  cleanup()
})
