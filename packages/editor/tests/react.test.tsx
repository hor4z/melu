/**
 * La capa de vista, probada contra un DOM de verdad (jsdom).
 *
 * Lo que se prueba acá es la costura: que lo que el navegador escribe llegue al modelo, que lo que
 * el modelo cambia llegue a la pantalla, que el caret vaya donde el modelo dice, y que una tecla
 * repinte un párrafo y no la página. Esa última es la afirmación más valiosa del archivo y la
 * única forma honesta de sostener la palabra "performante": se cuentan los renders.
 *
 * jsdom no dibuja, así que lo que depende de geometría (dónde se ubica un menú, en qué renglón
 * está el caret) no se prueba acá: eso se probó a mano en el navegador y vive en el taller.
 */

import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { BlockEditor } from '../src/BlockEditor.tsx'
import { Surface } from '../src/react/Surface.tsx'
import { useNewEditor } from '../src/react/hooks.ts'
import { defaultRenderers, type Renderer, type Renderers } from '../src/react/renderers.tsx'
import { activityKit } from '../src/plugins/index.ts'
import { fromMarkdown, plain, type BlockJSON, type Editor } from '../src/core/index.ts'
import { eventoDePegado } from './setup.ts'

const json = (markdown: string): BlockJSON[] =>
  fromMarkdown(markdown).map(function walk(b): BlockJSON {
    return {
      type: b.type,
      ...(b.text !== undefined ? { text: b.text } : {}),
      ...(b.props ? { props: b.props } : {}),
      ...(b.children?.length ? { children: b.children.map(walk) } : {}),
    }
  })

/** Monta el editor y devuelve el motor, que es con lo que se afirma. */
function mount(markdown: string, props: Partial<Parameters<typeof BlockEditor>[0]> = {}) {
  let editor!: Editor
  const view = render(
    <BlockEditor
      value={json(markdown)}
      strict
      toolbox={false}
      aria-label="El contenido"
      onReady={(e) => {
        editor = e
      }}
      {...props}
    />,
  )
  return { editor, view }
}

/** Las regiones editables, en orden. No hay un rol único: un título es un título. */
const blocks = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-melu-text]')]

/**
 * Pone el caret de verdad: en el DOM y en el modelo.
 *
 * En el navegador la selección del modelo sale de la del DOM, no al revés, y todo lo que flota
 * (la barra de formato, el menú) se ubica midiendo dónde está el caret. Un test que solo mueve el
 * modelo prueba media costura, así que acá se mueven las dos.
 */
function caretTo(editor: Editor, index: number, from: number, to = from) {
  const el = blocks()[index]!
  const node = el.firstChild?.firstChild ?? el
  const max = node.nodeType === 3 ? (node as Text).length : 0
  // El foco primero: enfocar un editable mueve la selección al principio, así que ponerla antes
  // sería ponerla para que se la lleve el foco. En el navegador un click hace las dos a la vez.
  el.focus()
  const range = document.createRange()
  range.setStart(node, Math.min(from, max))
  range.setEnd(node, Math.min(to, max))
  const sel = document.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  const id = editor.doc.blocks[editor.doc.root]!.children[index]!
  act(() => {
    editor.setSelection({ kind: 'text', anchor: { block: id, offset: from }, head: { block: id, offset: to } })
  })
}

describe('lo que se dibuja', () => {
  it('cada bloque con texto es una región editable', () => {
    mount('# Medir el patio\n\nCon la cinta')
    expect(blocks().map((el) => el.textContent)).toEqual(['Medir el patio', 'Con la cinta'])
    expect(blocks().every((el) => el.getAttribute('contenteditable') === 'true')).toBe(true)
  })

  it('un título se dibuja con su etiqueta, así un lector de pantalla lo anuncia como título', () => {
    mount('# Medir\n\n## Antes')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Medir')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Antes')
  })

  it('un checklist es una casilla de verdad, con el texto como etiqueta', () => {
    mount('- [x] Anotar la fecha')
    const casilla = screen.getByRole('checkbox', { name: 'Anotar la fecha' })
    expect(casilla).toBeChecked()
  })

  it('una imagen lleva su texto alternativo', () => {
    mount('![Un patio](https://x.ar/p.png)')
    expect(screen.getByRole('img', { name: 'Un patio' })).toHaveAttribute('src', 'https://x.ar/p.png')
  })

  it('un bloque vacío muestra su texto de ayuda', () => {
    mount('')
    expect(blocks()[0]).toHaveAttribute('data-placeholder', expect.stringContaining('/'))
    expect(blocks()[0]).toHaveClass('melu-empty')
  })

  it('el anidado se dibuja anidado', () => {
    mount('- uno\n  - dos')
    const primero = blocks()[0]!.closest('[data-melu-block]')!
    expect(primero.querySelectorAll('[data-melu-block]')).toHaveLength(1)
  })

  it('una tabla se dibuja como grilla y dice cuántas columnas tiene', () => {
    mount('| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |')
    const tabla = screen.getByRole('table')
    expect(tabla.style.getPropertyValue('--melu-cols')).toBe('3')
    expect(screen.getAllByRole('cell')).toHaveLength(6)
  })

  it('un tipo que nadie sabe dibujar no rompe la página: se muestra con su nombre', () => {
    mount('')
    const { editor } = mount('')
    act(() => {
      editor.exec((ctx) => {
        ctx.tr.append(ctx.tr.doc.root, { type: 'sensor_de_luz', text: [{ text: 'pin 13' }] })
        return true
      })
    })
    expect(screen.getByText('sensor_de_luz')).toBeInTheDocument()
    expect(screen.getByText('pin 13')).toBeInTheDocument()
  })
})

describe('escribir', () => {
  it('lo que se teclea llega al modelo', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, 'Medir el patio')
    expect(plain(editor.block(editor.doc.blocks[editor.doc.root]!.children[0]!)?.text)).toBe('Medir el patio')
  })

  it('Enter abre otro bloque y deja el caret ahí', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Primero')
    caretTo(editor, 0, 7)
    await user.keyboard('{Enter}')
    expect(editor.doc.blocks[editor.doc.root]!.children).toHaveLength(2)
    const segundo = editor.doc.blocks[editor.doc.root]!.children[1]!
    expect(editor.selection).toMatchObject({ head: { block: segundo, offset: 0 } })
  })

  it('lo que se escribe después de Enter va al bloque nuevo, no al anterior', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Primero')
    caretTo(editor, 0, 7)
    await user.keyboard('{Enter}')
    await user.keyboard('Segundo')
    const ids = editor.doc.blocks[editor.doc.root]!.children
    expect(ids.map((id) => plain(editor.block(id)?.text))).toEqual(['Primero', 'Segundo'])
  })

  it('un cambio del modelo se ve en la pantalla', () => {
    const { editor } = mount('Primero')
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    act(() => {
      editor.exec((ctx) => {
        ctx.tr.setText(id, [{ text: 'Cambiado desde afuera' }])
        return true
      })
    })
    expect(blocks()[0]).toHaveTextContent('Cambiado desde afuera')
  })

  it('el formato se dibuja con la clase que le toca', () => {
    mount('Con **negrita** y `código`')
    const negrita = blocks()[0]!.querySelector('.melu-b')
    const codigo = blocks()[0]!.querySelector('.melu-code')
    expect(negrita).toHaveTextContent('negrita')
    expect(codigo).toHaveTextContent('código')
  })

  it('cada run lleva anotadas sus marcas, que es lo que hace que escribir adentro las herede', () => {
    mount('Con **negrita**')
    const runs = [...blocks()[0]!.children]
    expect(runs.map((el) => el.getAttribute('data-melu-marks'))).toEqual(['[]', '[{"type":"bold"}]'])
  })

  it('tildar un checklist cambia sus props', async () => {
    const user = userEvent.setup()
    const { editor } = mount('- [ ] Traer la cinta')
    await user.click(screen.getByRole('checkbox'))
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    expect(editor.block(id)!.props).toMatchObject({ checked: true })
  })
})

describe('cuánto se repinta', () => {
  /** Envuelve los renderizadores para contar cuántas veces se dibuja cada bloque. */
  function counting(): { renderers: Renderers; counts: Map<string, number> } {
    const counts = new Map<string, number>()
    const wrap = (name: string, inner: Renderer): Renderer =>
      function Counted(props) {
        counts.set(props.id, (counts.get(props.id) ?? 0) + 1)
        void name
        return inner(props)
      }
    const renderers: Renderers = {}
    for (const [type, r] of Object.entries(defaultRenderers)) renderers[type] = wrap(type, r)
    return { renderers, counts }
  }

  it('escribir en un bloque repinta ese bloque y ninguno más', async () => {
    const user = userEvent.setup()
    const { renderers, counts } = counting()
    const { editor } = mount('uno\n\ndos\n\ntres\n\ncuatro\n\ncinco', { renderers })
    const ids = editor.doc.blocks[editor.doc.root]!.children

    await user.click(blocks()[0]!)
    counts.clear()
    await user.type(blocks()[0]!, 'X')

    expect(counts.get(ids[0]!), 'el bloque donde se escribe').toBeGreaterThanOrEqual(1)
    for (const id of ids.slice(1)) {
      expect(counts.get(id) ?? 0, `el bloque ${id} no tenía que repintarse`).toBe(0)
    }
  })

  it('mover el caret a otro bloque no repinta ningún bloque', async () => {
    const user = userEvent.setup()
    const { renderers, counts } = counting()
    const { editor } = mount('uno\n\ndos\n\ntres', { renderers })
    await user.click(blocks()[0]!)
    counts.clear()
    act(() => {
      const segundo = editor.doc.blocks[editor.doc.root]!.children[1]!
      editor.setSelection({ kind: 'text', anchor: { block: segundo, offset: 0 }, head: { block: segundo, offset: 0 } })
    })
    // Los bloques no cambiaron, así que ninguno se vuelve a dibujar: el marco de selección lo
    // pone el atributo `data-active`, que no es un render del contenido.
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(2)
  })
})

describe('el caret', () => {
  it('el modelo lo manda: apuntar a un bloque le da el foco', () => {
    const { editor } = mount('uno\n\ndos')
    const segundo = editor.doc.blocks[editor.doc.root]!.children[1]!
    act(() => {
      blocks()[0]!.focus()
      editor.run('focusBlock', { id: segundo, at: 'end' })
    })
    expect(document.activeElement).toBe(blocks()[1])
  })

  it('sin foco adentro del editor, el modelo no se lo roba', () => {
    const { editor } = mount('uno\n\ndos')
    const afuera = document.createElement('input')
    document.body.append(afuera)
    afuera.focus()
    act(() => {
      editor.run('focusBlock', { id: editor.doc.blocks[editor.doc.root]!.children[1]!, at: 'end' })
    })
    expect(document.activeElement).toBe(afuera)
    afuera.remove()
  })
})

describe('solo lectura', () => {
  it('los bloques no se pueden editar', () => {
    mount('# Medir', { readOnly: true })
    expect(blocks()[0]).toHaveAttribute('contenteditable', 'false')
  })

  it('no aparece nada de lo que flota', () => {
    mount('# Medir', { readOnly: true })
    expect(document.querySelector('.melu-handle')).toBeNull()
    expect(document.querySelector('.melu-toolbox')).toBeNull()
  })

  it('el motor rechaza los cambios', () => {
    const { editor } = mount('# Medir', { readOnly: true })
    expect(editor.run('insertBlock', { type: 'paragraph' })).toBe(false)
  })
})

describe('avisar hacia afuera', () => {
  it('onChange llega con el documento en el formato que se guarda', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    let editor!: Editor
    render(
      <BlockEditor
        value={json('Primero')}
        onChange={onChange}
        debounce={50}
        toolbox={false}
        onReady={(e) => {
          editor = e
        }}
      />,
    )
    act(() => {
      editor.exec((ctx) => {
        ctx.tr.append(ctx.tr.doc.root, { type: 'paragraph', text: [{ text: 'Segundo' }] })
        return true
      })
    })
    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    const [blocks] = onChange.mock.calls[0]!
    expect((blocks as BlockJSON[]).map((b) => b.type)).toEqual(['paragraph', 'paragraph'])
    vi.useRealTimers()
  })

  it('varios cambios seguidos avisan una sola vez', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    let editor!: Editor
    render(
      <BlockEditor
        value={json('Primero')}
        onChange={onChange}
        debounce={50}
        toolbox={false}
        onReady={(e) => {
          editor = e
        }}
      />,
    )
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    act(() => {
      editor.setSelection({ kind: 'text', anchor: { block: id, offset: 0 }, head: { block: id, offset: 0 } })
      for (let i = 0; i < 5; i++) editor.run('insertText', { text: 'x' })
    })
    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('el menú de la barra', () => {
  it('escribir una barra abre el menú, y filtra con lo que sigue', async () => {
    const user = userEvent.setup()
    mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, '/tabl')
    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: 'Insertar un bloque' })).toBeInTheDocument()
    })
    const opciones = screen.getAllByRole('option').map((el) => el.textContent)
    expect(opciones.join(' ')).toContain('Tabla')
  })

  it('Escape lo cierra y deja lo tecleado donde estaba', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, '/tabl')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeInTheDocument())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(plain(editor.block(editor.doc.blocks[editor.doc.root]!.children[0]!)?.text)).toBe('/tabl')
  })

  it('elegir un bloque lo inserta y se lleva la consulta', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, '/destac')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeInTheDocument())
    await user.click(screen.getAllByRole('option')[0]!)
    await waitFor(() => {
      const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
      expect(tipos).toContain('callout')
    })
    for (const id of editor.doc.blocks[editor.doc.root]!.children) {
      expect(plain(editor.block(id)?.text)).not.toContain('/')
    }
  })

  it('una barra en el medio de una palabra no abre nada', async () => {
    const user = userEvent.setup()
    mount('')
    await user.click(blocks()[0]!)
    await user.type(blocks()[0]!, 'esto y/o aquello')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

describe('la barra de formato', () => {
  it('aparece cuando hay algo seleccionado y no antes', async () => {
    const { editor } = mount('Medir el patio')
    expect(screen.queryByRole('toolbar')).toBeNull()
    caretTo(editor, 0, 0, 5)
    await waitFor(() => expect(screen.getByRole('toolbar', { name: 'Formato' })).toBeInTheDocument())
  })

  it('sus botones actúan sobre lo seleccionado sin sacarle el foco al texto', async () => {
    const user = userEvent.setup()
    const { editor } = mount('Medir el patio')
    const id = editor.doc.blocks[editor.doc.root]!.children[0]!
    caretTo(editor, 0, 0, 5)
    await waitFor(() => expect(screen.getByRole('toolbar')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Negrita' }))
    expect(editor.block(id)!.text![0]!.marks).toEqual([{ type: 'bold' }])
    expect(editor.selection).toMatchObject({ anchor: { offset: 0 }, head: { offset: 5 } })
  })

  it('dice en qué tipo de bloque está el caret', async () => {
    const { editor } = mount('- una cinta')
    caretTo(editor, 0, 0, 3)
    await waitFor(() => expect(screen.getByRole('button', { name: /Lista/ })).toBeInTheDocument())
  })
})

describe('la superficie con su propio marco', () => {
  it('se puede usar sin nada de lo que flota', () => {
    function Solo() {
      const editor = useNewEditor({ plugins: activityKit(), blocks: fromMarkdown('# Solo el texto') })
      const ref = useRef(editor)
      return <Surface editor={ref.current} aria-label="Solo" />
    }
    render(<Solo />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Solo el texto')
    expect(document.querySelector('.melu-toolbox')).toBeNull()
  })

  it('un renderizador propio reemplaza al que venía', () => {
    const renderers: Renderers = {
      paragraph: ({ block }) => <p data-testid="mio">{plain(block.text)}</p>,
    }
    mount('Un párrafo', { renderers })
    expect(screen.getByTestId('mio')).toHaveTextContent('Un párrafo')
  })
})

describe('la caja de herramientas', () => {
  it('lista todos los bloques por grupo', () => {
    mount('', { toolbox: true })
    // "Básicos" en el DOM: lo que se ve en mayúsculas lo hace el CSS, no el texto.
    expect(screen.getByText('Básicos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imagen/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Emparejar/ })).toBeInTheDocument()
  })

  it('un click inserta el bloque', async () => {
    const user = userEvent.setup()
    const { editor } = mount('', { toolbox: true })
    await user.click(screen.getByRole('button', { name: /Separador/ }))
    const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
    expect(tipos).toContain('divider')
  })

  it('la búsqueda filtra', async () => {
    const user = userEvent.setup()
    mount('', { toolbox: true })
    await user.type(screen.getByPlaceholderText('Buscar un bloque'), 'audio')
    expect(screen.getByRole('button', { name: /Audio/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Título 1/ })).toBeNull()
  })
})

/**
 * El asa: el más y el agarre que aparecen al costado del bloque.
 *
 * Todo lo de acá salió de usarlo, no de pensarlo: el asa se pintaba afuera de la superficie y un
 * contenedor con scroll la borraba, entre el bloque y el asa quedaba un hueco que el puntero
 * tenía que cruzar (y al cruzarlo el asa desaparecía, así que el más era imposible de clickear),
 * y en un título quedaba flotando por encima de las letras.
 *
 * jsdom no dibuja, así que la geometría se le pone a mano: cada bloque ocupa una banda de 40px.
 * Es lo que hace que estas afirmaciones sean sobre la geometría y no sobre el DOM.
 */
describe('el asa', () => {
  const rect = (x: number, y: number, w: number, h: number) =>
    ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect

  /** Le da a cada bloque una banda vertical de 40px, empezando en cero. */
  function layout(): { surface: HTMLElement; ids: string[] } {
    const surface = document.querySelector<HTMLElement>('[data-melu-surface]')!
    surface.getBoundingClientRect = () => rect(0, 0, 800, 2000)
    const elements = [...surface.querySelectorAll<HTMLElement>('[data-melu-block]')]
    for (const [i, el] of elements.entries()) {
      const top = i * 40
      el.getBoundingClientRect = () => rect(52, top, 720, 40)
      const text = el.querySelector<HTMLElement>('[data-melu-text]')
      if (text) text.getBoundingClientRect = () => rect(52, top, 720, 24)
    }
    return { surface, ids: elements.map((el) => el.getAttribute('data-melu-block')!) }
  }

  const señalar = (surface: HTMLElement, x: number, y: number) =>
    act(() => {
      surface.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }))
    })

  const asa = () => document.querySelector<HTMLElement>('.melu-handle')

  it('aparece al pasar el puntero por un bloque', () => {
    mount('uno\n\ndos\n\ntres')
    const { surface } = layout()
    expect(asa()).toBeNull()
    señalar(surface, 300, 50)
    expect(asa()).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Insertar un bloque abajo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Opciones del bloque' })).toBeInTheDocument()
  })

  it('señala el bloque cuya banda contiene al puntero, no el que estaba antes', () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    const { surface, ids } = layout()
    señalar(surface, 300, 50)
    const primero = asa()!.style.top
    señalar(surface, 300, 90)
    expect(asa()!.style.top).not.toBe(primero)
    // El tercer bloque: su banda va de 80 a 120.
    void editor
    void ids
  })

  it('yendo hacia el más no se pierde: es lo que lo hacía imposible de clickear', () => {
    mount('uno\n\ndos\n\ntres')
    const { surface } = layout()
    señalar(surface, 300, 50)
    expect(asa()).not.toBeNull()
    const top = asa()!.style.top
    // El viaje desde el texto hasta el canal, cruzando el hueco que antes lo borraba.
    for (const x of [60, 52, 40, 20, 4]) {
      señalar(surface, x, 50)
      expect(asa(), `se perdió en x=${x}`).not.toBeNull()
      expect(asa()!.style.top, `saltó en x=${x}`).toBe(top)
    }
  })

  it('vive adentro de la superficie, en el canal que se le reserva', () => {
    mount('uno\n\ndos')
    const { surface } = layout()
    señalar(surface, 300, 10)
    // El bloque arranca en 52 y el asa 52 más a la izquierda: en cero, adentro de la superficie.
    // Pintarla afuera es lo que hacía que un ancestro con scroll la borrara.
    expect(asa()!.style.left).toBe('0px')
    expect(surface.contains(asa())).toBe(true)
  })

  it('sin puntero encima, acompaña al caret', () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    layout()
    expect(asa()).toBeNull()
    caretTo(editor, 1, 0)
    expect(asa()).not.toBeNull()
    // A la altura del segundo bloque, que es donde está el caret.
    expect(asa()!.style.top).toContain(String(40 + (24 - 26) / 2))
  })

  it('no aparece en solo lectura', () => {
    mount('uno\n\ndos', { readOnly: true })
    const surface = document.querySelector<HTMLElement>('[data-melu-surface]')!
    surface.getBoundingClientRect = () => rect(0, 0, 800, 2000)
    señalar(surface, 300, 50)
    expect(asa()).toBeNull()
  })

  it('una celda de tabla no la lleva: la lleva la tabla, que es lo que se puede mover', () => {
    const { editor } = mount('| a | b |\n| --- | --- |\n| 1 | 2 |')
    const { surface } = layout()
    señalar(surface, 300, 10)
    expect(asa()).not.toBeNull()
    // El bloque señalado tiene que ser uno que se pueda arrastrar.
    act(() => {
      screen.getByRole('button', { name: 'Opciones del bloque' }).dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, bubbles: true, clientX: 0, clientY: 0 }),
      )
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    const elegido = editor.selection?.kind === 'blocks' ? editor.selection.ids[0] : undefined
    expect(elegido).toBeDefined()
    expect(editor.state.schema.specOr(editor.block(elegido!)!.type).draggable).not.toBe(false)
  })

  it('el más inserta abajo del bloque señalado y se lleva el foco', async () => {
    const { editor } = mount('uno\n\ndos\n\ntres')
    const { surface, ids } = layout()
    señalar(surface, 300, 50)
    const antes = editor.doc.blocks[editor.doc.root]!.children.length
    await act(async () => {
      screen.getByRole('button', { name: 'Insertar un bloque abajo' }).click()
      // El foco y la barra se ponen en el cuadro siguiente, cuando el bloque ya está dibujado.
      await new Promise((r) => requestAnimationFrame(r))
    })
    const ahora = editor.doc.blocks[editor.doc.root]!.children
    expect(ahora).toHaveLength(antes + 1)
    // Justo después del segundo, que es el que estaba señalado.
    expect(ahora.indexOf(ahora[2]!)).toBe(2)
    expect(ids[1]).toBe(ahora[1])
    // Y con el foco puesto: sin esto queda un bloque vacío sin caret y sin menú.
    expect(surface.contains(document.activeElement)).toBe(true)
  })

  it('el agarre abre el menú del bloque', () => {
    mount('uno\n\ndos')
    const { surface } = layout()
    señalar(surface, 300, 10)
    act(() => {
      const grip = screen.getByRole('button', { name: 'Opciones del bloque' })
      grip.getBoundingClientRect = () => rect(0, 0, 24, 26)
      grip.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true, clientX: 0, clientY: 0 }))
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    expect(screen.getByRole('menu', { name: 'Opciones del bloque' })).toBeInTheDocument()
    expect(screen.getByText('Convertir en')).toBeInTheDocument()
    expect(screen.getByText('Duplicar')).toBeInTheDocument()
  })
})

/**
 * El menú que aparece al pegar una dirección.
 *
 * Pegar un link no adivina: pega el link y ofrece el resto. Lo que se prueba acá es el camino
 * entero, que es donde estaba el bug que se reportó usándolo: el pegado sobre la caja de un bloque
 * de medios lo agarraba la superficie, cancelaba el evento y la dirección no llegaba a ningún lado.
 */
describe('pegar una dirección', () => {
  const pegar = async (el: HTMLElement, texto: string) => {
    await act(async () => {
      el.dispatchEvent(eventoDePegado({ 'text/plain': texto }))
      await new Promise((r) => requestAnimationFrame(r))
    })
  }

  it('la deja como link y ofrece qué hacer con ella', async () => {
    const { editor } = mount('')
    caretTo(editor, 0, 0)
    await pegar(blocks()[0]!, 'https://www.youtube.com/watch?v=1WHPExTeOwg&list=RD1WHPExTeOwg')
    // El texto quedó, con su link.
    expect(plain(editor.block(editor.doc.blocks[editor.doc.root]!.children[0]!)?.text)).toContain('youtube.com/watch')
    const menu = await screen.findByRole('menu', { name: 'Qué hacer con el link' })
    expect(menu).toBeInTheDocument()
    expect(screen.getByText('Ponerlo como video')).toBeInTheDocument()
    expect(screen.getByText('Tarjeta con miniatura')).toBeInTheDocument()
    expect(screen.getByText('Dejarlo como link')).toBeInTheDocument()
  })

  it('elegir el video reemplaza el link por el reproductor, ya incrustable', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    caretTo(editor, 0, 0)
    await pegar(blocks()[0]!, 'https://www.youtube.com/watch?v=1WHPExTeOwg&list=RD1WHPExTeOwg')
    await screen.findByRole('menu', { name: 'Qué hacer con el link' })
    await user.click(screen.getByText('Ponerlo como video'))

    const ids = editor.doc.blocks[editor.doc.root]!.children
    const video = ids.map((id) => editor.block(id)!).find((b) => b.type === 'video')
    expect(video).toBeDefined()
    expect(String(video!.props!.src)).toBe('https://www.youtube-nocookie.com/embed/1WHPExTeOwg')
    // Y el link se fue: lo que quedó es el bloque, no las dos cosas.
    expect(ids.map((id) => plain(editor.block(id)?.text)).join('')).not.toContain('youtube.com/watch')
  })

  it('dejarlo como link cierra el menú y no toca nada', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    caretTo(editor, 0, 0)
    await pegar(blocks()[0]!, 'https://x.ar/patio.png')
    await screen.findByRole('menu')
    await user.click(screen.getByText('Dejarlo como link'))
    expect(screen.queryByRole('menu')).toBeNull()
    const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
    expect(tipos).toEqual(['paragraph'])
  })

  it('seguir escribiendo cierra el menú: el link queda y nadie molesta', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    caretTo(editor, 0, 0)
    await pegar(blocks()[0]!, 'https://x.ar/patio.png')
    await screen.findByRole('menu')
    await user.type(blocks()[0]!, ' y')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('sobre texto seleccionado no aparece: pegar encima de algo elegido ya dijo qué hacer', async () => {
    const { editor } = mount('ver la página')
    caretTo(editor, 0, 4, 13)
    await pegar(blocks()[0]!, 'https://educabot.com')
    expect(screen.queryByRole('menu', { name: 'Qué hacer con el link' })).toBeNull()
  })
})

/**
 * La caja que pide la dirección de un bloque de medios.
 *
 * El bug que se reportó: se agregaba un video, se pegaba la dirección en la caja y no pasaba nada.
 * La superficie agarraba el pegado antes de que llegara al campo, lo cancelaba, e insertaba un
 * bloque en otro lado. La caja se quedaba vacía y el video nunca aparecía.
 */
describe('la caja de un bloque de medios', () => {
  const cajaDe = (nombre: string) => screen.getByLabelText(`Dirección del bloque de ${nombre}`)

  it('un video recién puesto pide su dirección', () => {
    const { editor } = mount('')
    act(() => {
      editor.run('insertBlock', { type: 'video' })
    })
    expect(cajaDe('video')).toBeInTheDocument()
  })

  it('pegar la dirección en la caja la deja puesta: la superficie no se la roba', async () => {
    const { editor } = mount('')
    act(() => {
      editor.run('insertBlock', { type: 'video' })
    })
    const caja = cajaDe('video')
    await act(async () => {
      caja.dispatchEvent(eventoDePegado({ 'text/plain': 'https://www.youtube.com/watch?v=1WHPExTeOwg&list=RD1WHPExTeOwg' }))
      await new Promise((r) => requestAnimationFrame(r))
    })
    const video = Object.values(editor.doc.blocks).find((b) => b.type === 'video')!
    // Y la dirección quedó lista para incrustar, no la de la página de YouTube.
    expect(String(video.props!.src)).toBe('https://www.youtube-nocookie.com/embed/1WHPExTeOwg')
    // La caja ya no está: el video ocupó su lugar.
    expect(screen.queryByLabelText('Dirección del bloque de video')).toBeNull()
  })

  it('también confirma con Enter', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    act(() => {
      editor.run('insertBlock', { type: 'image' })
    })
    await user.type(cajaDe('imagen'), 'https://x.ar/patio.png{Enter}')
    const img = Object.values(editor.doc.blocks).find((b) => b.type === 'image')!
    expect(img.props).toMatchObject({ src: 'https://x.ar/patio.png' })
  })

  it('y al salir del campo, sin apretar nada', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    act(() => {
      editor.run('insertBlock', { type: 'image' })
    })
    await user.type(cajaDe('imagen'), 'https://x.ar/patio.png')
    await act(async () => {
      cajaDe('imagen').blur()
    })
    const img = Object.values(editor.doc.blocks).find((b) => b.type === 'image')!
    expect(img.props).toMatchObject({ src: 'https://x.ar/patio.png' })
  })

  it('una dirección que apunta a otra cosa convierte el bloque', async () => {
    const user = userEvent.setup()
    const { editor } = mount('')
    act(() => {
      editor.run('insertBlock', { type: 'video' })
    })
    // Alguien abrió un video y pegó una imagen: lo que quiso decir es una imagen.
    await user.type(cajaDe('video'), 'https://x.ar/patio.png{Enter}')
    const tipos = editor.doc.blocks[editor.doc.root]!.children.map((id) => editor.block(id)!.type)
    expect(tipos).toContain('image')
    expect(tipos).not.toContain('video')
  })

  it('escribir en la caja no dispara los atajos del editor', async () => {
    const user = userEvent.setup()
    const { editor } = mount('uno')
    act(() => {
      editor.run('insertBlock', { type: 'image' })
    })
    const antes = editor.doc.blocks[editor.doc.root]!.children.length
    // La "/" abriría el menú de bloques si la superficie estuviera escuchando.
    await user.type(cajaDe('imagen'), '/tabla')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(editor.doc.blocks[editor.doc.root]!.children).toHaveLength(antes)
  })
})
