import { describe, expect, it } from 'vitest'
import {
  activeMarks,
  canonical,
  clearMark,
  clearMarks,
  concat,
  fromPlain,
  insert,
  isEmpty,
  len,
  marksAt,
  normalize,
  plain,
  rangeHasMark,
  remove,
  replace,
  sameMarks,
  setMark,
  slice,
  span,
  toggleMark,
  wordAt,
  type RichText,
} from './text.ts'

const bold = { type: 'bold' } as const
const italic = { type: 'italic' } as const
const link = (href: string) => ({ type: 'link' as const, value: href })

/** "hola **mundo**", que es el caso de dos runs con el que se rompe casi todo. */
const holaMundo: RichText = [{ text: 'hola ' }, { text: 'mundo', marks: [bold] }]

describe('leer un texto', () => {
  it('el texto llano es la concatenación de los runs', () => {
    expect(plain(holaMundo)).toBe('hola mundo')
    expect(len(holaMundo)).toBe(10)
  })

  it('un texto sin runs está vacío, y uno con un run vacío también', () => {
    expect(isEmpty([])).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty(normalize([{ text: '' }]))).toBe(true)
  })

  it('fromPlain no crea un run cuando no hay nada que poner', () => {
    expect(fromPlain('')).toEqual([])
    expect(fromPlain('hola')).toEqual([{ text: 'hola' }])
  })
})

describe('normalizar', () => {
  it('junta los runs que comparten formato', () => {
    expect(normalize([{ text: 'ho' }, { text: 'la' }])).toEqual([{ text: 'hola' }])
  })

  it('no junta los que no lo comparten', () => {
    expect(normalize([{ text: 'a' }, { text: 'b', marks: [bold] }])).toHaveLength(2)
  })

  it('descarta los runs vacíos', () => {
    expect(normalize([{ text: '' }, { text: 'a' }, { text: '' }])).toEqual([{ text: 'a' }])
  })

  it('las marcas quedan en orden canónico, así dos juegos iguales son arrays iguales', () => {
    const a = span('x', [italic, bold])
    const b = span('x', [bold, italic])
    expect(a.marks).toEqual(b.marks)
    expect(sameMarks(a.marks, b.marks)).toBe(true)
  })

  it('una marca repetida queda una sola vez y gana la última', () => {
    expect(canonical([link('a'), link('b')])).toEqual([link('b')])
  })

  it('escribir letra por letra no hace crecer la cantidad de runs', () => {
    let rt: RichText = []
    for (const ch of 'una consigna larga escrita a mano') rt = insert(rt, len(rt), ch)
    expect(rt).toHaveLength(1)
    expect(plain(rt)).toBe('una consigna larga escrita a mano')
  })
})

describe('cortar y pegar', () => {
  it('corta respetando el formato de cada parte', () => {
    expect(slice(holaMundo, 3, 7)).toEqual([{ text: 'a ' }, { text: 'mu', marks: [bold] }])
  })

  it('un corte de largo cero no devuelve nada', () => {
    expect(slice(holaMundo, 4, 4)).toEqual([])
  })

  it('los offsets se recortan en lugar de explotar', () => {
    expect(plain(slice(holaMundo, -5, 999))).toBe('hola mundo')
    expect(slice([], 3, 8)).toEqual([])
  })

  it('un corte al revés se ordena solo', () => {
    expect(slice(holaMundo, 7, 3)).toEqual(slice(holaMundo, 3, 7))
  })

  it('concat normaliza la junta', () => {
    expect(concat([{ text: 'ho' }], [{ text: 'la' }])).toEqual([{ text: 'hola' }])
  })

  it('cortar en dos y volver a pegar devuelve el original', () => {
    for (let i = 0; i <= len(holaMundo); i++) {
      expect(concat(slice(holaMundo, 0, i), slice(holaMundo, i, len(holaMundo)))).toEqual(normalize(holaMundo))
    }
  })
})

describe('insertar y borrar', () => {
  it('inserta en el medio', () => {
    expect(plain(insert(holaMundo, 5, 'buen '))).toBe('hola buen mundo')
  })

  it('lo insertado hereda el formato de la izquierda', () => {
    const out = insert(holaMundo, 10, '!')
    expect(out).toHaveLength(2)
    expect(out[1]!.text).toBe('mundo!')
  })

  it('al principio hereda el de la derecha, que es lo único que hay', () => {
    const out = insert([{ text: 'mundo', marks: [bold] }], 0, 'el ')
    expect(out).toHaveLength(1)
    expect(out[0]!.marks).toEqual([bold])
  })

  it('borra un rango', () => {
    expect(plain(remove(holaMundo, 0, 5))).toBe('mundo')
  })

  it('borrar nada deja el texto como estaba', () => {
    expect(remove(holaMundo, 4, 4)).toEqual(normalize(holaMundo))
  })

  it('replace es un borrado y una inserción en un solo paso', () => {
    expect(plain(replace(holaMundo, 0, 4, 'chau'))).toBe('chau mundo')
  })
})

describe('qué formato hereda lo que se escribe', () => {
  it('en el medio de un run, el del run', () => {
    expect(marksAt(holaMundo, 8)).toEqual([bold])
  })

  it('en el borde, el de la izquierda: se termina una palabra en negrita y sigue en negrita', () => {
    expect(marksAt(holaMundo, 10)).toEqual([bold])
    expect(marksAt(holaMundo, 5)).toBeUndefined()
  })

  it('un link no se hereda al final: si no, no habría forma de volver a escribir al lado', () => {
    const conLink: RichText = [{ text: 'ver ' }, { text: 'la página', marks: [link('https://x.ar')] }]
    expect(marksAt(conLink, len(conLink))).toBeUndefined()
  })

  it('un link sí se hereda adentro', () => {
    const conLink: RichText = [{ text: 'ver ' }, { text: 'la página', marks: [link('https://x.ar')] }]
    expect(marksAt(conLink, 8)).toEqual([link('https://x.ar')])
  })

  it('escribir al lado de un link no extiende el link', () => {
    const conLink: RichText = [{ text: 'la página', marks: [link('https://x.ar')] }]
    const out = insert(conLink, 9, ' está caída')
    expect(out[1]?.marks).toBeUndefined()
    expect(plain(out)).toBe('la página está caída')
  })
})

describe('poner y quitar formato', () => {
  it('pone una marca sobre un rango, partiendo los runs que hagan falta', () => {
    const out = setMark([{ text: 'hola mundo' }], 0, 4, bold)
    expect(out).toEqual([{ text: 'hola', marks: [bold] }, { text: ' mundo' }])
  })

  it('rangeHasMark solo es cierto si cubre todo el rango', () => {
    expect(rangeHasMark(holaMundo, 5, 10, 'bold')).toBe(true)
    expect(rangeHasMark(holaMundo, 0, 10, 'bold')).toBe(false)
  })

  it('rangeHasMark mira el valor cuando se lo pasan', () => {
    const rt = setMark([{ text: 'x' }], 0, 1, link('https://a.ar'))
    expect(rangeHasMark(rt, 0, 1, 'link', 'https://a.ar')).toBe(true)
    expect(rangeHasMark(rt, 0, 1, 'link', 'https://b.ar')).toBe(false)
  })

  it('un rango a medias se completa primero, y recién el segundo toggle lo quita', () => {
    const once = toggleMark(holaMundo, 0, 10, bold)
    expect(rangeHasMark(once, 0, 10, 'bold')).toBe(true)
    const twice = toggleMark(once, 0, 10, bold)
    expect(rangeHasMark(twice, 0, 10, 'bold')).toBe(false)
  })

  it('quitar una marca deja las otras', () => {
    const rt = setMark(setMark([{ text: 'x' }], 0, 1, bold), 0, 1, italic)
    expect(clearMark(rt, 0, 1, 'bold')[0]!.marks).toEqual([italic])
  })

  it('clearMarks deja el texto pelado', () => {
    expect(clearMarks(holaMundo, 0, 10)).toEqual([{ text: 'hola mundo' }])
  })

  it('activeMarks devuelve solo lo que comparte todo el rango', () => {
    const rt = setMark(holaMundo, 0, 10, italic)
    expect(activeMarks(rt, 0, 10).map((m) => m.type)).toEqual(['italic'])
    expect(activeMarks(rt, 5, 10).map((m) => m.type).sort()).toEqual(['bold', 'italic'])
  })

  it('poner y quitar la misma marca devuelve el texto original', () => {
    const out = clearMark(setMark(holaMundo, 2, 8, italic), 2, 8, 'italic')
    expect(out).toEqual(normalize(holaMundo))
  })
})

describe('límites de palabra', () => {
  it('encuentra la palabra donde está el caret', () => {
    expect(wordAt([{ text: 'medir el patio' }], 7)).toEqual({ from: 6, to: 8 })
  })

  it('pegado al final de una palabra, toma esa palabra', () => {
    // Es lo que hace falta para que Mod+B sin seleccionar ponga en negrita lo que se acaba de
    // escribir, en lugar de no hacer nada.
    expect(wordAt([{ text: 'medir el patio' }], 5)).toEqual({ from: 0, to: 5 })
  })

  it('entre dos espacios no hay palabra', () => {
    expect(wordAt([{ text: 'medir  el' }], 6)).toEqual({ from: 6, to: 6 })
  })

  it('los acentos y la ñ son parte de la palabra', () => {
    expect(wordAt([{ text: 'la señal ya está' }], 5)).toEqual({ from: 3, to: 8 })
  })
})
