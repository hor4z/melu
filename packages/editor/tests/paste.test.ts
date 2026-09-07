/**
 * Pegar, que es como se escribe la mayoría de una actividad de verdad.
 *
 * Alguien tiene el material en un documento, en un chat o en una página, y lo trae. Así que lo que
 * se prueba acá es el orden en que se le pregunta a cada formato y qué decide cada uno: nuestro
 * propio portapapeles primero (para que cortar y pegar adentro del editor no pierda nada), después
 * HTML, después markdown, y una dirección sola se convierte en lo que apunta.
 *
 * El caso que más importa es el aburrido: pegar un párrafo de prosa en el medio de una oración
 * tiene que meter texto, no cortar el bloque en dos.
 */

import { describe, expect, it } from 'vitest'
import { at, caretAt, editorWith, makeFullEditor, selectRange, sketch, textAt, typeAt } from './helpers.ts'
import { clipboardFor, looksLikeMarkdown, MELU_MIME, PASTED_URL, type PastedUrl } from '../src/plugins/paste.ts'
import { plain } from '../src/core/text.ts'
import { assertValid } from '../src/core/doc.ts'

describe('nuestro propio portapapeles', () => {
  it('lo copiado vuelve exacto, con su anidado y su formato', () => {
    const origen = editorWith('- uno', '  - anidado', '**negrita**')
    const datos = clipboardFor(origen.doc, origen.doc.blocks[origen.doc.root]!.children)

    const destino = editorWith('')
    caretAt(destino, 0, 0)
    expect(destino.handlePaste(datos)).toBe(true)
    assertValid(destino.doc)
    expect(sketch(destino)).toEqual(['bulleted_list: uno', '  bulleted_list: anidado', 'paragraph: negrita'])
    const marcado = destino.block(at(destino, 2))!.text!.at(-1)!
    expect(marcado.marks).toEqual([{ type: 'bold' }])
  })

  it('pegar dos veces no repite ids', () => {
    const origen = editorWith('uno')
    const datos = clipboardFor(origen.doc, origen.doc.blocks[origen.doc.root]!.children)
    const destino = editorWith('destino')
    caretAt(destino, 0, 7)
    destino.handlePaste(datos)
    destino.handlePaste(datos)
    const ids = Object.keys(destino.doc.blocks)
    expect(new Set(ids).size).toBe(ids.length)
    assertValid(destino.doc)
  })

  it('gana sobre el HTML y el texto llano cuando vienen los tres', () => {
    const origen = editorWith('> La cita')
    const datos = clipboardFor(origen.doc, origen.doc.blocks[origen.doc.root]!.children)
    expect(Object.keys(datos)).toEqual([MELU_MIME, 'text/html', 'text/plain'])

    const destino = editorWith('')
    caretAt(destino, 0, 0)
    destino.handlePaste({ ...datos, 'text/plain': 'esto no', 'text/html': '<p>esto tampoco</p>' })
    expect(typeAt(destino, 0)).toBe('quote')
  })

  it('lo que se copia también sirve afuera: sale como HTML y como markdown', () => {
    const origen = editorWith('# Medir', '- uno')
    const datos = clipboardFor(origen.doc, origen.doc.blocks[origen.doc.root]!.children)
    expect(datos['text/html']).toContain('<h1')
    expect(datos['text/plain']).toBe('# Medir\n- uno')
  })

  it('copiar un bloque solo no arrastra a sus hermanos', () => {
    const origen = editorWith('uno', 'dos', 'tres')
    const datos = clipboardFor(origen.doc, [at(origen, 1)])
    expect(datos['text/plain']).toBe('dos')
  })

  it('un payload roto no se traga el pegado: lo toma el siguiente formato', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ [MELU_MIME]: '{no es json', 'text/html': '<h2>Rescatado</h2>' })
    expect(sketch(e)).toEqual(['heading_2: Rescatado'])
  })
})

describe('HTML de afuera', () => {
  it('lo que pega un navegador llega como bloques', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/html': '<h1>Medir</h1><p>Con la <b>cinta</b></p><ul><li>uno</li><li>dos</li></ul>' })
    expect(sketch(e)).toEqual([
      'heading_1: Medir',
      'paragraph: Con la cinta',
      'bulleted_list: uno',
      'bulleted_list: dos',
    ])
  })

  it('el formato se conserva', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/html': '<p>Con la <b>cinta</b></p>' })
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([{ type: 'bold' }])
  })

  it('un HTML que es solo el meta del portapapeles se ignora y pasa al texto', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/html': '<meta charset="utf-8">', 'text/plain': 'solo texto' })
    expect(textAt(e, 0)).toBe('solo texto')
  })
})

describe('markdown pegado', () => {
  it('varias líneas con markup llegan como bloques', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/plain': '# Medir el patio\n\n- uno\n- dos\n\n1. primero' })
    expect(sketch(e)).toEqual([
      'heading_1: Medir el patio',
      'bulleted_list: uno',
      'bulleted_list: dos',
      'numbered_list: primero',
    ])
  })

  it('prosa de varias líneas sin markup no se interpreta como markdown', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    expect(e.handlePaste({ 'text/plain': 'Primera línea.\nSegunda línea.' })).toBe(true)
    // Un salto solo queda adentro del bloque, como un Shift+Enter, y nada se volvió un título.
    expect(sketch(e)).toEqual(['paragraph: Primera línea.\nSegunda línea.'])
  })

  it('un renglón vacío separa párrafos', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/plain': 'Primer párrafo.\n\nSegundo párrafo.' })
    expect(sketch(e)).toEqual(['paragraph: Primer párrafo.', 'paragraph: Segundo párrafo.'])
  })

  it('la heurística mira si hay markup de verdad', () => {
    expect(looksLikeMarkdown('# Un título\ny algo')).toBe(true)
    expect(looksLikeMarkdown('- uno\n- dos')).toBe(true)
    expect(looksLikeMarkdown('| a | b |\n| 1 | 2 |')).toBe(true)
    expect(looksLikeMarkdown('Una oración cualquiera.\nY otra.')).toBe(false)
    expect(looksLikeMarkdown('Con **negrita** en una línea')).toBe(true)
    expect(looksLikeMarkdown('Una sola línea sin nada')).toBe(false)
  })

  it('varios bloques pegados en el medio de una oración van entre las dos mitades', () => {
    const e = editorWith('Antes y después')
    caretAt(e, 0, 6)
    e.handlePaste({ 'text/plain': '# Uno\n\n## Dos' })
    // Y no después de la cola, que es donde queda el caret al partir el bloque.
    expect(sketch(e)).toEqual([
      'paragraph: Antes ',
      'heading_1: Uno',
      'heading_2: Dos',
      'paragraph: y después',
    ])
  })

  it('una tabla pegada llega con sus celdas', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/plain': '| Lado | Medida |\n| --- | --- |\n| Largo | 12 |' })
    const tabla = Object.values(e.doc.blocks).find((b) => b.type === 'table')
    expect(tabla).toBeDefined()
    expect(tabla!.children).toHaveLength(2)
  })
})

describe('texto llano', () => {
  it('un párrafo suelto se inserta como texto y no como bloque nuevo', () => {
    const e = editorWith('Medir el patio')
    caretAt(e, 0, 5)
    e.handlePaste({ 'text/plain': ' bien' })
    expect(sketch(e)).toEqual(['paragraph: Medir bien el patio'])
  })

  it('pegar en el medio de una oración no la corta en dos', () => {
    const e = editorWith('Medir el patio')
    caretAt(e, 0, 6)
    e.handlePaste({ 'text/plain': 'todo ' })
    expect(sketch(e)).toHaveLength(1)
    expect(textAt(e, 0)).toBe('Medir todo el patio')
  })

  it('reemplaza lo que estaba seleccionado', () => {
    const e = editorWith('Medir el patio')
    selectRange(e, [0, 6], [0, 8])
    e.handlePaste({ 'text/plain': 'todo' })
    expect(textAt(e, 0)).toBe('Medir todo patio')
  })

  it('adentro de un bloque de código todo es texto, hasta lo que parece markdown', () => {
    const e = editorWith('```python', 'x = 1', '```')
    expect(typeAt(e, 0)).toBe('code')
    caretAt(e, 0, 5)
    e.handlePaste({ 'text/plain': '\n# no es un título\n- ni una lista' })
    expect(sketch(e)).toHaveLength(1)
    expect(textAt(e, 0)).toBe('x = 1\n# no es un título\n- ni una lista')
  })

  it('un pegado vacío no hace nada', () => {
    const e = editorWith('uno')
    caretAt(e, 0, 3)
    expect(e.handlePaste({ 'text/plain': '' })).toBe(false)
    expect(e.handlePaste({})).toBe(false)
  })
})

describe('una dirección pegada', () => {
  /** Pega y devuelve lo que el pegado anotó en el meta, que es lo que lee el menú. */
  const pegar = (e: ReturnType<typeof editorWith>, url: string) => {
    let meta: PastedUrl | undefined
    const stop = e.subscribe((c) => {
      const found = c.tr?.meta[PASTED_URL] as PastedUrl | undefined
      if (found) meta = found
    })
    const did = e.handlePaste({ 'text/plain': url })
    stop()
    return { did, meta }
  }

  it('se pega como link y no como bloque: pegar no adivina', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { did } = pegar(e, 'https://www.youtube.com/watch?v=abc123')
    expect(did).toBe(true)
    // Lo menos destructivo: el texto que se pegó, con su link. El resto lo ofrece el menú.
    expect(typeAt(e, 0)).toBe('paragraph')
    expect(textAt(e, 0)).toBe('https://www.youtube.com/watch?v=abc123')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([
      { type: 'link', value: 'https://www.youtube.com/watch?v=abc123' },
    ])
  })

  it('anota el rango exacto que ocupó, para poder deshacerlo si se elige otra cosa', () => {
    const e = makeFullEditor([{ type: 'paragraph', text: [{ text: 'mirá: ' }] }])
    caretAt(e, 0, 6)
    const { meta } = pegar(e, 'https://educabot.com')
    expect(meta).toMatchObject({ url: 'https://educabot.com', from: 6, to: 6 + 'https://educabot.com'.length })
    expect(textAt(e, 0)).toBe('mirá: https://educabot.com')
  })

  it('la de YouTube ofrece el video, ya con la dirección que se puede incrustar', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://www.youtube.com/watch?v=abc123')
    expect(meta!.becomes).toMatchObject({ type: 'video' })
    expect(String(meta!.becomes!.props.src)).toContain('youtube-nocookie.com/embed/abc123')
  })

  it('una de YouTube con lista y radio adentro igual saca el video que importa', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://www.youtube.com/watch?v=1WHPExTeOwg&list=RD1WHPExTeOwg&start_radio=1')
    expect(String(meta!.becomes!.props.src)).toBe('https://www.youtube-nocookie.com/embed/1WHPExTeOwg')
  })

  it('la de un video con segundo de arranque se lo lleva', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://www.youtube.com/watch?v=abc123&t=90')
    expect(String(meta!.becomes!.props.src)).toContain('start=90')
  })

  it('la de una imagen ofrece la imagen', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://x.ar/patio.png')
    expect(meta!.becomes).toMatchObject({ type: 'image', props: { src: 'https://x.ar/patio.png' } })
  })

  it('la de un audio ofrece el audio, con el nombre del archivo', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://x.ar/consigna.mp3')
    expect(meta!.becomes).toMatchObject({ type: 'audio', props: { title: 'consigna.mp3' } })
  })

  it('la de GeoGebra ofrece incrustarlo, con su servicio anotado', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://www.geogebra.org/m/abcd1234')
    expect(meta!.becomes).toMatchObject({ type: 'embed', props: { provider: 'GeoGebra' } })
  })

  it('una página cualquiera no ofrece nada especial: el menú igual da la tarjeta', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    const { meta } = pegar(e, 'https://educabot.com/algo')
    expect(meta!.becomes).toBeUndefined()
    expect(textAt(e, 0)).toBe('https://educabot.com/algo')
  })

  it('sobre texto seleccionado lo convierte en link, y no ofrece nada: ya se dijo qué hacer', () => {
    const e = editorWith('ver la página')
    selectRange(e, [0, 4], [0, 13])
    const { meta } = pegar(e, 'https://educabot.com')
    expect(meta).toBeUndefined()
    expect(sketch(e)).toEqual(['paragraph: ver la página'])
    const conLink = e.block(at(e, 0))!.text!.find((sp) => sp.marks?.some((m) => m.type === 'link'))
    expect(conLink).toMatchObject({ text: 'la página' })
  })

  it('sobre una selección que cruza dos bloques linkea lo elegido y no un pedazo cualquiera', () => {
    const e = editorWith('primero uno', 'segundo dos')
    selectRange(e, [0, 8], [1, 7])
    pegar(e, 'https://educabot.com')
    // El bug: mezclaba el offset de un bloque con el del otro, linkeaba un rango arbitrario del
    // segundo y la dirección no entraba a ningún lado.
    const primero = e.block(at(e, 0))!.text!
    const segundo = e.block(at(e, 1))!.text!
    const linkEn = (t: typeof primero) => t.filter((sp) => sp.marks?.some((m) => m.type === 'link')).map((sp) => sp.text).join('')
    expect(linkEn(primero)).toBe('uno')
    expect(linkEn(segundo)).toBe('segundo')
    expect(sketch(e)).toEqual(['paragraph: primero uno', 'paragraph: segundo dos'])
  })

  it('en el medio de una oración no la corta: queda la oración con el link adentro', () => {
    const e = makeFullEditor([{ type: 'paragraph', text: [{ text: 'mirá esto: ' }] }])
    caretAt(e, 0, 11)
    pegar(e, 'https://educabot.com')
    expect(sketch(e)).toEqual(['paragraph: mirá esto: https://educabot.com'])
  })

  it('una dirección que no es http no se convierte en nada', () => {
    const e = editorWith('')
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/plain': 'javascript:alert(1)' })
    expect(typeAt(e, 0)).toBe('paragraph')
    expect(textAt(e, 0)).toBe('javascript:alert(1)')
    expect(e.block(at(e, 0))!.text!.every((sp) => !sp.marks)).toBe(true)
  })

  it('adentro de un bloque de código una dirección es texto, sin link ni menú', () => {
    const e = editorWith('```python', 'x = 1', '```')
    caretAt(e, 0, 5)
    const { meta } = pegar(e, 'https://x.ar/patio.png')
    expect(meta).toBeUndefined()
    expect(sketch(e)).toHaveLength(1)
    expect(textAt(e, 0)).toContain('https://x.ar/patio.png')
  })
})

describe('deshacer un pegado', () => {
  it('un pegado de varios bloques se deshace de una vez', () => {
    const e = editorWith('antes')
    caretAt(e, 0, 5)
    const bloquesAntes = Object.keys(e.doc.blocks).length
    e.handlePaste({ 'text/plain': '# Uno\n\n## Dos\n\n- tres' })
    expect(Object.keys(e.doc.blocks).length).toBeGreaterThan(bloquesAntes)
    e.undo()
    expect(sketch(e)).toEqual(['paragraph: antes'])
  })
})

describe('lo que llega de un agente por el mismo camino', () => {
  it('el markdown de un modelo entra igual que un pegado', () => {
    const e = makeFullEditor()
    caretAt(e, 0, 0)
    e.handlePaste({ 'text/plain': '## Lo que escribió un modelo\n\n1. Medir\n2. Anotar' })
    expect(sketch(e).map((l) => l.split(':')[0])).toEqual(['heading_2', 'numbered_list', 'numbered_list'])
    expect(plain(e.block(at(e, 0))!.text)).toBe('Lo que escribió un modelo')
  })
})
