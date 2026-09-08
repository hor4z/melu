/**
 * Las direcciones que rompían.
 *
 * Todas salieron de la revisión, y todas son de la misma familia: una dirección perfectamente
 * válida que el reconocedor no esperaba. El caso del `%` suelto no era un tipo mal reconocido, era
 * una excepción que se llevaba la sesión entera.
 */

import { describe, expect, it } from 'vitest'
import { bookmarkProps, classify, PROVIDERS } from './media.ts'
import { at, caretAt, makeEditor, type, typeAt } from '../test/engine.ts'

/** Un editor vacío con el caret puesto. */
function blank() {
  const e = makeEditor()
  caretAt(e, 0, 0)
  return e
}

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

describe('una dirección de video pegada sola se vuelve el bloque que corresponde', () => {
  it('un link de YouTube se convierte en video', () => {
    const e = blank()
    type(e, 'https://www.youtube.com/watch?v=abc123 ')
    expect(typeAt(e, 0)).toBe('video')
    expect(String(e.block(at(e, 0))!.props!.src)).toContain('youtube-nocookie.com/embed/abc123')
  })

  it('un .png se convierte en imagen', () => {
    const e = blank()
    type(e, 'https://x.ar/foto.png ')
    expect(typeAt(e, 0)).toBe('image')
  })

  it('una página cualquiera no se convierte sola: eso lo decide quien escribe', () => {
    const e = blank()
    type(e, 'https://educabot.com/algo ')
    expect(typeAt(e, 0)).toBe('paragraph')
  })
})

describe('la miniatura de una tarjeta', () => {
  it('una dirección de YouTube trae su miniatura, que se arma sin preguntarle a nadie', () => {
    expect(bookmarkProps('https://www.youtube.com/watch?v=dQw4w9WgXcQ').image).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    )
  })

  it('la forma corta de YouTube también', () => {
    expect(bookmarkProps('https://youtu.be/dQw4w9WgXcQ').image).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    )
  })

  it('con la miniatura puesta la tarjeta deja de estar cargando: no hay nada más que esperar', () => {
    expect(bookmarkProps('https://youtu.be/dQw4w9WgXcQ').loading).toBe(false)
  })

  it('un sitio cualquiera queda esperando a que la plataforma le busque los datos', () => {
    const props = bookmarkProps('https://educabot.com/una/nota')
    expect(props.image).toBeUndefined()
    expect(props.loading).toBe(true)
    expect(props.site).toBe('educabot.com')
  })

  it('el www no es parte del nombre del sitio', () => {
    expect(bookmarkProps('https://www.educabot.com/').site).toBe('educabot.com')
  })

  it('una dirección que no se puede leer no rompe la tarjeta: queda con lo que había', () => {
    const props = bookmarkProps('no es una dirección')
    expect(props.url).toBe('no es una dirección')
    expect(props.loading).toBe(false)
  })
})
