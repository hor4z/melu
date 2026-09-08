// Los tests del tacto: cada uno describe algo que se siente al escribir, no una función. El orden
// de las ramas de Enter y de Backspace es la mitad de la experiencia de un editor de bloques, y es
// lo primero que se rompe cuando alguien toca el motor.

import { describe, expect, it } from 'vitest'
import { at, caretAt, editorWith, ids, makeEditor, press, selectBlocks, selectRange, sketch, textAt, type, typeAt, where } from '../test/engine.ts'
import { assertValid } from './doc.ts'
import { marksInSelection } from './commands.ts'
import { plain, rangeHasMark } from './text.ts'

/** El texto de un bloque por posición, como lista de runs: es lo que se afirma al marcar. */
const textOf = (e: ReturnType<typeof editorWith>, n: number) => e.block(at(e, n))!.text ?? []

describe('Enter', () => {
  it('al final de un párrafo abre otro párrafo', () => {
    const e = editorWith('la primera consigna')
    caretAt(e, 0, 19)
    expect(press(e, 'Enter')).toBe(true)
    expect(sketch(e)).toEqual(['paragraph: la primera consigna', 'paragraph'])
    expect(where(e)).toBe('1:0')
  })

  it('al final de un título abre un párrafo, no otro título', () => {
    const e = editorWith('# Medir el patio')
    caretAt(e, 0, 16)
    press(e, 'Enter')
    expect(typeAt(e, 1)).toBe('paragraph')
  })

  it('al final de un ítem de lista abre otro ítem', () => {
    const e = editorWith('- una cinta')
    caretAt(e, 0, 11)
    press(e, 'Enter')
    expect(typeAt(e, 1)).toBe('bulleted_list')
  })

  it('en un ítem de lista vacío deja de ser lista, en lugar de encadenar ítems vacíos', () => {
    const e = editorWith('- una cinta', '- ')
    expect(typeAt(e, 1)).toBe('bulleted_list')
    caretAt(e, 1, 0)
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['bulleted_list: una cinta', 'paragraph'])
  })

  it('en el medio parte el texto y el caret se va con la cola', () => {
    const e = editorWith('medir el patio')
    caretAt(e, 0, 6)
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['paragraph: medir ', 'paragraph: el patio'])
    expect(where(e)).toBe('1:0')
  })

  it('al principio empuja el bloque hacia abajo y el caret se queda con el texto', () => {
    const e = editorWith('medir el patio')
    caretAt(e, 0, 0)
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['paragraph', 'paragraph: medir el patio'])
    expect(textAt(e, 1)).toBe('medir el patio')
    expect(where(e)).toBe('1:0')
  })

  it('parte respetando el formato de cada mitad', () => {
    const e = editorWith('**medir** el patio')
    caretAt(e, 0, 5)
    press(e, 'Enter')
    expect(e.block(at(e, 0))!.text).toEqual([{ text: 'medir', marks: [{ type: 'bold' }] }])
    expect(plain(e.block(at(e, 1))!.text)).toBe(' el patio')
  })

  it('al final de un desplegable con hijos, lo nuevo entra adentro', () => {
    // En markdown "> " es una cita, que es lo estándar, así que el desplegable se arma a mano.
    // Al tipear "> " en el editor sí sale un desplegable: es lo que hace Notion, y las dos cosas
    // conviven porque pegar markdown y escribir no son el mismo gesto.
    const e = makeEditor([
      { type: 'toggle', text: [{ text: 'La pista' }], children: [{ type: 'paragraph', text: [{ text: 'una cinta y un lápiz' }] }] },
    ])
    expect(sketch(e)).toEqual(['toggle: La pista', '  paragraph: una cinta y un lápiz'])
    caretAt(e, 0, 8)
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['toggle: La pista', '  toggle', '  paragraph: una cinta y un lápiz'])
  })

  it('con texto seleccionado, primero borra y después parte', () => {
    const e = editorWith('medir todo el patio')
    selectRange(e, [0, 6], [0, 11])
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['paragraph: medir ', 'paragraph: el patio'])
  })

  it('con bloques seleccionados abre un párrafo después del último', () => {
    const e = editorWith('uno', 'dos')
    selectBlocks(e, 0, 1)
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['paragraph: uno', 'paragraph: dos', 'paragraph'])
  })

  it('en un bloque sin texto abre un párrafo abajo', () => {
    const e = editorWith('---')
    e.run('selectBlock', { id: at(e, 0) })
    press(e, 'Enter')
    expect(sketch(e)).toEqual(['divider', 'paragraph'])
  })
})

describe('Shift+Enter', () => {
  it('mete un renglón adentro del mismo bloque', () => {
    const e = editorWith('primera')
    caretAt(e, 0, 7)
    press(e, 'Shift-Enter')
    type(e, 'segunda')
    expect(ids(e)).toHaveLength(1)
    expect(textAt(e, 0)).toBe('primera\nsegunda')
  })
})

describe('Backspace', () => {
  it('borra un carácter', () => {
    const e = editorWith('patio')
    caretAt(e, 0, 5)
    press(e, 'Backspace')
    expect(textAt(e, 0)).toBe('pati')
    expect(where(e)).toBe('0:4')
  })

  it('borra un emoji entero de una vez, no un pedazo', () => {
    const e = editorWith('listo 👨‍👩‍👧‍👦')
    const total = plain(e.block(at(e, 0))!.text).length
    caretAt(e, 0, total)
    press(e, 'Backspace')
    expect(textAt(e, 0)).toBe('listo ')
  })

  it('al principio de un título lo vuelve texto, sin borrar nada', () => {
    const e = editorWith('# Medir el patio')
    caretAt(e, 0, 0)
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['paragraph: Medir el patio'])
  })

  it('al principio de un ítem de lista lo vuelve texto', () => {
    const e = editorWith('- una cinta')
    caretAt(e, 0, 0)
    press(e, 'Backspace')
    expect(typeAt(e, 0)).toBe('paragraph')
  })

  it('al principio de un párrafo se pega con el de arriba y el caret queda en la junta', () => {
    const e = editorWith('medir', 'el patio')
    caretAt(e, 1, 0)
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['paragraph: medirel patio'])
    expect(where(e)).toBe('0:5')
  })

  it('un bloque anidado sale un nivel antes de pegarse con nada', () => {
    const e = editorWith('- uno', '  - dos')
    expect(sketch(e)).toEqual(['bulleted_list: uno', '  bulleted_list: dos'])
    caretAt(e, 1, 0)
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['bulleted_list: uno', 'bulleted_list: dos'])
  })

  it('delante de una imagen la selecciona en lugar de borrarla de una', () => {
    const e = editorWith('![](https://x.ar/foto.png)', 'después')
    caretAt(e, 1, 0)
    press(e, 'Backspace')
    expect(where(e)).toBe('bloques 0')
    expect(sketch(e)).toEqual(['image', 'paragraph: después'])
  })

  it('con la imagen seleccionada, ahí sí la borra', () => {
    const e = editorWith('![](https://x.ar/foto.png)', 'después')
    e.run('selectBlock', { id: at(e, 0) })
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['paragraph: después'])
  })

  it('se lleva los hijos con el texto al pegarse', () => {
    // Dos párrafos, no dos ítems: en una lista el primer Backspace desanida o deshace el tipo, y
    // el que pega con el de arriba es el segundo. Acá se prueba el pegado.
    const e = makeEditor([
      { type: 'paragraph', text: [{ text: 'uno' }] },
      { type: 'paragraph', text: [{ text: 'dos' }], children: [{ type: 'bulleted_list', text: [{ text: 'anidado' }] }] },
    ])
    caretAt(e, 1, 0)
    press(e, 'Backspace')
    expect(sketch(e)).toEqual(['paragraph: unodos', '  bulleted_list: anidado'])
  })

  it('en el primer bloque del documento no hace nada', () => {
    const e = editorWith('solo')
    caretAt(e, 0, 0)
    expect(press(e, 'Backspace')).toBe(false)
    expect(sketch(e)).toEqual(['paragraph: solo'])
  })

  it('Mod+Backspace se lleva la palabra', () => {
    const e = editorWith('medir el patio')
    caretAt(e, 0, 14)
    press(e, 'Mod-Backspace')
    expect(textAt(e, 0)).toBe('medir el ')
  })
})

describe('Delete', () => {
  it('borra hacia adelante', () => {
    const e = editorWith('patio')
    caretAt(e, 0, 0)
    press(e, 'Delete')
    expect(textAt(e, 0)).toBe('atio')
  })

  it('al final trae el bloque de abajo', () => {
    const e = editorWith('medir', 'el patio')
    caretAt(e, 0, 5)
    press(e, 'Delete')
    expect(sketch(e)).toEqual(['paragraph: medirel patio'])
    expect(where(e)).toBe('0:5')
  })
})

describe('borrar una selección', () => {
  it('dentro de un bloque saca el rango', () => {
    const e = editorWith('medir todo el patio')
    selectRange(e, [0, 5], [0, 10])
    e.run('deleteSelection')
    expect(textAt(e, 0)).toBe('medir el patio')
    expect(where(e)).toBe('0:5')
  })

  it('cruzando dos bloques pega la cabeza del primero con la cola del último', () => {
    const e = editorWith('medir el patio', 'contar los pasos')
    selectRange(e, [0, 6], [1, 7])
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph: medir los pasos'])
    expect(where(e)).toBe('0:6')
  })

  it('cruzando tres, los del medio desaparecen', () => {
    const e = editorWith('uno', 'dos', 'tres')
    selectRange(e, [0, 2], [2, 2])
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph: unes'])
  })

  it('el tipo que queda es el del primero', () => {
    const e = editorWith('# Título', 'texto común')
    selectRange(e, [0, 3], [1, 5])
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['heading_1: Tít común'])
  })

  it('los hijos del último bloque no se pierden', () => {
    const e = editorWith('uno', '- dos', '  - anidado')
    selectRange(e, [0, 1], [1, 1])
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph: uos', '  bulleted_list: anidado'])
  })

  it('con bloques enteros seleccionados los saca a todos', () => {
    const e = editorWith('uno', 'dos', 'tres')
    selectBlocks(e, 0, 1)
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph: tres'])
  })

  it('borrar todo deja un párrafo donde escribir', () => {
    const e = editorWith('uno', 'dos')
    selectBlocks(e, 0, 1)
    e.run('deleteSelection')
    expect(sketch(e)).toEqual(['paragraph'])
    expect(e.selection?.kind).toBe('text')
  })
})

describe('Tab y Shift+Tab', () => {
  it('Tab anida abajo del hermano de arriba', () => {
    const e = editorWith('- uno', '- dos')
    caretAt(e, 1, 0)
    press(e, 'Tab')
    expect(sketch(e)).toEqual(['bulleted_list: uno', '  bulleted_list: dos'])
  })

  it('sin hermano arriba, Tab no hace nada', () => {
    const e = editorWith('- uno')
    caretAt(e, 0, 0)
    expect(press(e, 'Tab')).toBe(false)
  })

  it('Shift+Tab lo saca justo después de lo que era su padre', () => {
    const e = editorWith('- uno', '  - dos', '- tres')
    caretAt(e, 1, 0)
    press(e, 'Shift-Tab')
    expect(sketch(e)).toEqual(['bulleted_list: uno', 'bulleted_list: dos', 'bulleted_list: tres'])
  })

  it('anidar se lleva los hijos', () => {
    const e = editorWith('- uno', '- dos', '  - anidado')
    caretAt(e, 1, 0)
    press(e, 'Tab')
    expect(sketch(e)).toEqual(['bulleted_list: uno', '  bulleted_list: dos', '    bulleted_list: anidado'])
  })

  it('con varios bloques seleccionados los anida a todos y no se pisan entre ellos', () => {
    const e = editorWith('- uno', '- dos', '- tres')
    selectBlocks(e, 1, 2)
    e.run('indent')
    expect(sketch(e)).toEqual(['bulleted_list: uno', '  bulleted_list: dos', '  bulleted_list: tres'])
  })

  it('desanidar varios los saca en orden, sin invertirlos', () => {
    const e = editorWith('- uno', '  - dos', '  - tres')
    selectBlocks(e, 1, 2)
    e.run('outdent')
    expect(sketch(e)).toEqual(['bulleted_list: uno', 'bulleted_list: dos', 'bulleted_list: tres'])
  })

  it('un bloque de arriba no se puede desanidar más', () => {
    const e = editorWith('- uno')
    caretAt(e, 0, 0)
    expect(press(e, 'Shift-Tab')).toBe(false)
  })
})

describe('mover bloques', () => {
  it('Mod+Shift+Arriba sube el bloque', () => {
    const e = editorWith('uno', 'dos')
    caretAt(e, 1, 0)
    press(e, 'Mod-Shift-ArrowUp')
    expect(sketch(e)).toEqual(['paragraph: dos', 'paragraph: uno'])
  })

  it('Mod+Shift+Abajo lo baja', () => {
    const e = editorWith('uno', 'dos')
    caretAt(e, 0, 0)
    press(e, 'Mod-Shift-ArrowDown')
    expect(sketch(e)).toEqual(['paragraph: dos', 'paragraph: uno'])
  })

  it('subir el primero no hace nada', () => {
    const e = editorWith('uno', 'dos')
    caretAt(e, 0, 0)
    expect(press(e, 'Mod-Shift-ArrowUp')).toBe(false)
  })

  it('con cinco bloques elegidos suben los cinco, y no sólo el que tiene el caret', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis')
    selectBlocks(e, 2, 3, 4)
    press(e, 'Mod-Shift-ArrowUp')
    expect(sketch(e)).toEqual([
      'paragraph: uno',
      'paragraph: tres',
      'paragraph: cuatro',
      'paragraph: cinco',
      'paragraph: dos',
      'paragraph: seis',
    ])
  })

  it('y bajan los cinco también', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro')
    selectBlocks(e, 0, 1)
    press(e, 'Mod-Shift-ArrowDown')
    expect(sketch(e)).toEqual(['paragraph: tres', 'paragraph: uno', 'paragraph: dos', 'paragraph: cuatro'])
  })

  it('un rango de texto que cruza tres bloques los mueve a los tres', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro')
    selectRange(e, [1, 1], [2, 2])
    press(e, 'Mod-Shift-ArrowDown')
    expect(sketch(e)).toEqual(['paragraph: uno', 'paragraph: cuatro', 'paragraph: dos', 'paragraph: tres'])
  })

  it('el grupo se queda elegido después de moverse: mover dos veces mueve lo mismo', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro')
    selectBlocks(e, 2, 3)
    press(e, 'Mod-Shift-ArrowUp')
    press(e, 'Mod-Shift-ArrowUp')
    expect(sketch(e)).toEqual(['paragraph: tres', 'paragraph: cuatro', 'paragraph: uno', 'paragraph: dos'])
  })

  it('bloques salteados no se mueven: no hay un lugar donde eso quiera decir algo', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro')
    selectBlocks(e, 0, 2)
    expect(press(e, 'Mod-Shift-ArrowDown')).toBe(false)
    expect(sketch(e)).toEqual(['paragraph: uno', 'paragraph: dos', 'paragraph: tres', 'paragraph: cuatro'])
  })

  it('el grupo pegado al borde no se mueve, en lugar de moverse a medias', () => {
    const e = editorWith('uno', 'dos', 'tres')
    selectBlocks(e, 0, 1)
    expect(press(e, 'Mod-Shift-ArrowUp')).toBe(false)
  })

  it('mover no cambia la profundidad: sube entre sus hermanos', () => {
    const e = editorWith('- uno', '  - a', '  - b')
    caretAt(e, 2, 0)
    press(e, 'Mod-Shift-ArrowUp')
    expect(sketch(e)).toEqual(['bulleted_list: uno', '  bulleted_list: b', '  bulleted_list: a'])
  })

  it('varios bloques al mismo lugar llegan juntos y en el orden en que se leían', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro', 'cinco')
    e.run('moveBlocks', { ids: [at(e, 0), at(e, 1)], parent: e.doc.root, index: 4 })
    expect(sketch(e)).toEqual([
      'paragraph: tres',
      'paragraph: cuatro',
      'paragraph: uno',
      'paragraph: dos',
      'paragraph: cinco',
    ])
  })

  it('llevarlos hacia arriba también los deja pegados', () => {
    const e = editorWith('uno', 'dos', 'tres', 'cuatro')
    e.run('moveBlocks', { ids: [at(e, 2), at(e, 3)], parent: e.doc.root, index: 0 })
    expect(sketch(e)).toEqual(['paragraph: tres', 'paragraph: cuatro', 'paragraph: uno', 'paragraph: dos'])
  })

  it('el orden lo pone el documento y no el orden en que se los nombra', () => {
    const e = editorWith('uno', 'dos', 'tres')
    e.run('moveBlocks', { ids: [at(e, 1), at(e, 0)], parent: e.doc.root, index: 3 })
    expect(sketch(e)).toEqual(['paragraph: tres', 'paragraph: uno', 'paragraph: dos'])
  })

  it('adentro de un contenedor que los acepta entran los que puede, y los que no se quedan', () => {
    const e = editorWith('- lista', 'suelto', 'otro')
    e.run('moveBlocks', { ids: [at(e, 1), at(e, 2)], parent: at(e, 0), index: 0 })
    expect(sketch(e)).toEqual(['bulleted_list: lista', '  paragraph: suelto', '  paragraph: otro'])
  })

  it('moveBlock se niega a meter un bloque adentro de sí mismo', () => {
    const e = editorWith('- uno', '  - dos')
    expect(e.run('moveBlock', { id: at(e, 0), parent: at(e, 1), index: 0 })).toBe(false)
    assertValid(e.doc)
  })
})

describe('duplicar y borrar', () => {
  it('Mod+D duplica el bloque con sus hijos', () => {
    const e = editorWith('- uno', '  - anidado')
    caretAt(e, 0, 0)
    press(e, 'Mod-d')
    expect(sketch(e)).toEqual([
      'bulleted_list: uno',
      '  bulleted_list: anidado',
      'bulleted_list: uno',
      '  bulleted_list: anidado',
    ])
  })

  it('la copia tiene ids nuevos', () => {
    const e = editorWith('uno')
    caretAt(e, 0, 0)
    press(e, 'Mod-d')
    const [a, b] = ids(e)
    expect(a).not.toBe(b)
  })

  it('borrar el último bloque deja un párrafo vacío', () => {
    const e = editorWith('uno')
    expect(e.run('removeBlock', { id: at(e, 0) })).toBe(true)
    expect(sketch(e)).toEqual(['paragraph'])
  })
})

describe('cambiar el tipo', () => {
  it('un párrafo se vuelve título y guarda el texto', () => {
    const e = editorWith('Medir el patio')
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'heading_2' })
    expect(sketch(e)).toEqual(['heading_2: Medir el patio'])
  })

  it('las props del tipo nuevo son las suyas, no las del viejo', () => {
    const e = editorWith('- uno')
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'todo' })
    expect(e.block(at(e, 0))!.props).toEqual({ checked: false })
  })

  it('convertir a un tipo sin texto no deja el texto colgado', () => {
    const e = editorWith('Medir el patio')
    caretAt(e, 0, 0)
    e.run('setBlockType', { type: 'divider' })
    expect(plain(e.block(at(e, 0))!.text)).toBe('')
  })

  it('con varios bloques seleccionados los convierte a todos', () => {
    const e = editorWith('uno', 'dos', 'tres')
    selectBlocks(e, 0, 1, 2)
    e.run('setBlockType', { type: 'bulleted_list' })
    expect(sketch(e).every((l) => l.startsWith('bulleted_list'))).toBe(true)
  })

  it('convertir a lo que ya es no cuenta como cambio', () => {
    const e = editorWith('uno')
    caretAt(e, 0, 0)
    expect(e.run('setBlockType', { type: 'paragraph' })).toBe(false)
  })
})

describe('Mod+A', () => {
  it('primero selecciona el texto del bloque', () => {
    const e = editorWith('Medir el patio', 'y contar')
    caretAt(e, 0, 5)
    expect(press(e, 'Mod-a')).toBe(true)
    expect(where(e)).toBe('0:0-0:14')
  })

  it('y de nuevo, toda la página', () => {
    const e = editorWith('Medir el patio', 'y contar')
    caretAt(e, 0, 5)
    press(e, 'Mod-a')
    press(e, 'Mod-a')
    expect(where(e)).toBe('bloques 0,1')
  })

  it('en un bloque vacío pasa derecho a toda la página', () => {
    // A mano: el markdown descarta una línea vacía, así que no sirve para armar este caso.
    const e = makeEditor([{ type: 'paragraph', text: [] }, { type: 'paragraph', text: [{ text: 'algo' }] }])
    caretAt(e, 0, 0)
    press(e, 'Mod-a')
    expect(e.selection?.kind).toBe('blocks')
  })

  it('con bloques ya seleccionados no cambia nada', () => {
    const e = editorWith('uno', 'dos')
    selectBlocks(e, 0)
    press(e, 'Mod-a')
    expect(where(e)).toBe('bloques 0,1')
  })
})

describe('el documento nunca queda sin dónde escribir', () => {
  it('un editor sin contenido arranca con un párrafo', () => {
    const e = makeEditor()
    expect(sketch(e)).toEqual(['paragraph'])
    expect(e.selection?.kind).toBe('text')
  })

  it('y ese párrafo inicial no es un paso para deshacer', () => {
    const e = makeEditor()
    expect(e.history.canUndo).toBe(false)
  })
})

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
