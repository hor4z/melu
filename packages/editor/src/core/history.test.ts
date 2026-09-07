/**
 * Deshacer es lo que le da a alguien permiso para probar. Si no se puede confiar, se escribe con
 * miedo. Así que acá se prueban las tres cosas que hacen que se pueda confiar: que devuelve el
 * documento exacto, que devuelve el caret al lugar exacto, y que una palabra escrita es un solo
 * deshacer y no once.
 */

import { describe, expect, it } from 'vitest'
import { at, caretAt, editorWith, ids, makeEditor, press, selectBlocks, sketch, textAt, type, where } from '../test/engine.ts'
import { Editor } from './editor.ts'
import { basics } from '../plugins/index.ts'
import { toJSON } from './serialize.ts'

/** Un editor con reloj propio, para probar el agrupado sin esperar de verdad. */
function withClock(...lines: string[]) {
  let now = 0
  const e = new Editor({
    plugins: basics(),
    strict: true,
    blocks: lines.length ? [{ type: 'paragraph', text: [{ text: lines[0]! }] }] : undefined,
    history: { gap: 700, now: () => now },
  })
  return { e, tick: (ms: number) => (now += ms) }
}

describe('deshacer', () => {
  it('devuelve el documento tal como estaba', () => {
    const e = editorWith('medir el patio')
    const antes = toJSON(e.doc)
    caretAt(e, 0, 14)
    press(e, 'Enter')
    type(e, 'contar los pasos')
    expect(sketch(e)).toHaveLength(2)
    while (e.history.canUndo) e.undo()
    expect(toJSON(e.doc)).toEqual(antes)
  })

  it('devuelve el caret a donde estaba', () => {
    const e = editorWith('medir el patio')
    caretAt(e, 0, 6)
    e.run('insertText', { text: 'todo ' })
    expect(where(e)).toBe('0:11')
    e.undo()
    expect(where(e)).toBe('0:6')
  })

  it('rehacer vuelve a aplicar lo mismo', () => {
    const e = editorWith('uno')
    caretAt(e, 0, 3)
    press(e, 'Enter')
    type(e, 'dos')
    const despues = toJSON(e.doc)
    e.undo()
    e.undo()
    e.redo()
    e.redo()
    expect(toJSON(e.doc)).toEqual(despues)
  })

  it('sin nada que deshacer contesta que no', () => {
    const e = editorWith('uno')
    expect(e.undo()).toBe(false)
    expect(e.redo()).toBe(false)
  })

  it('un cambio nuevo tira la rama de rehacer', () => {
    const e = editorWith('uno')
    caretAt(e, 0, 3)
    type(e, ' dos')
    e.undo()
    expect(e.history.canRedo).toBe(true)
    type(e, ' tres')
    expect(e.history.canRedo).toBe(false)
  })

  it('mover el caret no es algo que deshacer', () => {
    const e = editorWith('uno', 'dos')
    caretAt(e, 0, 0)
    caretAt(e, 1, 2)
    expect(e.history.canUndo).toBe(false)
  })

  it('deshacer un borrado de varios bloques los trae a todos', () => {
    const e = editorWith('uno', 'dos', 'tres')
    const antes = toJSON(e.doc)
    selectBlocks(e, 0, 1)
    e.run('removeBlock')
    expect(sketch(e)).toEqual(['paragraph: tres'])
    e.undo()
    expect(toJSON(e.doc)).toEqual(antes)
  })

  it('deshacer un anidado devuelve la estructura', () => {
    const e = editorWith('- uno', '- dos')
    const antes = toJSON(e.doc)
    caretAt(e, 1, 0)
    press(e, 'Tab')
    expect(sketch(e)).toEqual(['bulleted_list: uno', '  bulleted_list: dos'])
    e.undo()
    expect(toJSON(e.doc)).toEqual(antes)
  })

  it('deshacer un cambio de tipo devuelve el tipo y las props', () => {
    const e = editorWith('- uno')
    const antes = toJSON(e.doc)
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'todo' })
    e.undo()
    expect(toJSON(e.doc)).toEqual(antes)
  })
})

describe('agrupar', () => {
  it('escribir una palabra es un solo deshacer', () => {
    const { e } = withClock('')
    caretAt(e, 0, 0)
    type(e, 'consigna')
    expect(e.history.size.past).toBe(1)
    e.undo()
    expect(textAt(e, 0)).toBe('')
  })

  it('después de una pausa, lo que se escribe es otro paso', () => {
    const { e, tick } = withClock('')
    caretAt(e, 0, 0)
    type(e, 'medir')
    tick(2000)
    type(e, ' el patio')
    expect(e.history.size.past).toBe(2)
    e.undo()
    expect(textAt(e, 0)).toBe('medir')
  })

  it('escribir en otro bloque arranca otro paso', () => {
    const { e } = withClock('uno')
    caretAt(e, 0, 3)
    type(e, '!')
    press(e, 'Enter')
    type(e, 'dos')
    e.undo()
    expect(ids(e)).toHaveLength(2)
    expect(textAt(e, 1)).toBe('')
  })

  it('borrar seguido también se agrupa', () => {
    const { e } = withClock('consigna')
    caretAt(e, 0, 8)
    for (let i = 0; i < 4; i++) press(e, 'Backspace')
    expect(e.history.size.past).toBe(1)
    e.undo()
    expect(textAt(e, 0)).toBe('consigna')
  })

  it('escribir y después borrar son dos pasos: no son el mismo gesto', () => {
    const { e } = withClock('')
    caretAt(e, 0, 0)
    type(e, 'abc')
    press(e, 'Backspace')
    expect(e.history.size.past).toBe(2)
  })

  it('break corta el grupo abierto', () => {
    const { e } = withClock('')
    caretAt(e, 0, 0)
    type(e, 'abc')
    e.history.break()
    type(e, 'def')
    expect(e.history.size.past).toBe(2)
  })
})

describe('el límite del historial', () => {
  it('no crece para siempre', () => {
    const e = new Editor({ plugins: basics(), strict: true, history: { depth: 5, gap: 0 } })
    caretAt(e, 0, 0)
    for (let i = 0; i < 20; i++) e.run('insertText', { text: 'x' })
    expect(e.history.size.past).toBeLessThanOrEqual(5)
  })
})

describe('lo que no entra al historial', () => {
  it('un cambio marcado como silencioso no se puede deshacer', () => {
    const e = makeEditor()
    caretAt(e, 0, 0)
    e.exec((ctx) => {
      ctx.tr.setText(at(e, 0), [{ text: 'puesto por el sistema' }])
      return true
    }, { history: false })
    expect(textAt(e, 0)).toBe('puesto por el sistema')
    expect(e.history.canUndo).toBe(false)
  })

  it('reemplazar el estado entero limpia el historial', () => {
    const e = editorWith('uno')
    caretAt(e, 0, 3)
    type(e, '!')
    expect(e.history.canUndo).toBe(true)
    e.setState(e.state)
    expect(e.history.canUndo).toBe(false)
  })
})
