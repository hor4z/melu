import { describe, expect, it } from 'vitest'
import {
  assertValid,
  childrenOf,
  copySubtree,
  count,
  depthOf,
  emptyDoc,
  flatten,
  getBlock,
  isAncestor,
  lastDescendant,
  materialize,
  nextInOrder,
  parentOf,
  pathOf,
  prevInOrder,
  setBlocks,
  siblingAfter,
  siblingBefore,
  subtree,
  validate,
  type Doc,
} from '../src/core/doc.ts'

/**
 * Un documento armado a mano con ids fijos, para poder afirmar sobre nombres y no sobre índices.
 *
 *   a
 *     b
 *       c
 *     d
 *   e
 */
function scene(): Doc {
  let doc = emptyDoc()
  const tree = materialize(
    {
      id: 'a',
      type: 'paragraph',
      children: [
        { id: 'b', type: 'paragraph', children: [{ id: 'c', type: 'paragraph' }] },
        { id: 'd', type: 'paragraph' },
      ],
    },
    doc.root,
  )
  const other = materialize({ id: 'e', type: 'paragraph' }, doc.root)
  doc = setBlocks(doc, [...tree.blocks, ...other.blocks])
  return setBlocks(doc, [{ ...doc.blocks[doc.root]!, children: ['a', 'e'] }])
}

describe('un documento vacío', () => {
  it('tiene raíz y nada más', () => {
    const doc = emptyDoc()
    expect(Object.keys(doc.blocks)).toEqual([doc.root])
    expect(count(doc)).toBe(0)
    expect(validate(doc)).toEqual([])
  })
})

describe('los punteros', () => {
  it('cada hijo conoce a su padre y cada padre a sus hijos', () => {
    const doc = scene()
    assertValid(doc)
    expect(childrenOf(doc, 'a')).toEqual(['b', 'd'])
    expect(parentOf(doc, 'c')).toBe('b')
    expect(parentOf(doc, 'a')).toBe(doc.root)
  })

  it('el camino va de la raíz al bloque', () => {
    expect(pathOf(scene(), 'c')).toEqual(['root', 'a', 'b', 'c'])
  })

  it('la profundidad no cuenta la raíz: un bloque de arriba está en cero', () => {
    const doc = scene()
    expect(depthOf(doc, 'a')).toBe(0)
    expect(depthOf(doc, 'b')).toBe(1)
    expect(depthOf(doc, 'c')).toBe(2)
  })

  it('sabe quién es ancestro de quién', () => {
    const doc = scene()
    expect(isAncestor(doc, 'a', 'c')).toBe(true)
    expect(isAncestor(doc, 'b', 'a')).toBe(false)
    expect(isAncestor(doc, 'e', 'c')).toBe(false)
  })
})

describe('el orden de lectura', () => {
  it('es el orden en que se ve, con los hijos pegados al padre', () => {
    expect(flatten(scene())).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('anterior y siguiente caminan ese orden, no los hermanos', () => {
    const doc = scene()
    expect(nextInOrder(doc, 'a')).toBe('b')
    expect(nextInOrder(doc, 'c')).toBe('d')
    expect(prevInOrder(doc, 'd')).toBe('c')
    expect(prevInOrder(doc, 'a')).toBeNull()
    expect(nextInOrder(doc, 'e')).toBeNull()
  })

  it('los hermanos son otra cosa que el orden de lectura', () => {
    const doc = scene()
    expect(siblingAfter(doc, 'b')).toBe('d')
    expect(siblingBefore(doc, 'd')).toBe('b')
    expect(siblingAfter(doc, 'c')).toBeNull()
  })

  it('el último descendiente es donde termina un subárbol', () => {
    expect(lastDescendant(scene(), 'a')).toBe('d')
    expect(lastDescendant(scene(), 'b')).toBe('c')
  })
})

describe('subárboles', () => {
  it('subtree trae el bloque y todo lo que cuelga', () => {
    expect(subtree(scene(), 'a').sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('copiar un subárbol no comparte ni un objeto con el original', () => {
    const doc = setBlocks(scene(), [{ ...getBlock(scene(), 'b')!, props: { open: true } }])
    const copy = copySubtree(doc, 'a')!
    expect(copy.children?.[0]?.props).toEqual({ open: true })
    ;(copy.children![0]!.props as { open: boolean }).open = false
    expect(getBlock(doc, 'b')!.props).toEqual({ open: true })
  })

  it('la copia no trae los ids: insertarla dos veces no repite nombres', () => {
    const copy = copySubtree(scene(), 'a')!
    expect(copy.id).toBeUndefined()
    expect(copy.children?.[0]?.id).toBeUndefined()
  })
})

describe('el chequeo de consistencia', () => {
  it('acepta un documento sano', () => {
    expect(validate(scene())).toEqual([])
  })

  it('encuentra un hijo que no reconoce a su padre', () => {
    const doc = scene()
    const roto = setBlocks(doc, [{ ...doc.blocks['c']!, parent: 'e' }])
    expect(validate(roto).join(' ')).toContain('c')
  })

  it('encuentra un bloque que no se alcanza desde la raíz', () => {
    const doc = scene()
    const huerfano = setBlocks(doc, [{ id: 'z', type: 'paragraph', children: [], parent: 'a' }])
    expect(validate(huerfano).join(' ')).toContain('z')
  })

  it('encuentra un hijo inexistente', () => {
    const doc = scene()
    const roto = setBlocks(doc, [{ ...doc.blocks['a']!, children: ['b', 'd', 'fantasma'] }])
    expect(validate(roto).join(' ')).toContain('fantasma')
  })

  it('assertValid explica el problema en lugar de devolver false', () => {
    const doc = scene()
    const roto = setBlocks(doc, [{ ...doc.blocks['c']!, parent: 'e' }])
    expect(() => assertValid(roto)).toThrow(/inconsistente/)
  })
})

describe('materializar', () => {
  it('acuña un id por bloque y cablea los dos sentidos', () => {
    const { blocks, id } = materialize({ type: 'toggle', children: [{ type: 'paragraph' }] }, 'root')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.id).toBe(id)
    expect(blocks[0]!.parent).toBe('root')
    expect(blocks[1]!.parent).toBe(id)
    expect(blocks[0]!.children).toEqual([blocks[1]!.id])
  })

  it('dos materializaciones del mismo init no comparten ids', () => {
    const init = { type: 'paragraph' as const }
    expect(materialize(init, 'root').id).not.toBe(materialize(init, 'root').id)
  })
})
