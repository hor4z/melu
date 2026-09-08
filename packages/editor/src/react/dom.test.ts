/**
 * El puente entre el DOM y el modelo, medido en jsdom.
 *
 * Es el archivo más peligroso del package y no tenía un test: cada tecla pasa por acá dos veces,
 * una para leer dónde está el caret y otra para dejarlo donde el modelo dice. Un error de uno acá
 * no se ve como un error, se ve como que "a veces la letra sale en el lugar equivocado".
 *
 * No hace falta un navegador para casi nada de esto: contar caracteres adentro de una región,
 * saltear lo que no es texto del bloque, y leer las marcas escritas en un atributo son operaciones
 * sobre un árbol, y el árbol lo arma el mismo editor al montarse.
 */

import { describe, expect, it } from 'vitest'
import { act } from '@testing-library/react'
import {
  BLOCK_ATTR,
  domFromOffset,
  offsetFromDom,
  offsetOfCaret,
  placeRange,
  readMarks,
  readSelection,
  readText,
  textNodesOf,
  textRootOf,
  writeMarks,
} from './dom.ts'
import { blocks, caretTo, mount } from '../test/view.tsx'
import { plain } from '../core/index.ts'

/** La superficie, que es el contenedor donde vive todo. */
const superficie = () => document.querySelector<HTMLElement>('[data-melu-surface]')!

/** El id del bloque en esa posición. */
const idDe = (i: number) => blocks()[i]!.closest(`[${BLOCK_ATTR}]`)!.getAttribute(BLOCK_ATTR)!

describe('leer el texto de vuelta', () => {
  it('lo que se ve es lo que dice el modelo', () => {
    mount('El patio mide doce metros')
    expect(plain(readText(blocks()[0]!))).toBe('El patio mide doce metros')
  })

  it('con su formato: cada pedazo se lee con las marcas que tenía', () => {
    const { editor } = mount('El patio')
    act(() => {
      editor.setSelection({
        kind: 'text',
        anchor: { block: editor.doc.blocks[editor.doc.root]!.children[0]!, offset: 3 },
        head: { block: editor.doc.blocks[editor.doc.root]!.children[0]!, offset: 8 },
      })
      editor.run('toggleMark', { type: 'bold' })
    })
    const leido = readText(blocks()[0]!)
    expect(leido.find((sp) => sp.text === 'patio')?.marks).toEqual([{ type: 'bold' }])
  })

  it('una región vacía es texto vacío, y no un renglón: el navegador deja un br ahí', () => {
    mount('')
    const el = blocks()[0]!
    el.replaceChildren(document.createElement('br'))
    expect(readText(el)).toEqual([])
  })

  it('un salto de renglón adentro del bloque sí cuenta', () => {
    mount('uno')
    const el = blocks()[0]!
    el.append(document.createElement('br'))
    expect(plain(readText(el))).toBe('uno\n')
  })

  it('lo que el editor marcó como suyo no aporta texto: un ícono o un asa no son contenido', () => {
    mount('uno')
    const el = blocks()[0]!
    const adorno = document.createElement('span')
    adorno.setAttribute('data-melu-skip', '')
    adorno.textContent = 'ADORNO'
    el.append(adorno)
    expect(plain(readText(el))).toBe('uno')
  })

  it('el texto de un bloque anidado tampoco: cada bloque tiene el suyo', () => {
    mount('- padre\n  - hijo')
    expect(plain(readText(blocks()[0]!))).toBe('padre')
  })
})

describe('contar hasta el caret', () => {
  it('un punto sobre un texto cuenta lo que hay antes, adentro de toda la región', () => {
    mount('El patio')
    const el = blocks()[0]!
    const nodos = textNodesOf(el)
    expect(offsetFromDom(el, nodos[0]!, 3)).toBe(3)
  })

  it('un punto sobre el elemento y no sobre un texto cuenta los hijos que quedaron atrás', () => {
    mount('El patio')
    const el = blocks()[0]!
    // Como lo deja el navegador cuando el caret está al final de todo.
    expect(offsetFromDom(el, el, el.childNodes.length)).toBe(8)
  })

  it('lo salteado no suma: un adorno en el medio no corre el caret', () => {
    mount('uno')
    const el = blocks()[0]!
    const adorno = document.createElement('span')
    adorno.setAttribute('data-melu-skip', '')
    adorno.textContent = 'ADORNO'
    el.prepend(adorno)
    expect(offsetFromDom(el, el, el.childNodes.length)).toBe(3)
  })

  it('y la vuelta cae en el mismo lugar', () => {
    mount('El patio mide')
    const el = blocks()[0]!
    for (const n of [0, 3, 8, 13]) {
      const { node, offset } = domFromOffset(el, n)
      expect(offsetFromDom(el, node, offset), `offset ${n}`).toBe(n)
    }
  })

  it('un offset más largo que el texto cae al final, y no afuera', () => {
    mount('uno')
    const el = blocks()[0]!
    const { node, offset } = domFromOffset(el, 99)
    expect(offsetFromDom(el, node, offset)).toBe(3)
  })
})

describe('lo que dice el navegador que está elegido', () => {
  it('un caret adentro de un bloque se lee como ese bloque y ese offset', () => {
    const { editor } = mount('El patio\n\nmide doce')
    caretTo(editor, 0, 3)
    expect(readSelection(superficie())).toEqual({
      anchor: { block: idDe(0), offset: 3 },
      head: { block: idDe(0), offset: 3 },
    })
  })

  it('un rango que cruza bloques se lee con cada punta en el suyo', () => {
    const { editor } = mount('El patio\n\nmide doce')
    caretTo(editor, 0, 3)
    const sel = document.getSelection()!
    sel.setBaseAndExtent(textNodesOf(blocks()[0]!)[0]!, 3, textNodesOf(blocks()[1]!)[0]!, 4)
    expect(readSelection(superficie())).toEqual({
      anchor: { block: idDe(0), offset: 3 },
      head: { block: idDe(1), offset: 4 },
    })
  })

  it('hecho para arriba se lee para arriba: el ancla es donde arrancó', () => {
    const { editor } = mount('El patio\n\nmide doce')
    caretTo(editor, 1, 4)
    const sel = document.getSelection()!
    sel.setBaseAndExtent(textNodesOf(blocks()[1]!)[0]!, 4, textNodesOf(blocks()[0]!)[0]!, 3)
    const leido = readSelection(superficie())!
    expect(leido.anchor.block).toBe(idDe(1))
    expect(leido.head.block).toBe(idDe(0))
  })

  it('una selección que se fue afuera del editor no se lee como propia', () => {
    mount('uno')
    const afuera = document.createElement('p')
    afuera.textContent = 'otra cosa'
    document.body.append(afuera)
    const sel = document.getSelection()!
    sel.setBaseAndExtent(afuera.firstChild!, 0, afuera.firstChild!, 2)
    expect(readSelection(superficie())).toBeNull()
  })

  it('sin selección no inventa una', () => {
    mount('uno')
    document.getSelection()!.removeAllRanges()
    expect(readSelection(superficie())).toBeNull()
  })

  it('el offset del caret adentro de una región es null cuando el caret está en otra', () => {
    const { editor } = mount('uno\n\ndos')
    caretTo(editor, 0, 2)
    expect(offsetOfCaret(blocks()[0]!)).toBe(2)
    expect(offsetOfCaret(blocks()[1]!)).toBeNull()
  })
})

describe('dejar el rango donde el modelo dice', () => {
  it('un rango que cruza bloques queda puesto en el DOM', () => {
    const { editor } = mount('El patio\n\nmide doce')
    caretTo(editor, 0, 0)
    placeRange(superficie(), { block: idDe(0), offset: 3 }, { block: idDe(1), offset: 4 })
    const sel = document.getSelection()!
    expect(offsetFromDom(blocks()[0]!, sel.anchorNode!, sel.anchorOffset)).toBe(3)
    expect(offsetFromDom(blocks()[1]!, sel.focusNode!, sel.focusOffset)).toBe(4)
  })

  it('hacia un bloque que ya no está no hace nada, en lugar de tirar', () => {
    const { editor } = mount('uno\n\ndos')
    caretTo(editor, 0, 1)
    expect(() => placeRange(superficie(), { block: 'fantasma', offset: 0 }, { block: 'fantasma', offset: 0 })).not.toThrow()
  })

  it('la región de un bloque se encuentra por su id, aunque el id tenga caracteres raros', () => {
    mount('uno')
    const el = blocks()[0]!.closest(`[${BLOCK_ATTR}]`)!
    el.setAttribute(BLOCK_ATTR, 'id"raro')
    expect(textRootOf(superficie(), 'id"raro')).toBe(blocks()[0])
  })
})

describe('las marcas escritas en el atributo', () => {
  it('van y vuelven iguales', () => {
    const el = document.createElement('span')
    el.setAttribute('data-melu-marks', writeMarks([{ type: 'bold' }, { type: 'link', value: 'https://x.ar' }]))
    expect(readMarks(el)).toEqual([{ type: 'bold' }, { type: 'link', value: 'https://x.ar' }])
  })

  it('sin atributo es "no sé", y con el atributo vacío es "ninguna"', () => {
    const el = document.createElement('span')
    expect(readMarks(el)).toBeUndefined()
    el.setAttribute('data-melu-marks', '')
    expect(readMarks(el)).toEqual([])
  })

  it('un atributo roto no rompe el render: se lee como si no estuviera', () => {
    const el = document.createElement('span')
    el.setAttribute('data-melu-marks', '{no es json')
    expect(readMarks(el)).toBeUndefined()
  })
})
