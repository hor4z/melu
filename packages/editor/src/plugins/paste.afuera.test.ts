/**
 * Lo que llega pegado de otro programa.
 *
 * Una guía no escribe la actividad en el editor: la trae de un Word que ya tenía, de una página, de
 * una hoja de cálculo. Ese HTML es sucio a propósito (Word manda su propio dialecto) y a veces es
 * hostil, porque nadie mira lo que copió antes de pegarlo. Los dos casos se prueban acá con el HTML
 * tal como lo mandan esos programas, y no con una versión limpia inventada para que pase el test.
 */

import { describe, expect, it } from 'vitest'
import { fromHtml } from '../core/index.ts'
import { makeFullEditor, sketch, textAt } from '../test/engine.ts'

/** Los tipos que salieron, en orden y anidados, que es lo que se quiere mirar. */
const forma = (html: string) => sketch(makeFullEditor(fromHtml(html)))

/** El link de la primera palabra, o nada. */
const linkDe = (html: string) => {
  const e = makeFullEditor(fromHtml(html))
  const marcas = e.block(e.doc.blocks[e.doc.root]!.children[0]!)?.text?.[0]?.marks ?? []
  return marcas.find((m) => m.type === 'link')?.value
}

describe('HTML hostil', () => {
  it('un script pegado no deja su código escrito en la página', () => {
    // No ejecuta (el parseo es inerte), pero dejaba el cuerpo del script como un párrafo.
    expect(forma('<p>hola</p><script>alert(1)</script>')).toEqual(['paragraph: hola'])
  })

  it('una hoja de estilos pegada tampoco', () => {
    expect(forma('<style>p{color:red}</style><p>hola</p>')).toEqual(['paragraph: hola'])
  })

  it('un link que ejecuta código entra como texto y sin link', () => {
    // Un `javascript:` en un href es un click que corre código adentro de la app, con su sesión.
    expect(linkDe('<a href="javascript:alert(1)">click</a>')).toBeUndefined()
    expect(forma('<a href="javascript:alert(1)">click</a>')).toEqual(['paragraph: click'])
  })

  it('los disfraces del mismo truco tampoco pasan', () => {
    expect(linkDe('<a href="JavaScript:alert(1)">click</a>')).toBeUndefined()
    expect(linkDe('<a href=" javascript:alert(1)">click</a>')).toBeUndefined()
    expect(linkDe('<a href="java\nscript:alert(1)">click</a>')).toBeUndefined()
    expect(linkDe('<a href="vbscript:msgbox(1)">click</a>')).toBeUndefined()
    expect(linkDe('<a href="data:text/html,<b>x</b>">click</a>')).toBeUndefined()
  })

  it('los links de verdad siguen entrando, que es lo que hay que no romper', () => {
    expect(linkDe('<a href="https://educabot.com">acá</a>')).toBe('https://educabot.com')
    expect(linkDe('<a href="mailto:hola@educabot.com">escribir</a>')).toBe('mailto:hola@educabot.com')
    expect(linkDe('<a href="/actividades/12">otra</a>')).toBe('/actividades/12')
  })

  it('un manejador de eventos en un atributo no llega a ningún lado', () => {
    const e = makeFullEditor(fromHtml('<p onclick="alert(1)">chau</p>'))
    expect(textAt(e, 0)).toBe('chau')
    expect(JSON.stringify(e.doc)).not.toContain('alert')
  })

  it('una imagen que apunta a código no entra como imagen', () => {
    expect(fromHtml('<img src="javascript:alert(1)">')).toEqual([])
    // Y la de siempre sí, incluida la que el sistema pega como datos.
    expect(fromHtml('<img src="https://x.ar/patio.png">')).toHaveLength(1)
    expect(fromHtml('<img src="data:image/png;base64,iVBORw0KGgo=">')).toHaveLength(1)
  })
})

describe('lo que manda Word', () => {
  /** Un párrafo de Word que en realidad es un ítem: el glifo va en un span que Word marca ignorable. */
  const item = (nivel: number, glifo: string, texto: string) =>
    `<p class=MsoListParagraph style='mso-list:l0 level${nivel} lfo1'>` +
    `<span style='mso-list:Ignore'>${glifo}<span style='font:7pt "Times New Roman"'>&nbsp;&nbsp; </span></span>` +
    `<span lang=ES>${texto}</span></p>`

  it('una lista con viñetas vuelve a ser una lista, y no párrafos con un puntito adelante', () => {
    expect(forma(item(1, '·', 'uno') + item(1, '·', 'dos'))).toEqual([
      'bulleted_list: uno',
      'bulleted_list: dos',
    ])
  })

  it('una lista numerada vuelve a ser numerada', () => {
    expect(forma(item(1, '1.', 'uno') + item(1, '2.', 'dos'))).toEqual([
      'numbered_list: uno',
      'numbered_list: dos',
    ])
  })

  it('los niveles vuelven a anidarse, que es lo que Word manda plano', () => {
    expect(forma(item(1, '·', 'uno') + item(2, 'o', 'adentro') + item(1, '·', 'dos'))).toEqual([
      'bulleted_list: uno',
      '  bulleted_list: adentro',
      'bulleted_list: dos',
    ])
  })

  it('un párrafo común de Word sigue siendo un párrafo, con su negrita', () => {
    const e = makeFullEditor(fromHtml(`<p class=MsoNormal><b><span lang=ES>El patio</span></b></p>`))
    expect(textAt(e, 0)).toBe('El patio')
    expect(e.block(e.doc.blocks[e.doc.root]!.children[0]!)!.text![0]!.marks).toEqual([{ type: 'bold' }])
  })
})

describe('lo que manda Notion', () => {
  it('sus listas entran con el anidado puesto', () => {
    expect(
      forma('<ul class="bulleted-list"><li>uno<ul class="bulleted-list"><li>anidado</li></ul></li></ul>'),
    ).toEqual(['bulleted_list: uno', '  bulleted_list: anidado'])
  })

  it('su sangría no agrega un bloque de más', () => {
    expect(forma('<div class="indented"><p>abajo</p></div>')).toEqual(['paragraph: abajo'])
  })
})

describe('lo que manda una hoja de cálculo', () => {
  it('una celda combinada no deja la tabla torcida: sigue siendo un rectángulo', () => {
    const e = makeFullEditor(fromHtml('<table><tr><td colspan="2">ancha</td></tr><tr><td>a</td><td>b</td></tr></table>'))
    expect(sketch(e)).toEqual([
      'table',
      '  table_row',
      '    table_cell: ancha',
      '    table_cell',
      '  table_row',
      '    table_cell: a',
      '    table_cell: b',
    ])
  })
})
