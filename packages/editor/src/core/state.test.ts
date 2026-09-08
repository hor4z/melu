/**
 * El estado: el documento, dónde está el caret, y el schema que explica los dos.
 *
 * Tres funciones cortas de las que cuelga todo lo demás. Lo que importa de cada una es lo mismo:
 * que el estado que devuelven se pueda escribir. Un documento sin bloques no tiene dónde poner el
 * caret, y una selección que apunta a un bloque que no está deja el editor sin poder dibujarse.
 */

import { describe, expect, it } from 'vitest'
import { blankState, stateFrom, stateOf } from './state.ts'
import { defineSchema } from './schema.ts'
import { childrenOf, emptyDoc } from './doc.ts'
import { basics } from '../plugins/index.ts'
import { collect } from './plugins.ts'
import { plain } from './text.ts'

const schema = () => defineSchema(collect(basics()).blocks)

describe('un estado a partir de bloques', () => {
  it('los pone al tope, en el orden en que llegaron', () => {
    const state = stateFrom(schema(), [
      { type: 'paragraph', text: [{ text: 'uno' }] },
      { type: 'paragraph', text: [{ text: 'dos' }] },
    ])
    const arriba = childrenOf(state.doc, state.doc.root)
    expect(arriba.map((id) => plain(state.doc.blocks[id]!.text))).toEqual(['uno', 'dos'])
  })

  it('el caret arranca en el primero, que es donde se empieza a escribir', () => {
    const state = stateFrom(schema(), [{ type: 'paragraph', text: [{ text: 'uno' }] }])
    expect(state.selection).toEqual({
      kind: 'text',
      anchor: { block: childrenOf(state.doc, state.doc.root)[0]!, offset: 0 },
      head: { block: childrenOf(state.doc, state.doc.root)[0]!, offset: 0 },
    })
  })

  it('los hijos entran con su padre, y no sueltos arriba', () => {
    const state = stateFrom(schema(), [
      { type: 'bulleted_list', text: [{ text: 'padre' }], children: [{ type: 'bulleted_list', text: [{ text: 'hijo' }] }] },
    ])
    const arriba = childrenOf(state.doc, state.doc.root)
    expect(arriba).toHaveLength(1)
    expect(childrenOf(state.doc, arriba[0]!)).toHaveLength(1)
  })

  it('sin bloques no hay dónde poner el caret, y lo dice en lugar de inventarlo', () => {
    const state = stateFrom(schema(), [])
    expect(state.selection).toBeNull()
  })
})

describe('un estado a partir de un documento que ya existe', () => {
  it('la selección que se le pasa se trae de vuelta al documento', () => {
    const vacio = emptyDoc()
    const state = stateOf(vacio, schema(), {
      kind: 'text',
      anchor: { block: 'fantasma', offset: 0 },
      head: { block: 'fantasma', offset: 0 },
    })
    // Apuntaba a un bloque que no está: mejor sin caret que con uno que no existe.
    expect(state.selection).toBeNull()
  })

  it('sin selección queda sin selección, y no en un lugar cualquiera', () => {
    expect(stateOf(emptyDoc(), schema()).selection).toBeNull()
  })
})

describe('el estado de una actividad nueva', () => {
  it('arranca con un solo bloque, y con el caret adentro', () => {
    const state = blankState(schema())
    const arriba = childrenOf(state.doc, state.doc.root)
    expect(arriba).toHaveLength(1)
    expect(state.doc.blocks[arriba[0]!]!.type).toBe('paragraph')
    expect(state.selection?.kind).toBe('text')
  })

  it('se puede pedir de otro tipo: un documento que arranca con su título', () => {
    const state = blankState(schema(), 'heading_1')
    expect(state.doc.blocks[childrenOf(state.doc, state.doc.root)[0]!]!.type).toBe('heading_1')
  })
})
