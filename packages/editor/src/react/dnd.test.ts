// Dónde cae un bloque que se arrastra. Todo lo de acá recibe rectángulos como datos y devuelve un
// destino, así que se prueba sin navegador y sin montar nada: los rects se escriben a mano y la
// página queda siendo una pila de bandas de cuarenta píxeles.

import { describe, expect, it } from 'vitest'
import { isRealMove, measure, targetAt, type DropTarget } from './dnd.ts'
import { BLOCK_ATTR } from './dom.ts'
import { at, editorWith, ids, makeEditor, doc as md } from '../test/engine.ts'
import type { Editor } from '../core/index.ts'

const rect = (top: number, left = 52, width = 720, height = 40): DOMRect =>
  ({ x: left, y: top, top, left, width, height, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect

/** Un paso a la derecha, que es lo que el motor lee como un nivel más de sangría. */
const PASO = 28

/**
 * La página como una pila: el bloque `n` ocupa de `40n` a `40n + 40`, y arranca corrido a la
 * derecha según su profundidad. Las profundidades se pasan a mano para que el test diga en una
 * línea qué forma tenía la página.
 */
const foto = (editor: Editor, profundidades: readonly number[]) =>
  ids(editor).map((id, i) => {
    const depth = profundidades[i] ?? 0
    return { id, rect: rect(i * 40, 52 + depth * PASO), depth }
  })

const acepta = (editor: Editor) => (parent: string, child: string) => editor.state.schema.accepts(parent, child)

/** El centro vertical de la banda `n`, y un poco más abajo o más arriba. */
const medio = (n: number) => n * 40 + 20
const abajoDe = (n: number) => n * 40 + 30
const arribaDe = (n: number) => n * 40 + 10

const caer = (editor: Editor, profundidades: readonly number[], arrastrado: number, x: number, y: number): DropTarget | null =>
  targetAt(editor.doc, foto(editor, profundidades), at(editor, arrastrado), x, y, acepta(editor))

describe('en qué hueco cae', () => {
  it('en la mitad de arriba de un bloque cae antes, y en la de abajo cae después', () => {
    const e = editorWith('uno', 'dos', 'tres')
    const arriba = caer(e, [0, 0, 0], 0, 60, arribaDe(1))
    const abajo = caer(e, [0, 0, 0], 0, 60, abajoDe(1))
    expect(arriba?.index).toBe(1)
    expect(abajo?.index).toBe(2)
  })

  it('soltar más abajo del último bloque lo manda al final', () => {
    const e = editorWith('uno', 'dos', 'tres')
    // El puntero pasado del borde de abajo: el vecino más cercano es el último, y cae después.
    expect(caer(e, [0, 0, 0], 0, 60, 200)?.index).toBe(3)
  })

  it('un bloque alto pierde contra un vecino bajo si el centro del bajo está más cerca', () => {
    const e = editorWith('uno', 'alto', 'bajo')
    const [a, b, c] = ids(e) as [string, string, string]
    // El alto va de 40 a 240 (centro 140) y el bajo de 240 a 260 (centro 250). El puntero cae
    // adentro del alto, pero más cerca del centro del bajo.
    const pagina = [
      { id: a, rect: rect(0), depth: 0 },
      { id: b, rect: rect(40, 52, 720, 200), depth: 0 },
      { id: c, rect: rect(240, 52, 720, 20), depth: 0 },
    ]
    const destino = targetAt(e.doc, pagina, a, 60, 235, acepta(e))
    // Gana el bajo, y como el puntero está arriba de su centro, cae antes que él.
    expect(destino?.index).toBe(2)
  })

  it('el bloque que se arrastra no compite consigo mismo', () => {
    const e = editorWith('uno', 'dos')
    const destino = caer(e, [0, 0], 0, 60, medio(0))
    // Aunque el puntero esté sobre el primero, el destino se decide contra el segundo.
    expect(destino?.parent).toBe(e.doc.root)
    expect(destino?.index).toBe(1)
  })

  it('un hijo del que se arrastra tampoco: un bloque no puede caer adentro de sí mismo', () => {
    const e = editorWith('- padre', '  - hijo', 'suelto')
    const destino = caer(e, [0, 1, 0], 0, 60, medio(1))
    expect(destino?.parent).not.toBe(at(e, 1))
  })

  it('sin ningún candidato no hay destino, en lugar de uno inventado', () => {
    const e = editorWith('solo')
    expect(caer(e, [0], 0, 60, medio(0))).toBeNull()
  })

  it('un bloque que ya no está en el documento no arrastra nada', () => {
    const e = editorWith('uno', 'dos')
    expect(targetAt(e.doc, foto(e, [0, 0]), 'fantasma', 60, 20, acepta(e))).toBeNull()
  })
})

describe('a qué nivel cae', () => {
  it('un paso a la derecha del vecino quiere decir un nivel más adentro', () => {
    const e = editorWith('- uno', '- dos')
    const destino = caer(e, [0, 0], 1, 52 + PASO, abajoDe(0))
    expect(destino?.parent).toBe(at(e, 0))
  })

  it('dos pasos no quieren decir dos niveles: más a la derecha no baja más', () => {
    const e = editorWith('- uno', '- dos')
    const uno = caer(e, [0, 0], 1, 52 + PASO, abajoDe(0))
    const dos = caer(e, [0, 0], 1, 52 + PASO * 4, abajoDe(0))
    expect(dos?.parent).toBe(uno?.parent)
  })

  it('a la izquierda del vecino anidado se sale un nivel', () => {
    const e = editorWith('- padre', '  - hijo', '- otro')
    // El puntero a la altura del padre, debajo del hijo: el destino sale de adentro del padre.
    const destino = caer(e, [0, 1, 0], 2, 52, abajoDe(1))
    expect(destino?.parent).toBe(e.doc.root)
  })

  it('soltar arriba de un bloque anidado lo deja entre sus hermanos, y no en la raíz', () => {
    const e = editorWith('- padre', '  - hijo', '- otro')
    const destino = caer(e, [0, 1, 0], 2, 52 + PASO, arribaDe(1))
    expect(destino?.parent).toBe(at(e, 0))
    expect(destino?.index).toBe(0)
  })
})

describe('caer adentro de un contenedor', () => {
  it('sobre la mitad derecha de un contenedor vacío el destino es adentro', () => {
    const e = editorWith('- vacío', 'suelto')
    const destino = caer(e, [0, 0], 1, 52 + PASO * 2, abajoDe(0))
    expect(destino?.hint).toEqual({ kind: 'inside', id: at(e, 0) })
    expect(destino?.index).toBe(0)
  })

  it('un contenedor que ya tiene hijos no se ofrece por adentro: se entra por el hueco de arriba', () => {
    const e = editorWith('- padre', '  - hijo', 'suelto')
    const destino = caer(e, [0, 1, 0], 2, 52 + PASO * 2, abajoDe(0))
    expect(destino?.hint.kind).toBe('line')
  })

  it('sobre la mitad izquierda no se entra: quedarse al lado tiene que ser posible', () => {
    const e = editorWith('- vacío', 'suelto')
    const destino = caer(e, [0, 0], 1, 52, abajoDe(0))
    expect(destino?.hint.kind).toBe('line')
  })

  it('un contenedor que no acepta el tipo no se ofrece por adentro', () => {
    const e = makeEditor(md('| a | b |', '| --- | --- |', '| c | d |'))
    const suelto = e.run('insertBlock', { type: 'paragraph', at: 'end' })
    expect(suelto).toBe(true)
    const profundidades = ids(e).map((id) => (e.doc.blocks[id]!.type === 'table_cell' ? 2 : e.doc.blocks[id]!.type === 'table_row' ? 1 : 0))
    const ultimo = ids(e).length - 1
    const destino = targetAt(e.doc, foto(e, profundidades), at(e, ultimo), 52 + PASO * 2, abajoDe(0), acepta(e))
    // Una tabla sólo acepta filas: un párrafo no puede caer adentro suyo.
    expect(destino?.parent).not.toBe(at(e, 0))
  })
})

describe('destinos imposibles', () => {
  it('si nadie en la cadena acepta el tipo no hay destino, en lugar de una línea que miente', () => {
    const e = makeEditor(md('| a | b |', '| --- | --- |', '| c | d |'))
    e.run('insertBlock', { type: 'paragraph', at: 'end' })
    const tipoDe = (id: string) => e.doc.blocks[id]!.type
    const profundidades = ids(e).map((id) => (tipoDe(id) === 'table_cell' ? 2 : tipoDe(id) === 'table_row' ? 1 : 0))
    // Una fila sólo acepta celdas, y la tabla sólo filas: un párrafo no entra en ninguna de las dos.
    const fila = ids(e).findIndex((id) => tipoDe(id) === 'table_row')
    const ultimo = ids(e).length - 1
    const destino = targetAt(e.doc, foto(e, profundidades), at(e, ultimo), 52 + PASO * 3, abajoDe(fila), acepta(e))
    expect(destino === null || destino.parent === e.doc.root).toBe(true)
  })
})

describe('lo que se dibuja', () => {
  it('la línea de un destino "después" va en el borde de abajo del vecino', () => {
    const e = editorWith('uno', 'dos')
    const destino = caer(e, [0, 0], 1, 60, abajoDe(0))
    expect(destino?.hint).toMatchObject({ kind: 'line', y: 40 })
  })

  it('la línea de un destino "antes" va en el borde de arriba', () => {
    const e = editorWith('uno', 'dos')
    const destino = caer(e, [0, 0], 0, 60, arribaDe(1))
    expect(destino?.hint).toMatchObject({ kind: 'line', y: 40 })
  })

  it('la línea se corre un paso a la derecha por cada nivel de sangría', () => {
    const e = editorWith('- uno', '- dos')
    const plana = caer(e, [0, 0], 1, 52, abajoDe(0))
    const adentro = caer(e, [0, 0], 1, 52 + PASO, abajoDe(0))
    const x = (t: DropTarget | null) => (t?.hint.kind === 'line' ? t.hint.x : NaN)
    expect(x(adentro) - x(plana)).toBe(PASO)
  })
})

describe('medir la página', () => {
  it('los bloques salen en orden de lectura, con los anidados adentro', () => {
    const e = editorWith('- padre', '  - hijo', 'suelto')
    const container = document.createElement('div')
    for (const id of ids(e)) {
      const el = document.createElement('div')
      el.setAttribute(BLOCK_ATTR, id)
      el.getBoundingClientRect = () => rect(0, 52, 720, 40)
      container.append(el)
    }
    expect(measure(container, e.doc).map((p) => p.id)).toEqual(ids(e))
  })

  it('un bloque de alto cero no cuenta: todavía no se dibujó y ganaría por cercanía', () => {
    const e = editorWith('uno', 'dos')
    const container = document.createElement('div')
    ids(e).forEach((id, i) => {
      const el = document.createElement('div')
      el.setAttribute(BLOCK_ATTR, id)
      el.getBoundingClientRect = () => rect(0, 52, 720, i === 0 ? 0 : 40)
      container.append(el)
    })
    expect(measure(container, e.doc).map((p) => p.id)).toEqual([at(e, 1)])
  })

  it('la profundidad sale del documento y no del sangrado que tenga dibujado', () => {
    const e = editorWith('- padre', '  - hijo')
    const container = document.createElement('div')
    for (const id of ids(e)) {
      const el = document.createElement('div')
      el.setAttribute(BLOCK_ATTR, id)
      el.getBoundingClientRect = () => rect(0, 52, 720, 40)
      container.append(el)
    }
    expect(measure(container, e.doc).map((p) => p.depth)).toEqual([0, 1])
  })
})

describe('soltar donde ya estaba', () => {
  it('no es un movimiento: arrepentirse de un arrastre no puede gastar un deshacer', () => {
    const e = editorWith('uno', 'dos', 'tres')
    const target: DropTarget = { parent: e.doc.root, index: 1, hint: { kind: 'line', x: 0, y: 0, width: 0 } }
    expect(isRealMove(e.doc, at(e, 1), target)).toBe(false)
  })

  it('el hueco de abajo del propio bloque tampoco: los dos huecos que lo rodean son el mismo lugar', () => {
    const e = editorWith('uno', 'dos', 'tres')
    const target: DropTarget = { parent: e.doc.root, index: 2, hint: { kind: 'line', x: 0, y: 0, width: 0 } }
    expect(isRealMove(e.doc, at(e, 1), target)).toBe(false)
  })

  it('un hueco más allá sí es un movimiento', () => {
    const e = editorWith('uno', 'dos', 'tres')
    const target: DropTarget = { parent: e.doc.root, index: 3, hint: { kind: 'line', x: 0, y: 0, width: 0 } }
    expect(isRealMove(e.doc, at(e, 1), target)).toBe(true)
  })

  it('cambiar de padre siempre es un movimiento, aunque el índice sea el mismo', () => {
    const e = editorWith('- padre', '  - hijo', 'suelto')
    const target: DropTarget = { parent: at(e, 0), index: 0, hint: { kind: 'line', x: 0, y: 0, width: 0 } }
    expect(isRealMove(e.doc, at(e, 2), target)).toBe(true)
  })
})
