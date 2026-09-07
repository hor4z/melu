import { describe, expect, it } from 'vitest'
import { at, caretAt, editorWith, press, selectBlocks, selectRange, textAt } from './helpers.ts'
import { marksInSelection } from '../src/core/commands.ts'
import { plain, rangeHasMark } from '../src/core/text.ts'

const textOf = (e: ReturnType<typeof editorWith>, n: number) => e.block(at(e, n))!.text ?? []

describe('poner formato', () => {
  it('Mod+B pone negrita sobre lo seleccionado', () => {
    const e = editorWith('medir el patio')
    selectRange(e, [0, 0], [0, 5])
    expect(press(e, 'Mod-b')).toBe(true)
    expect(rangeHasMark(textOf(e, 0), 0, 5, 'bold')).toBe(true)
    expect(rangeHasMark(textOf(e, 0), 5, 14, 'bold')).toBe(false)
  })

  it('sin seleccionar nada, marca la palabra donde está el caret', () => {
    const e = editorWith('medir el patio')
    caretAt(e, 0, 3)
    press(e, 'Mod-b')
    expect(rangeHasMark(textOf(e, 0), 0, 5, 'bold')).toBe(true)
  })

  it('la selección no se mueve al poner formato', () => {
    const e = editorWith('medir el patio')
    selectRange(e, [0, 0], [0, 5])
    press(e, 'Mod-b')
    expect(e.selection).toEqual({
      kind: 'text',
      anchor: { block: at(e, 0), offset: 0 },
      head: { block: at(e, 0), offset: 5 },
    })
  })

  it('el segundo Mod+B la quita', () => {
    const e = editorWith('medir el patio')
    selectRange(e, [0, 0], [0, 5])
    press(e, 'Mod-b')
    press(e, 'Mod-b')
    expect(rangeHasMark(textOf(e, 0), 0, 5, 'bold')).toBe(false)
  })

  it('una selección a medias se completa primero', () => {
    const e = editorWith('**medir** el patio')
    selectRange(e, [0, 0], [0, 14])
    press(e, 'Mod-b')
    expect(rangeHasMark(textOf(e, 0), 0, 14, 'bold')).toBe(true)
  })

  it('varias marcas conviven sobre el mismo texto', () => {
    const e = editorWith('medir')
    selectRange(e, [0, 0], [0, 5])
    press(e, 'Mod-b')
    press(e, 'Mod-i')
    press(e, 'Mod-u')
    expect(textOf(e, 0)[0]!.marks?.map((m) => m.type).sort()).toEqual(['bold', 'italic', 'underline'])
  })

  it('el resaltado es una marca con valor', () => {
    const e = editorWith('importante')
    selectRange(e, [0, 0], [0, 10])
    press(e, 'Mod-Shift-h')
    expect(textOf(e, 0)[0]!.marks).toEqual([{ type: 'bg', value: 'yellow' }])
  })

  it('un bloque de código no acepta formato', () => {
    const e = editorWith('```python', 'print(1)', '```')
    selectRange(e, [0, 0], [0, 5])
    expect(e.run('toggleMark', { type: 'bold' })).toBe(false)
    expect(textOf(e, 0)[0]!.marks).toBeUndefined()
  })
})

describe('formato sobre varios bloques', () => {
  it('una selección que cruza bloques marca los dos', () => {
    const e = editorWith('medir el patio', 'contar los pasos')
    selectRange(e, [0, 6], [1, 6])
    press(e, 'Mod-b')
    expect(rangeHasMark(textOf(e, 0), 6, 14, 'bold')).toBe(true)
    expect(rangeHasMark(textOf(e, 1), 0, 6, 'bold')).toBe(true)
    expect(rangeHasMark(textOf(e, 1), 6, 16, 'bold')).toBe(false)
  })

  it('el bloque del medio se marca entero', () => {
    const e = editorWith('uno', 'dos', 'tres')
    selectRange(e, [0, 1], [2, 1])
    press(e, 'Mod-b')
    expect(rangeHasMark(textOf(e, 1), 0, 3, 'bold')).toBe(true)
  })

  it('si ya está en todos, se quita de todos: no queda a medias', () => {
    const e = editorWith('uno', 'dos')
    selectRange(e, [0, 0], [1, 3])
    press(e, 'Mod-b')
    press(e, 'Mod-b')
    expect(rangeHasMark(textOf(e, 0), 0, 3, 'bold')).toBe(false)
    expect(rangeHasMark(textOf(e, 1), 0, 3, 'bold')).toBe(false)
  })

  it('con bloques enteros seleccionados marca todo su texto', () => {
    const e = editorWith('uno', 'dos')
    selectBlocks(e, 0, 1)
    e.run('toggleMark', { type: 'bold' })
    expect(rangeHasMark(textOf(e, 0), 0, 3, 'bold')).toBe(true)
    expect(rangeHasMark(textOf(e, 1), 0, 3, 'bold')).toBe(true)
  })
})

describe('lo que muestra la barra', () => {
  it('devuelve las marcas activas de la selección', () => {
    const e = editorWith('**medir** el patio')
    selectRange(e, [0, 0], [0, 5])
    expect(marksInSelection(e.state).map((m) => m.type)).toEqual(['bold'])
  })

  it('no devuelve las que no cubren todo', () => {
    const e = editorWith('**medir** el patio')
    selectRange(e, [0, 0], [0, 14])
    expect(marksInSelection(e.state)).toEqual([])
  })

  it('cruzando bloques, solo lo que comparten los dos', () => {
    const e = editorWith('**uno**', '*dos*')
    selectRange(e, [0, 0], [1, 3])
    expect(marksInSelection(e.state)).toEqual([])
  })
})

describe('links', () => {
  it('pone un link sobre la selección', () => {
    const e = editorWith('ver la página')
    selectRange(e, [0, 4], [0, 13])
    e.run('setLink', { href: 'https://educabot.com' })
    expect(textOf(e, 0)[1]!.marks).toEqual([{ type: 'link', value: 'https://educabot.com' }])
  })

  it('sin seleccionar, el link va sobre la palabra del caret', () => {
    const e = editorWith('ver educabot ya')
    caretAt(e, 0, 7)
    e.run('setLink', { href: 'https://educabot.com' })
    expect(plain(textOf(e, 0).filter((s) => s.marks?.length))).toBe('educabot')
  })

  it('con href vacío lo quita', () => {
    const e = editorWith('[la página](https://x.ar)')
    selectRange(e, [0, 0], [0, 9])
    e.run('setLink', { href: '' })
    expect(textOf(e, 0).some((s) => s.marks?.some((m) => m.type === 'link'))).toBe(false)
  })

  it('escribir al lado de un link no lo extiende', () => {
    const e = editorWith('[la página](https://x.ar)')
    caretAt(e, 0, 9)
    e.run('insertText', { text: ' ya' })
    expect(textAt(e, 0)).toBe('la página ya')
    const last = textOf(e, 0).at(-1)!
    expect(last.marks?.some((m) => m.type === 'link')).toBeFalsy()
  })
})

describe('limpiar el formato', () => {
  it('Mod+Shift+C deja el texto pelado', () => {
    const e = editorWith('**medir** *el* `patio`')
    selectRange(e, [0, 0], [0, 14])
    press(e, 'Mod-Shift-c')
    expect(textOf(e, 0)).toEqual([{ text: 'medir el patio' }])
  })

  it('sin nada seleccionado no hace nada', () => {
    const e = editorWith('**medir**')
    caretAt(e, 0, 2)
    expect(e.run('clearFormatting')).toBe(false)
  })
})
