// Las reglas de tipeo son la parte de la experiencia que no se explica: alguien escribe "# " y
// aparece un título, y nunca abre el menú. Cada test es uno de esos atajos, escrito como se teclea.

import { describe, expect, it } from 'vitest'
import { at, caretAt, makeEditor, press, sketch, textAt, type, typeAt } from '../test/engine.ts'

/** Un editor vacío con el caret puesto: es el punto de partida de todos estos tests. */
function blank() {
  const e = makeEditor()
  caretAt(e, 0, 0)
  return e
}

describe('bloques que aparecen al tipear', () => {
  it('"# " es un título', () => {
    const e = blank()
    type(e, '# Medir el patio')
    expect(sketch(e)).toEqual(['heading_1: Medir el patio'])
  })

  it('"## " y "### " son los otros dos niveles', () => {
    const a = blank()
    type(a, '## dos')
    expect(typeAt(a, 0)).toBe('heading_2')
    const b = blank()
    type(b, '### tres')
    expect(typeAt(b, 0)).toBe('heading_3')
  })

  it('"- " es una lista, y también "* " y "+ "', () => {
    for (const marca of ['- ', '* ', '+ ']) {
      const e = blank()
      type(e, `${marca}una cinta`)
      expect(sketch(e)).toEqual(['bulleted_list: una cinta'])
    }
  })

  it('"1. " es una lista numerada', () => {
    const e = blank()
    type(e, '1. medir')
    expect(sketch(e)).toEqual(['numbered_list: medir'])
  })

  it('un número que no es 1 se guarda como el arranque', () => {
    const e = blank()
    type(e, '5. medir')
    expect(e.block(at(e, 0))!.props).toMatchObject({ start: 5 })
  })

  it('"[] " es un checklist', () => {
    const e = blank()
    type(e, '[] traer la cinta')
    expect(sketch(e)).toEqual(['todo: traer la cinta'])
    expect(e.block(at(e, 0))!.props).toMatchObject({ checked: false })
  })

  it('"> " es un desplegable, como en Notion', () => {
    const e = blank()
    type(e, '> la pista')
    expect(sketch(e)).toEqual(['toggle: la pista'])
  })

  it('un guion doble no aparece en ningún lado: no hay regla que lo produzca', () => {
    const e = blank()
    type(e, 'medir -- contar')
    expect(textAt(e, 0)).toBe('medir -- contar')
  })

  it('las comillas quedan como se escriben', () => {
    const e = blank()
    type(e, '"medir el patio"')
    expect(textAt(e, 0)).toBe('"medir el patio"')
  })

  it('"| " es una cita', () => {
    const e = blank()
    type(e, '| lo dijo alguien')
    expect(sketch(e)).toEqual(['quote: lo dijo alguien'])
  })

  it('"!! " es un destacado', () => {
    const e = blank()
    type(e, '!! ojo con esto')
    expect(sketch(e)).toEqual(['callout: ojo con esto'])
  })

  it('"```py " es un bloque de código con su lenguaje', () => {
    const e = blank()
    type(e, '```py ')
    expect(typeAt(e, 0)).toBe('code')
    expect(e.block(at(e, 0))!.props).toMatchObject({ language: 'py' })
  })

  it('"--- " es un separador y deja un párrafo abajo para seguir', () => {
    const e = blank()
    type(e, '--- ')
    expect(sketch(e)).toEqual(['divider', 'paragraph'])
  })

  it('la regla come los caracteres que la dispararon', () => {
    const e = blank()
    type(e, '# ')
    expect(textAt(e, 0)).toBe('')
  })

  it('en el medio de una línea no se dispara', () => {
    const e = blank()
    type(e, 'lo medimos # asi')
    expect(sketch(e)).toEqual(['paragraph: lo medimos # asi'])
  })

  it('una regla no se dispara dos veces sobre el mismo bloque', () => {
    const e = blank()
    type(e, '# Título')
    caretAt(e, 0, 0)
    type(e, '# ')
    expect(typeAt(e, 0)).toBe('heading_1')
    expect(textAt(e, 0)).toBe('# Título')
  })
})

describe('formato que aparece al tipear', () => {
  it('"**negrita**" se pone en negrita y se come los asteriscos', () => {
    const e = blank()
    type(e, 'medir **rápido**')
    expect(textAt(e, 0)).toBe('medir rápido')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([{ type: 'bold' }])
  })

  it('un asterisco solo es cursiva', () => {
    const e = blank()
    type(e, 'medir *rápido*')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([{ type: 'italic' }])
  })

  it('los backticks son código en línea', () => {
    const e = blank()
    type(e, 'usá `print(1)`')
    expect(textAt(e, 0)).toBe('usá print(1)')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([{ type: 'code' }])
  })

  it('"~~" tacha', () => {
    const e = blank()
    type(e, 'no ~~esto~~')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([{ type: 'strike' }])
  })

  it('"==" resalta', () => {
    const e = blank()
    type(e, 'ojo ==acá==')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toEqual([{ type: 'bg', value: 'yellow' }])
  })

  it('el caret queda después de lo marcado, no adentro', () => {
    const e = blank()
    type(e, '**medir**')
    type(e, ' el patio')
    expect(textAt(e, 0)).toBe('medir el patio')
    expect(e.block(at(e, 0))!.text!.at(-1)!.marks).toBeUndefined()
  })

  it('una dirección escrita queda como link', () => {
    const e = blank()
    type(e, 'ver https://educabot.com ')
    const conLink = e.block(at(e, 0))!.text!.find((s) => s.marks?.some((m) => m.type === 'link'))
    expect(conLink?.text).toBe('https://educabot.com')
  })

  it('en un bloque de código no se aplica formato: lo que se escribe es literal', () => {
    const e = blank()
    type(e, '```py ')
    type(e, 'x = **2**')
    expect(textAt(e, 0)).toBe('x = **2**')
    expect(e.block(at(e, 0))!.text!.every((s) => !s.marks)).toBe(true)
  })

  it('una lista que empieza con asterisco es una lista, no una cursiva', () => {
    const e = blank()
    type(e, '* una cinta')
    expect(typeAt(e, 0)).toBe('bulleted_list')
  })
})

describe('los atajos de teclado', () => {
  it('Mod+Alt+2 convierte a título 2', () => {
    const e = blank()
    type(e, 'Medir')
    press(e, 'Mod-Alt-2')
    expect(typeAt(e, 0)).toBe('heading_2')
  })

  it('Mod+Alt+0 vuelve a texto', () => {
    const e = blank()
    type(e, '# Medir')
    press(e, 'Mod-Alt-0')
    expect(typeAt(e, 0)).toBe('paragraph')
  })

  it('Mod+Alt+T mete un separador', () => {
    const e = blank()
    type(e, 'antes')
    press(e, 'Mod-Alt-t')
    expect(sketch(e).filter((l) => l.startsWith('divider'))).toHaveLength(1)
  })

  it('una tecla sin binding no se toma, así el navegador sigue haciendo lo suyo', () => {
    const e = blank()
    expect(press(e, 'Mod-Shift-F9')).toBe(false)
  })

  it('Escape pasa de escribir a tener el bloque seleccionado', () => {
    const e = blank()
    type(e, 'algo')
    press(e, 'Escape')
    expect(e.selection?.kind).toBe('blocks')
  })
})
