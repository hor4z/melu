/**
 * Dónde está parado el editor, que es de lo que dependen todos los comandos.
 *
 * Nada de esto tenía un test propio, y sin embargo cada comando lo llama antes de hacer nada: si
 * `ordered` se equivoca hacia dónde va una selección hecha para arriba, borrar borra otra cosa; si
 * `repair` deja un punto apuntando a un bloque que ya no está, el editor se cuelga al repintar.
 *
 * Se prueba contra un documento de verdad y no contra objetos sueltos: el orden de los bloques y
 * el largo del texto son parte de la respuesta.
 */

import { describe, expect, it } from 'vitest'
import {
  activeBlock,
  atEnd,
  blockSel,
  caret,
  isCollapsed,
  ordered,
  point,
  rangeIn,
  repair,
  sameSelection,
  selectedBlocks,
  spansBlocks,
  textSel,
} from './selection.ts'
import { at, doc as md, ids, makeEditor } from '../test/engine.ts'

/** Tres párrafos y una lista con un hijo: alcanza para que el orden importe. */
const tres = () => makeEditor(md('uno', 'dos', '- tres', '  - cuatro'))

describe('hacia dónde va una selección', () => {
  it('adentro de un bloque, al derecho es del ancla a la cabeza', () => {
    const e = tres()
    const { from, to } = ordered(e.doc, textSel(point(at(e, 0), 1), point(at(e, 0), 3)))
    expect([from.offset, to.offset]).toEqual([1, 3])
  })

  it('adentro de un bloque, al revés se lee al derecho sin dejar de estar al revés', () => {
    const e = tres()
    const sel = textSel(point(at(e, 0), 3), point(at(e, 0), 1))
    expect(ordered(e.doc, sel)).toEqual({ from: point(at(e, 0), 1), to: point(at(e, 0), 3) })
    // El ancla sigue donde estaba: Shift+flecha tiene que poder achicarla desde el mismo lado.
    expect(sel.anchor.offset).toBe(3)
  })

  it('entre bloques, el orden lo pone el documento y no quién arrastró primero', () => {
    const e = tres()
    const deAbajoParaArriba = textSel(point(at(e, 2), 1), point(at(e, 0), 2))
    expect(ordered(e.doc, deAbajoParaArriba).from.block).toBe(at(e, 0))
  })

  it('un hijo va después de su padre, y no después del bloque siguiente', () => {
    const e = tres()
    const sel = textSel(point(at(e, 3), 0), point(at(e, 2), 0))
    expect(ordered(e.doc, sel).from.block).toBe(at(e, 2))
  })
})

describe('qué bloques toca', () => {
  it('un caret toca uno solo', () => {
    const e = tres()
    expect(selectedBlocks(e.doc, caret(at(e, 1), 0))).toEqual([at(e, 1)])
  })

  it('un rango que cruza los toca a todos los del medio', () => {
    const e = tres()
    expect(selectedBlocks(e.doc, textSel(point(at(e, 0), 1), point(at(e, 2), 1)))).toEqual([
      at(e, 0),
      at(e, 1),
      at(e, 2),
    ])
  })

  it('hecho para arriba toca los mismos, en orden de documento', () => {
    const e = tres()
    const arriba = selectedBlocks(e.doc, textSel(point(at(e, 2), 1), point(at(e, 0), 1)))
    expect(arriba).toEqual([at(e, 0), at(e, 1), at(e, 2)])
  })

  it('un bloque elegido que ya no está no cuenta, en lugar de romper al que lo lea', () => {
    const e = tres()
    expect(selectedBlocks(e.doc, blockSel([at(e, 0), 'fantasma']))).toEqual([at(e, 0)])
  })

  it('nada elegido no toca nada', () => {
    const e = tres()
    expect(selectedBlocks(e.doc, null)).toEqual([])
  })
})

describe('cuánto abarca de cada bloque', () => {
  it('del primero, de donde arranca hasta el final', () => {
    const e = tres()
    const sel = textSel(point(at(e, 0), 1), point(at(e, 1), 2))
    expect(rangeIn(e.doc, sel, at(e, 0))).toEqual({ from: 1, to: 3 })
  })

  it('del último, del principio hasta donde termina', () => {
    const e = tres()
    const sel = textSel(point(at(e, 0), 1), point(at(e, 1), 2))
    expect(rangeIn(e.doc, sel, at(e, 1))).toEqual({ from: 0, to: 2 })
  })

  it('de uno del medio, entero', () => {
    const e = tres()
    const sel = textSel(point(at(e, 0), 1), point(at(e, 2), 1))
    expect(rangeIn(e.doc, sel, at(e, 1))).toEqual({ from: 0, to: 3 })
  })

  it('de uno que no toca, nada', () => {
    const e = tres()
    expect(rangeIn(e.doc, caret(at(e, 0), 0), at(e, 1))).toBeNull()
  })

  it('un bloque elegido entero abarca todo su texto: por eso Mod+B funciona igual con bloques', () => {
    const e = tres()
    expect(rangeIn(e.doc, blockSel([at(e, 1)]), at(e, 1))).toEqual({ from: 0, to: 3 })
  })

  it('un offset más largo que el texto se recorta, y no devuelve un pedazo que no existe', () => {
    const e = tres()
    expect(rangeIn(e.doc, textSel(point(at(e, 0), 0), point(at(e, 0), 99)), at(e, 0))).toEqual({ from: 0, to: 3 })
  })
})

describe('traerla de vuelta a un documento que cambió', () => {
  it('un punto que quedó más allá del texto se recorta', () => {
    const e = tres()
    const traida = repair(e.doc, textSel(point(at(e, 0), 99)))
    expect(traida).toEqual(caret(at(e, 0), 3))
  })

  it('si un extremo desapareció, la selección se junta en el que quedó', () => {
    const e = tres()
    const traida = repair(e.doc, textSel(point('fantasma', 0), point(at(e, 1), 2)))
    expect(traida).toEqual(caret(at(e, 1), 2))
  })

  it('si desaparecieron los dos, no queda nada apuntando a nada', () => {
    const e = tres()
    expect(repair(e.doc, textSel(point('fantasma', 0), point('otro', 0)))).toBeNull()
  })

  it('de los bloques elegidos quedan los que están, y el ancla se muda si se fue', () => {
    const e = tres()
    const traida = repair(e.doc, blockSel([at(e, 0), 'fantasma'], 'fantasma'))
    expect(traida).toEqual({ kind: 'blocks', ids: [at(e, 0)], anchor: at(e, 0) })
  })

  it('si no quedó ninguno, no queda selección', () => {
    const e = tres()
    expect(repair(e.doc, blockSel(['fantasma']))).toBeNull()
  })
})

describe('las preguntas cortas', () => {
  it('un caret está colapsado y un rango no', () => {
    const e = tres()
    expect(isCollapsed(caret(at(e, 0), 1))).toBe(true)
    expect(isCollapsed(textSel(point(at(e, 0), 1), point(at(e, 0), 2)))).toBe(false)
    expect(isCollapsed(blockSel([at(e, 0)]))).toBe(false)
  })

  it('cruzar bloques es tener las puntas en bloques distintos', () => {
    const e = tres()
    expect(spansBlocks(textSel(point(at(e, 0), 0), point(at(e, 1), 0)))).toBe(true)
    expect(spansBlocks(textSel(point(at(e, 0), 0), point(at(e, 0), 2)))).toBe(false)
  })

  it('el bloque activo es donde está la cabeza, que es lo que sigue a las flechas', () => {
    const e = tres()
    expect(activeBlock(textSel(point(at(e, 0), 0), point(at(e, 2), 1)))).toBe(at(e, 2))
    expect(activeBlock(blockSel([at(e, 0), at(e, 1)], at(e, 1)))).toBe(at(e, 1))
    expect(activeBlock(null)).toBeNull()
  })

  it('el final de un bloque es donde termina su texto', () => {
    const e = tres()
    expect(atEnd(e.doc, at(e, 0))).toEqual(caret(at(e, 0), 3))
  })

  it('dos selecciones iguales son la misma, y una al revés no es la del derecho', () => {
    const e = tres()
    const ida = textSel(point(at(e, 0), 0), point(at(e, 0), 2))
    const vuelta = textSel(point(at(e, 0), 2), point(at(e, 0), 0))
    expect(sameSelection(ida, textSel(point(at(e, 0), 0), point(at(e, 0), 2)))).toBe(true)
    expect(sameSelection(ida, vuelta)).toBe(false)
    expect(sameSelection(null, null)).toBe(true)
    expect(sameSelection(ida, blockSel([at(e, 0)]))).toBe(false)
  })

  it('dos selecciones de bloques con el mismo orden son la misma, y con otro orden no', () => {
    const e = tres()
    expect(sameSelection(blockSel([at(e, 0), at(e, 1)]), blockSel([at(e, 0), at(e, 1)]))).toBe(true)
    expect(sameSelection(blockSel([at(e, 0), at(e, 1)]), blockSel([at(e, 1), at(e, 0)]))).toBe(false)
  })

  it('elegir bloques sin decir cuál es el ancla toma el primero', () => {
    const e = tres()
    expect(blockSel(ids(e).slice(0, 2)).anchor).toBe(at(e, 0))
  })
})
