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

describe('las formas que tiene una dirección de YouTube', () => {
  /** La dirección del reproductor que sale de clasificarla, o nada si no la reconoció. */
  const embed = (url: string) => {
    const hit = classify(url)
    return hit?.type === 'video' ? String(hit.props.src) : undefined
  }

  it('la larga de siempre', () => {
    expect(embed('https://www.youtube.com/watch?v=abc123')).toContain('/embed/abc123')
  })

  it('la corta de compartir', () => {
    expect(embed('https://youtu.be/abc123')).toContain('/embed/abc123')
  })

  it('un short, que es la que más se comparte de un teléfono', () => {
    expect(embed('https://www.youtube.com/shorts/abc123')).toContain('/embed/abc123')
  })

  it('una que ya venía embebida', () => {
    expect(embed('https://www.youtube.com/embed/abc123')).toContain('/embed/abc123')
  })

  it('una transmisión en vivo', () => {
    expect(embed('https://www.youtube.com/live/abc123')).toContain('/embed/abc123')
  })

  it('la del sitio para teléfonos', () => {
    expect(embed('https://m.youtube.com/watch?v=abc123')).toContain('/embed/abc123')
  })

  it('la que ya era sin cookies no se vuelve a envolver', () => {
    expect(embed('https://www.youtube-nocookie.com/embed/abc123')).toContain('/embed/abc123')
  })

  it('el minuto donde arranca se respeta, y no entra un texto como número', () => {
    expect(embed('https://www.youtube.com/watch?v=abc123&t=90s')).toContain('start=90')
    expect(embed('https://www.youtube.com/watch?v=abc123&t=hola')).toContain('start=0')
  })

  it('el canal no es un video: un embebido a un canal apunta a un video que no existe', () => {
    expect(embed('https://www.youtube.com/@educabot')).toBeUndefined()
    expect(embed('https://www.youtube.com/watch')).toBeUndefined()
    expect(embed('https://www.youtube.com/playlist?list=PL123')).toBeUndefined()
  })

  it('el host se lee sin importar cómo se escribió', () => {
    expect(embed('https://WWW.YouTube.COM/watch?v=abc123')).toContain('/embed/abc123')
  })

  it('un short trae su miniatura, igual que la larga', () => {
    expect(String(bookmarkProps('https://www.youtube.com/shorts/abc123').image)).toContain('/vi/abc123/')
  })
})

describe('un Vimeo, que tiene su propia forma', () => {
  it('el número del video es lo que importa, y el resto de la ruta no estorba', () => {
    const hit = classify('https://vimeo.com/123456789/abcdef')
    expect(String(hit?.props.src)).toBe('https://player.vimeo.com/video/123456789')
  })

  it('un perfil no es un video: queda como tarjeta, que es lo que se puede mostrar de él', () => {
    expect(classify('https://vimeo.com/educabot')?.type).toBe('bookmark')
  })
})

describe('lo que no es una dirección para embeber', () => {
  it('algo que no es una dirección no se clasifica', () => {
    expect(classify('esto no es una url')).toBeUndefined()
  })

  it('una que ejecuta código tampoco, aunque tenga forma de dirección', () => {
    expect(classify('javascript:alert(1)')).toBeUndefined()
    expect(classify('data:text/html,<b>x</b>')).toBeUndefined()
  })

  it('un archivo con la extensión en mayúsculas se reconoce igual', () => {
    expect(classify('https://x.ar/FOTO.PNG')?.type).toBe('image')
    expect(classify('https://x.ar/audio.MP3')?.type).toBe('audio')
  })

  it('una extensión con parámetros atrás también', () => {
    expect(classify('https://x.ar/foto.png?v=2')?.type).toBe('image')
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
