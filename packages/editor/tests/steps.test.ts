/**
 * Los pasos son la única forma en que cambia un documento, así que dos propiedades sostienen todo
 * lo de arriba: aplicar un paso y después su inverso devuelve exactamente el documento original,
 * y aplicar la misma lista de pasos dos veces da el mismo resultado.
 *
 * Si esas dos valen, deshacer no puede perder nada y rehacer no puede inventar nada. El resto de
 * los tests del motor descansan en esto.
 */

import { describe, expect, it } from 'vitest'
import {
  applyStep,
  applySteps,
  StepError,
  type Step,
} from '../src/core/steps.ts'
import {
  assertValid,
  childrenOf,
  emptyDoc,
  materialize,
  setBlocks,
  type Block,
  type Doc,
} from '../src/core/doc.ts'

function scene(): Doc {
  let doc = emptyDoc()
  const ids = ['a', 'b', 'c']
  for (const id of ids) {
    const made = materialize({ id, type: 'paragraph', text: [{ text: id }] }, doc.root)
    doc = setBlocks(doc, made.blocks)
  }
  return setBlocks(doc, [{ ...doc.blocks[doc.root]!, children: ids }])
}

const built = (init: Parameters<typeof materialize>[0], parent: string): { blocks: Block[]; id: string } =>
  materialize(init, parent)

const shape = (doc: Doc, parent = doc.root, depth = 0): string[] =>
  childrenOf(doc, parent).flatMap((id) => [
    `${'  '.repeat(depth)}${id}:${doc.blocks[id]!.type}`,
    ...shape(doc, id, depth + 1),
  ])

/** Aplica el paso, aplica su inverso, y afirma que el documento volvió tal cual estaba. */
function roundTrip(doc: Doc, step: Step) {
  const forward = applyStep(doc, step)
  assertValid(forward.doc)
  const back = applySteps(forward.doc, forward.inverse)
  assertValid(back.doc)
  expect(shape(back.doc)).toEqual(shape(doc))
  expect(back.doc.blocks).toEqual(doc.blocks)
  return forward
}

describe('insertar', () => {
  it('pone el bloque donde se pidió', () => {
    const doc = scene()
    const made = built({ id: 'x', type: 'quote' }, doc.root)
    const out = applyStep(doc, { op: 'insert', id: 'x', parent: doc.root, index: 1, blocks: made.blocks })
    expect(childrenOf(out.doc, out.doc.root)).toEqual(['a', 'x', 'b', 'c'])
  })

  it('un índice más grande que la lista pone al final', () => {
    const doc = scene()
    const made = built({ id: 'x', type: 'quote' }, doc.root)
    const out = applyStep(doc, { op: 'insert', id: 'x', parent: doc.root, index: 99, blocks: made.blocks })
    expect(childrenOf(out.doc, out.doc.root)).toEqual(['a', 'b', 'c', 'x'])
  })

  it('inserta un subárbol entero en un solo paso', () => {
    const doc = scene()
    const made = built({ id: 'x', type: 'toggle', children: [{ id: 'y', type: 'paragraph' }] }, doc.root)
    const out = roundTrip(doc, { op: 'insert', id: 'x', parent: doc.root, index: 0, blocks: made.blocks })
    expect(shape(out.doc)).toEqual(['x:toggle', '  y:paragraph', 'a:paragraph', 'b:paragraph', 'c:paragraph'])
  })

  it('se niega a insertar un id que ya está', () => {
    const doc = scene()
    const made = built({ id: 'a', type: 'quote' }, doc.root)
    expect(() => applyStep(doc, { op: 'insert', id: 'a', parent: doc.root, index: 0, blocks: made.blocks })).toThrow(StepError)
  })

  it('se niega a colgar de un padre que no existe', () => {
    const doc = scene()
    const made = built({ id: 'x', type: 'quote' }, 'fantasma')
    expect(() => applyStep(doc, { op: 'insert', id: 'x', parent: 'fantasma', index: 0, blocks: made.blocks })).toThrow(StepError)
  })

  it('el inverso lo saca y deja todo como estaba', () => {
    const doc = scene()
    const made = built({ id: 'x', type: 'quote' }, doc.root)
    roundTrip(doc, { op: 'insert', id: 'x', parent: doc.root, index: 2, blocks: made.blocks })
  })
})

describe('borrar', () => {
  it('se lleva el subárbol completo', () => {
    let doc = scene()
    const made = built({ id: 'x', type: 'toggle', children: [{ id: 'y', type: 'paragraph' }] }, 'a')
    doc = applyStep(doc, { op: 'insert', id: 'x', parent: 'a', index: 0, blocks: made.blocks }).doc
    const out = applyStep(doc, { op: 'remove', id: 'x' })
    expect(out.doc.blocks['y']).toBeUndefined()
    expect(childrenOf(out.doc, 'a')).toEqual([])
  })

  it('el inverso lo devuelve al mismo lugar, con hijos y todo', () => {
    let doc = scene()
    const made = built({ id: 'x', type: 'toggle', children: [{ id: 'y', type: 'paragraph', text: [{ text: 'hijo' }] }] }, 'a')
    doc = applyStep(doc, { op: 'insert', id: 'x', parent: 'a', index: 0, blocks: made.blocks }).doc
    roundTrip(doc, { op: 'remove', id: 'x' })
  })

  it('la raíz no se borra', () => {
    const doc = scene()
    expect(() => applyStep(doc, { op: 'remove', id: doc.root })).toThrow(StepError)
  })

  it('borrar lo que no existe falla en lugar de no hacer nada', () => {
    expect(() => applyStep(scene(), { op: 'remove', id: 'fantasma' })).toThrow(StepError)
  })
})

describe('mover', () => {
  it('mueve entre padres', () => {
    const doc = scene()
    const out = applyStep(doc, { op: 'move', id: 'c', parent: 'a', index: 0 })
    expect(shape(out.doc)).toEqual(['a:paragraph', '  c:paragraph', 'b:paragraph'])
    expect(out.doc.blocks['c']!.parent).toBe('a')
  })

  it('el índice se cuenta después de sacarlo, así mover a la derecha hace lo que se espera', () => {
    const doc = scene()
    const out = applyStep(doc, { op: 'move', id: 'a', parent: doc.root, index: 2 })
    expect(childrenOf(out.doc, out.doc.root)).toEqual(['b', 'c', 'a'])
  })

  it('el inverso lo devuelve a su lugar exacto', () => {
    roundTrip(scene(), { op: 'move', id: 'b', parent: doc0(), index: 0 })
    roundTrip(scene(), { op: 'move', id: 'a', parent: 'c', index: 0 })
  })

  it('un bloque no puede colgar de sí mismo', () => {
    const doc = scene()
    expect(() => applyStep(doc, { op: 'move', id: 'a', parent: 'a', index: 0 })).toThrow(StepError)
  })

  it('un bloque no puede colgar de su propio descendiente: desconectaría su subárbol', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'move', id: 'b', parent: 'a', index: 0 }).doc
    expect(() => applyStep(doc, { op: 'move', id: 'a', parent: 'b', index: 0 })).toThrow(StepError)
  })
})

const doc0 = () => 'root'

describe('cambiar el tipo', () => {
  it('cambia el tipo y deja las props si no le dicen nada', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { checked: true } }).doc
    const out = applyStep(doc, { op: 'setType', id: 'a', type: 'todo' })
    expect(out.doc.blocks['a']!.type).toBe('todo')
    expect(out.doc.blocks['a']!.props).toEqual({ checked: true })
  })

  it('con props en null las borra: las del tipo viejo no significan nada en el nuevo', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { language: 'python' } }).doc
    const out = applyStep(doc, { op: 'setType', id: 'a', type: 'paragraph', props: null })
    expect(out.doc.blocks['a']!.props).toBeUndefined()
  })

  it('el inverso devuelve el tipo y las props que había', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { language: 'python' } }).doc
    roundTrip(doc, { op: 'setType', id: 'a', type: 'heading_1', props: null })
  })
})

describe('cambiar el texto', () => {
  it('lo reemplaza', () => {
    const out = applyStep(scene(), { op: 'setText', id: 'a', text: [{ text: 'otra cosa' }] })
    expect(out.doc.blocks['a']!.text).toEqual([{ text: 'otra cosa' }])
  })

  it('el inverso trae el texto anterior', () => {
    roundTrip(scene(), { op: 'setText', id: 'b', text: [{ text: 'nuevo', marks: [{ type: 'bold' }] }] })
  })
})

describe('cambiar las props', () => {
  it('es un merge, no un reemplazo', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { width: 50, align: 'center' } }).doc
    const out = applyStep(doc, { op: 'setProps', id: 'a', props: { width: 80 } })
    expect(out.doc.blocks['a']!.props).toEqual({ width: 80, align: 'center' })
  })

  it('una clave en null se borra', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { width: 50, align: 'center' } }).doc
    const out = applyStep(doc, { op: 'setProps', id: 'a', props: { align: null } })
    expect(out.doc.blocks['a']!.props).toEqual({ width: 50 })
  })

  it('el inverso reconstruye lo que había, incluso las claves que no estaban', () => {
    roundTrip(scene(), { op: 'setProps', id: 'a', props: { width: 50 } })
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { width: 50, align: 'center' } }).doc
    roundTrip(doc, { op: 'setProps', id: 'a', props: { align: null, extra: 1 } })
  })

  it('un bloque que se queda sin props no guarda un objeto vacío', () => {
    let doc = scene()
    doc = applyStep(doc, { op: 'setProps', id: 'a', props: { width: 50 } }).doc
    const out = applyStep(doc, { op: 'setProps', id: 'a', props: { width: null } })
    expect(out.doc.blocks['a']!.props).toBeUndefined()
  })
})

describe('varios pasos', () => {
  it('el inverso de una lista es la lista de inversos al revés', () => {
    const doc = scene()
    const made = built({ id: 'x', type: 'quote' }, doc.root)
    const steps: Step[] = [
      { op: 'insert', id: 'x', parent: doc.root, index: 0, blocks: made.blocks },
      { op: 'setText', id: 'x', text: [{ text: 'una cita' }] },
      { op: 'move', id: 'x', parent: 'a', index: 0 },
      { op: 'setProps', id: 'x', props: { align: 'center' } },
    ]
    const forward = applySteps(doc, steps)
    assertValid(forward.doc)
    const back = applySteps(forward.doc, forward.inverse)
    expect(back.doc.blocks).toEqual(doc.blocks)
  })

  it('avisa qué bloques tocó, que es lo que decide qué se vuelve a dibujar', () => {
    const doc = scene()
    const out = applySteps(doc, [{ op: 'setText', id: 'a', text: [{ text: 'x' }] }])
    expect(out.touched).toEqual(['a'])
  })

  it('un borrado cuenta también al padre: su lista de hijos cambió', () => {
    const out = applySteps(scene(), [{ op: 'remove', id: 'a' }])
    expect(out.touched).toContain('root')
    expect(out.touched).toContain('a')
  })

  it('aplicar los mismos pasos al mismo documento da el mismo resultado', () => {
    const doc = scene()
    const steps: Step[] = [
      { op: 'setText', id: 'a', text: [{ text: 'x' }] },
      { op: 'move', id: 'c', parent: 'a', index: 0 },
    ]
    expect(applySteps(doc, steps).doc.blocks).toEqual(applySteps(doc, steps).doc.blocks)
  })
})

describe('lo que no cambia se comparte', () => {
  it('un cambio de texto no copia los otros bloques', () => {
    const doc = scene()
    const out = applyStep(doc, { op: 'setText', id: 'a', text: [{ text: 'x' }] })
    expect(out.doc.blocks['b']).toBe(doc.blocks['b'])
    expect(out.doc.blocks['c']).toBe(doc.blocks['c'])
    expect(out.doc.blocks['a']).not.toBe(doc.blocks['a'])
  })
})
