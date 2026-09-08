/**
 * Una transacción: todo lo que hace un gesto, junto.
 *
 * Es la pieza de la que dependen el deshacer, el guardado y el aviso a la vista, y no tenía un
 * test propio. Lo que importa acá no es que los pasos se apliquen (eso lo prueba `steps.test.ts`)
 * sino lo que la clase agrega encima: los ids que acuña, las props que valida antes de dejar
 * pasar nada, el inverso que se arma al revés, y el estado a mitad de camino que hace que un
 * comando vea lo que hizo el anterior.
 */

import { describe, expect, it } from 'vitest'
import { Transaction } from './transaction.ts'
import { childrenOf, plain } from './index.ts'
import { at, ids, makeEditor, makeFullEditor } from '../test/engine.ts'

/** Una transacción sobre el estado de un editor, sin pasar por `exec`. */
const abrir = (e: ReturnType<typeof makeEditor>) => new Transaction(e.state)

describe('lo que la transacción acuña', () => {
  it('un bloque nuevo estrena id, aunque el init traiga uno que ya está usado', () => {
    const e = makeEditor()
    const tr = abrir(e)
    const nuevo = tr.insert(tr.doc.root, 0, { id: at(e, 0), type: 'paragraph' })
    expect(nuevo).not.toBe(at(e, 0))
  })

  it('un id libre que viene pedido se respeta: es como vuelve un deshacer', () => {
    const e = makeEditor()
    const tr = abrir(e)
    expect(tr.insert(tr.doc.root, 0, { id: 'mio', type: 'paragraph' })).toBe('mio')
  })

  it('los hijos también estrenan id, y no solo el de arriba', () => {
    const e = makeFullEditor()
    const tr = abrir(e)
    const armado = tr.insert(tr.doc.root, 0, {
      type: 'columns',
      children: [{ id: 'repetido', type: 'column' }, { id: 'repetido', type: 'column' }],
    })
    const hijos = childrenOf(tr.doc, armado)
    expect(new Set(hijos).size).toBe(2)
  })

  it('un bloque con texto lo estrena vacío, y uno sin texto no lo estrena', () => {
    const e = makeFullEditor()
    const tr = abrir(e)
    const parrafo = tr.insert(tr.doc.root, 0, { type: 'paragraph' })
    const linea = tr.insert(tr.doc.root, 0, { type: 'divider' })
    expect(tr.doc.blocks[parrafo]!.text).toEqual([])
    expect(tr.doc.blocks[linea]!.text).toBeUndefined()
  })

  it('las props llegan con los defaults del tipo puestos', () => {
    const e = makeFullEditor()
    const tr = abrir(e)
    const reloj = tr.insert(tr.doc.root, 0, { type: 'timer' })
    expect(tr.doc.blocks[reloj]!.props).toMatchObject({ seconds: 300 })
  })
})

describe('lo que la transacción no deja pasar', () => {
  it('una prop fuera de rango se recorta al insertar', () => {
    const e = makeFullEditor()
    const tr = abrir(e)
    const reloj = tr.insert(tr.doc.root, 0, { type: 'timer', props: { seconds: 999999 } })
    expect(tr.doc.blocks[reloj]!.props!.seconds).toBe(7200)
  })

  it('y también al convertir, que es el camino por el que entra un pegado o un agente', () => {
    const e = makeFullEditor()
    tr_convertir(e)
    function tr_convertir(editor: typeof e) {
      const tr = abrir(editor)
      tr.setType(at(editor, 0), 'timer', { seconds: -5 })
      expect(tr.doc.blocks[at(editor, 0)]!.props!.seconds).toBe(5)
    }
  })

  it('una prop que el tipo no declara pasa igual: ahí guarda lo suyo quien monta el editor', () => {
    const e = makeFullEditor()
    const tr = abrir(e)
    const reloj = tr.insert(tr.doc.root, 0, { type: 'timer', props: { inventada: 1 } })
    // A propósito: lo que el spec declara se valida, y lo que no declara se deja pasar tal cual.
    expect(tr.doc.blocks[reloj]!.props).toMatchObject({ inventada: 1, seconds: 300 })
  })

  it('el texto se normaliza al entrar: dos pedazos con el mismo formato son uno', () => {
    const e = makeEditor()
    const tr = abrir(e)
    tr.setText(at(e, 0), [{ text: 'uno' }, { text: ' y dos' }])
    expect(tr.doc.blocks[at(e, 0)]!.text).toHaveLength(1)
    expect(plain(tr.doc.blocks[at(e, 0)]!.text)).toBe('uno y dos')
  })
})

describe('el inverso', () => {
  it('se arma al revés, para que deshacer sea aplicarlo en orden', () => {
    const e = makeEditor()
    const tr = abrir(e)
    tr.setText(at(e, 0), [{ text: 'uno' }])
    const primero = tr.inverse[0]
    tr.setText(at(e, 0), [{ text: 'uno y dos' }])
    // El último paso es el primero en deshacerse.
    expect(tr.inverse[0]).not.toBe(primero)
    expect(tr.inverse.at(-1)).toBe(primero)
  })

  it('cuenta lo que tocó, que es lo que los normalizadores miran', () => {
    const e = makeEditor()
    const tr = abrir(e)
    const nuevo = tr.append(tr.doc.root, { type: 'paragraph' })
    expect(tr.touched.has(nuevo)).toBe(true)
  })

  it('sin pasos está vacía, y con uno no', () => {
    const e = makeEditor()
    const tr = abrir(e)
    expect(tr.empty).toBe(true)
    tr.setText(at(e, 0), [{ text: 'algo' }])
    expect(tr.empty).toBe(false)
  })
})

describe('el estado a mitad de camino', () => {
  it('el segundo comando ve lo que hizo el primero', () => {
    const e = makeEditor()
    const tr = abrir(e)
    const nuevo = tr.append(tr.doc.root, { type: 'paragraph', text: [{ text: 'recién' }] })
    // `current` es lo que lee un comando encadenado: el bloque ya está ahí.
    expect(plain(tr.current.doc.blocks[nuevo]!.text)).toBe('recién')
  })

  it('la selección elegida sobrevive al resultado', () => {
    const e = makeEditor()
    const tr = abrir(e)
    const nuevo = tr.append(tr.doc.root, { type: 'paragraph' })
    tr.select({ kind: 'text', anchor: { block: nuevo, offset: 0 }, head: { block: nuevo, offset: 0 } })
    expect(tr.result().selection).toEqual({ kind: 'text', anchor: { block: nuevo, offset: 0 }, head: { block: nuevo, offset: 0 } })
  })

  it('una selección que apunta a un bloque borrado se trae de vuelta sola', () => {
    const e = makeEditor()
    const tr = abrir(e)
    const nuevo = tr.append(tr.doc.root, { type: 'paragraph' })
    tr.select({ kind: 'text', anchor: { block: nuevo, offset: 0 }, head: { block: nuevo, offset: 0 } })
    tr.remove(nuevo)
    expect(tr.result().selection).toBeNull()
  })

  it('el formato pendiente se descarta salvo que alguien lo fije en esta misma transacción', () => {
    const e = makeEditor()
    const tr = abrir(e)
    expect(tr.result().storedMarks).toBeNull()
    const otra = abrir(e)
    otra.setStoredMarks([{ type: 'bold' }])
    expect(otra.result().storedMarks).toEqual([{ type: 'bold' }])
  })
})

describe('las etiquetas de la transacción', () => {
  it('la que junta gestos y la que los saca del historial se leen desde afuera', () => {
    const e = makeEditor()
    const tr = abrir(e).coalesce('typing').silent().setMeta('propia', 7)
    expect(tr.meta).toMatchObject({ coalesce: 'typing', history: false, propia: 7 })
  })
})

describe('subir los hijos un nivel', () => {
  it('quedan justo abajo del bloque que los tenía, y en el mismo orden', () => {
    const e = makeEditor()
    const tr = abrir(e)
    const padre = tr.append(tr.doc.root, {
      type: 'bulleted_list',
      text: [{ text: 'padre' }],
      children: [
        { type: 'bulleted_list', text: [{ text: 'a' }] },
        { type: 'bulleted_list', text: [{ text: 'b' }] },
      ],
    })
    tr.liftChildren(padre)
    const arriba = childrenOf(tr.doc, tr.doc.root)
    const desde = arriba.indexOf(padre)
    expect(arriba.slice(desde + 1, desde + 3).map((id) => plain(tr.doc.blocks[id]!.text))).toEqual(['a', 'b'])
    expect(childrenOf(tr.doc, padre)).toHaveLength(0)
  })

  it('sobre el raíz no hace nada, en lugar de romper', () => {
    const e = makeEditor()
    const tr = abrir(e)
    expect(() => tr.liftChildren(tr.doc.root)).not.toThrow()
    expect(ids(e)).toHaveLength(1)
  })
})
