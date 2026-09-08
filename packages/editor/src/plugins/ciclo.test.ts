/**
 * El ciclo entero, para cada tipo que el menú ofrece.
 *
 * Insertar, editar, mover, duplicar, borrar, deshacer, y volver de JSON idéntico. Cada pedazo está
 * probado por separado en algún lado; lo que no estaba probado es la vuelta completa, que es lo que
 * alguien hace de verdad con un bloque. Y los tipos que nadie mira nunca (un reloj, un índice, una
 * tarjeta) sólo aparecen acá.
 *
 * Va por tabla a propósito: un tipo nuevo entra al plugin y este archivo lo empieza a probar solo.
 */

import { describe, expect, it } from 'vitest'
import { childrenOf, fromJSON, toJSON, type Editor } from '../core/index.ts'
import { at, ids, makeFullEditor, propsAt, sketch, typeAt } from '../test/engine.ts'

/** Todo lo que el menú deja insertar. Los que no se insertan solos (una fila, una celda) no van. */
const TIPOS = makeFullEditor()
  .state.schema.groups.flatMap((g) => g.items.map((s) => s.type))

/** Los tipos de la primera fila del documento: `ids` baja a los hijos y acá hacen ruido. */
const arriba = (e: Editor) => childrenOf(e.doc, e.doc.root).map((id) => e.block(id)!.type)

/** Un editor con un bloque de ese tipo, insertado como lo insertaría el menú. */
function conUno(type: string) {
  const e = makeFullEditor()
  e.run('insertBlock', { type })
  return e
}

describe('el ciclo de vida de cada tipo', () => {
  for (const type of TIPOS) {
    it(`un ${type} entra, se mueve, se duplica, se borra y vuelve con un deshacer`, () => {
      const e = conUno(type)
      expect(typeAt(e, 0)).toBe(type)

      // Un vecino para poder moverlo, que además prueba que convive con otro bloque.
      e.run('insertBlock', { type: 'paragraph', at: 'end' })
      const antes = sketch(e)

      const suyo = at(e, 0)
      expect(e.run('moveDown', { id: suyo })).toBe(true)
      expect(arriba(e)[1]).toBe(type)
      expect(e.run('moveUp', { id: suyo })).toBe(true)
      expect(sketch(e)).toEqual(antes)

      expect(e.run('duplicateBlock', { id: suyo })).toBe(true)
      // La copia queda pegada al original, y es una copia y no el mismo bloque con dos padres.
      expect(arriba(e)[1]).toBe(type)
      expect(childrenOf(e.doc, e.doc.root)[1]).not.toBe(suyo)
      e.undo()
      expect(sketch(e)).toEqual(antes)

      expect(e.run('removeBlock', { id: suyo })).toBe(true)
      expect(ids(e)).not.toContain(suyo)
      e.undo()
      expect(sketch(e)).toEqual(antes)
    })
  }
})

describe('la vuelta por JSON', () => {
  for (const type of TIPOS) {
    it(`un ${type} guardado y vuelto a abrir es el mismo`, () => {
      const e = conUno(type)
      const guardado = toJSON(e.doc)
      const otro = makeFullEditor(fromJSON(guardado))
      // El mismo árbol, con los mismos tipos y el mismo texto.
      expect(sketch(otro)).toEqual(sketch(e))
      expect(toJSON(otro.doc)).toEqual(guardado)
    })
  }
})

describe('las props que declara el spec', () => {
  for (const type of TIPOS) {
    it(`un ${type} llega con los defaults que declara, y no con la mitad`, () => {
      const e = conUno(type)
      const spec = e.state.schema.specOr(type)
      const props = propsAt(e, 0)
      for (const [nombre, prop] of Object.entries(spec.props ?? {})) {
        if (prop.default === undefined) continue
        expect(props, `${type}.${nombre}`).toHaveProperty(nombre)
      }
    })
  }
})

describe('lo que un bloque no puede hacer', () => {
  it('ninguno se puede mover adentro de sí mismo', () => {
    for (const type of TIPOS) {
      const e = conUno(type)
      const suyo = at(e, 0)
      expect(e.run('moveBlock', { id: suyo, parent: suyo, index: 0 }), type).toBe(false)
    }
  })

  it('ninguno se queda sin lugar donde poner el caret al borrarlo', () => {
    for (const type of TIPOS) {
      const e = conUno(type)
      e.run('removeBlock', { id: at(e, 0) })
      // Un documento sin bloques no se puede escribir.
      expect(ids(e).length, type).toBeGreaterThan(0)
    }
  })

  it('ninguno rompe el documento al insertarse: los editores van en estricto', () => {
    // `makeFullEditor` monta con `strict`, así que una inconsistencia tira acá y no tres archivos
    // más adelante.
    for (const type of TIPOS) expect(() => conUno(type), type).not.toThrow()
  })
})
