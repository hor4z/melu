/**
 * Que escribir cueste lo mismo en una página larga que en una corta.
 *
 * Estos tests no miden milisegundos. Un test de reloj falla en una máquina cargada y pasa en la
 * de al lado, y lo que hay que sostener no es un número: es la propiedad de la que el número sale.
 * Así que se afirma lo que se puede afirmar sin cronómetro y no cambia entre máquinas:
 *
 *   cuántos bloques toca una tecla       uno, siempre, sea el documento de 5 o de 2000
 *   a cuántos suscriptores despierta     uno, el del bloque donde se escribe
 *   cuántos bloques mira un normalizador lo que cambió, no el documento
 *
 * Lo que sí es O(n) es copiar el mapa de bloques al producir el documento nuevo, y está medido y
 * explicado arriba de `setBlock` en `core/doc.ts`. El último test de acá pone un techo generoso
 * de reloj, no para medir sino para que una regresión de otro orden de magnitud se note.
 */

import { describe, expect, it } from 'vitest'
import { Editor, type BlockInit } from '../src/core/index.ts'
import { activityKit, basics } from '../src/plugins/index.ts'

const parrafos = (n: number): BlockInit[] =>
  Array.from({ length: n }, (_, i) => ({ type: 'paragraph', text: [{ text: `El paso número ${i}` }] }))

function conBloques(n: number, plugins = activityKit()) {
  const editor = new Editor({ plugins, blocks: parrafos(n) })
  const first = editor.doc.blocks[editor.doc.root]!.children[0]!
  editor.setSelection({ kind: 'text', anchor: { block: first, offset: 0 }, head: { block: first, offset: 0 } })
  return { editor, first }
}

describe('lo que toca una tecla', () => {
  it('escribir toca un solo bloque, con cinco o con dos mil', () => {
    for (const n of [5, 200, 2000]) {
      const { editor, first } = conBloques(n)
      let touched: string[] = []
      editor.subscribe((change) => {
        touched = [...change.touched]
      })
      editor.run('insertText', { text: 'x' })
      expect(touched, `con ${n} bloques`).toEqual([first])
    }
  })

  it('borrar un carácter también toca uno solo', () => {
    const { editor, first } = conBloques(500)
    editor.setSelection({ kind: 'text', anchor: { block: first, offset: 3 }, head: { block: first, offset: 3 } })
    let touched: string[] = []
    editor.subscribe((change) => {
      touched = [...change.touched]
    })
    editor.run('deleteBackward')
    expect(touched).toEqual([first])
  })

  it('partir un bloque toca el bloque, el nuevo y el padre, y nada más', () => {
    const { editor, first } = conBloques(1000)
    editor.setSelection({ kind: 'text', anchor: { block: first, offset: 4 }, head: { block: first, offset: 4 } })
    let touched: string[] = []
    editor.subscribe((change) => {
      touched = [...change.touched]
    })
    editor.run('splitBlock')
    expect(touched).toHaveLength(3)
    expect(touched).toContain(first)
    expect(touched).toContain(editor.doc.root)
  })

  it('cambiar el tipo toca uno solo', () => {
    const { editor, first } = conBloques(800)
    let touched: string[] = []
    editor.subscribe((change) => {
      touched = [...change.touched]
    })
    editor.run('setBlockType', { type: 'heading_2' })
    expect(touched).toEqual([first])
  })
})

describe('a quién despierta', () => {
  it('la suscripción por bloque avisa solo al bloque que cambió', () => {
    const { editor, first } = conBloques(300)
    const ids = editor.doc.blocks[editor.doc.root]!.children
    const avisos = new Map<string, number>()
    for (const id of ids) {
      avisos.set(id, 0)
      editor.subscribeBlock(id, () => avisos.set(id, (avisos.get(id) ?? 0) + 1))
    }

    editor.run('insertText', { text: 'x' })

    expect(avisos.get(first)).toBe(1)
    // Los otros doscientos noventa y nueve no se enteraron, que es todo el asunto.
    expect([...avisos.values()].reduce((a, b) => a + b, 0)).toBe(1)
  })

  it('mover el caret no despierta a ningún bloque', () => {
    const { editor } = conBloques(100)
    const ids = editor.doc.blocks[editor.doc.root]!.children
    let avisos = 0
    for (const id of ids) editor.subscribeBlock(id, () => avisos++)
    editor.setSelection({ kind: 'text', anchor: { block: ids[50]!, offset: 0 }, head: { block: ids[50]!, offset: 0 } })
    expect(avisos).toBe(0)
  })

  it('desuscribirse deja de recibir avisos', () => {
    const { editor, first } = conBloques(10)
    let avisos = 0
    const stop = editor.subscribeBlock(first, () => avisos++)
    editor.run('insertText', { text: 'x' })
    stop()
    editor.run('insertText', { text: 'y' })
    expect(avisos).toBe(1)
  })
})

describe('lo que mira un normalizador', () => {
  it('recibe lo que cambió y sus ancestros, no el documento entero', () => {
    const vistos: number[] = []
    const editor = new Editor({
      plugins: [
        ...basics(),
        {
          name: 'espía',
          normalize: ({ touched }) => {
            vistos.push(touched.size)
          },
        },
      ],
      blocks: parrafos(1000),
    })
    const first = editor.doc.blocks[editor.doc.root]!.children[0]!
    editor.setSelection({ kind: 'text', anchor: { block: first, offset: 0 }, head: { block: first, offset: 0 } })
    vistos.length = 0
    editor.run('insertText', { text: 'x' })
    // El bloque y la raíz: dos, no mil.
    expect(Math.max(...vistos)).toBeLessThanOrEqual(3)
  })

  it('una celda borrada le llega a la tabla, que es la que tiene algo que arreglar', () => {
    const editor = new Editor({ plugins: activityKit(), strict: true })
    editor.run('insertTable', { rows: 2, cols: 3 })
    const tabla = Object.values(editor.doc.blocks).find((b) => b.type === 'table')!
    const fila = tabla.children[0]!
    const celda = editor.block(fila)!.children[0]!
    editor.exec((ctx) => {
      ctx.tr.remove(celda)
      return true
    })
    // El normalizador la repuso: la tabla sigue siendo rectangular.
    for (const r of editor.block(tabla.id)!.children) {
      expect(editor.block(r)!.children).toHaveLength(3)
    }
  })
})

describe('un techo de reloj, para que una regresión de otro orden se note', () => {
  it('quinientas teclas en una página de dos mil bloques no llegan a dos segundos', () => {
    const { editor } = conBloques(2000)
    const t0 = performance.now()
    for (let i = 0; i < 500; i++) editor.run('insertText', { text: 'x' })
    const total = performance.now() - t0
    expect(total).toBeLessThan(2000)
  })

  it('abrir un documento de dos mil bloques no llega a dos segundos', () => {
    const t0 = performance.now()
    const editor = new Editor({ plugins: activityKit(), blocks: parrafos(2000) })
    expect(Object.keys(editor.doc.blocks)).toHaveLength(2001)
    expect(performance.now() - t0).toBeLessThan(2000)
  })
})
