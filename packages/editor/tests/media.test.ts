/**
 * Las direcciones que rompían.
 *
 * Todas salieron de la revisión, y todas son de la misma familia: una dirección perfectamente
 * válida que el reconocedor no esperaba. El caso del `%` suelto no era un tipo mal reconocido, era
 * una excepción que se llevaba la sesión entera.
 */

import { describe, expect, it } from 'vitest'
import { classify, PROVIDERS } from '../src/plugins/media.ts'

describe('direcciones que rompían', () => {
  it('un % suelto no tira una excepción: es un nombre, no un error', () => {
    expect(() => classify('https://ejemplo.com/100%.mp3')).not.toThrow()
    expect(classify('https://ejemplo.com/100%.mp3')).toMatchObject({ type: 'audio' })
  })

  it('un nombre con acentos escapados se lee legible', () => {
    expect(classify('https://x.ar/consigna%20d%C3%ADa.mp3')?.props.title).toBe('consigna día.mp3')
  })

  it('un mapa sin parámetros usa "?" y no "&"', () => {
    const maps = PROVIDERS.find((p) => p.name === 'Google Maps')!
    expect(maps.match(new URL('https://www.google.com/maps/place/Escuela+12'))?.src).toBe(
      'https://www.google.com/maps/place/Escuela+12?output=embed',
    )
  })

  it('y con parámetros usa "&"', () => {
    const maps = PROVIDERS.find((p) => p.name === 'Google Maps')!
    expect(maps.match(new URL('https://www.google.com/maps?q=escuela'))?.src).toContain('?q=escuela&output=embed')
  })
})
