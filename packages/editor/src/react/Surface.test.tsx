// La superficie: solo lectura, y usarla con su propio marco alrededor.

import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { Surface } from './Surface.tsx'
import { useNewEditor } from './hooks.ts'
import { type Renderers } from './renderers.tsx'
import { activityKit } from '../plugins/index.ts'
import { fromMarkdown, plain, type Editor } from '../core/index.ts'
import { blocks, caretTo, mount } from '../test/view.tsx'

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

describe('la selección cruza bloques', () => {
  const hijos = (editor: Editor) => editor.doc.blocks[editor.doc.root]!.children
  const textos = (editor: Editor) => hijos(editor).map((id) => plain(editor.block(id)?.text))

  /**
   * Deja la selección del navegador con cada punta en un bloque distinto: es lo que queda después
   * de arrastrar de un párrafo a otro, o de apretar Shift+abajo hasta salir del bloque. Puede
   * porque la región editable es la superficie entera.
   */
  const cruzar = (desde: number, offDesde: number, hasta: number, offHasta: number) => {
    const els = blocks()
    const nodo = (el: HTMLElement) => el.firstChild?.firstChild ?? el
    const rango = document.createRange()
    rango.setStart(nodo(els[desde]!), offDesde)
    rango.setEnd(nodo(els[hasta]!), offHasta)
    const sel = document.getSelection()!
    sel.removeAllRanges()
    sel.addRange(rango)
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
  }

  it('la superficie es la región editable, y no solo cada bloque', () => {
    mount('- uno\n- dos')
    expect(document.querySelector('[data-melu-surface]')).toHaveAttribute('contenteditable', 'true')
  })

  it('un rango con cada punta en un bloque distinto llega al modelo tal cual', () => {
    const { editor } = mount('- uno\n- dos\n- tres')
    cruzar(0, 1, 2, 2)
    const ids = hijos(editor)
    expect(editor.selection).toMatchObject({
      kind: 'text',
      anchor: { block: ids[0], offset: 1 },
      head: { block: ids[2], offset: 2 },
    })
  })

  it('en solo lectura la superficie no es editable', () => {
    mount('- uno', { readOnly: true })
    expect(document.querySelector('[data-melu-surface]')).not.toHaveAttribute('contenteditable', 'true')
  })

  it('borrar un rango que cruza lo hace el motor, no el navegador', () => {
    const { editor } = mount('- uno\n- dos\n- tres')
    cruzar(0, 1, 2, 2)
    const evento = new Event('beforeinput', { bubbles: true, cancelable: true }) as InputEvent
    Object.defineProperty(evento, 'inputType', { value: 'deleteContentBackward' })
    act(() => {
      blocks()[0]!.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    // La cabeza del primero pegada con la cola del último, y el del medio ya no está.
    expect(textos(editor)).toEqual(['ues'])
  })

  it('escribir sobre un rango que cruza lo reemplaza', () => {
    const { editor } = mount('- uno\n- dos')
    cruzar(0, 1, 1, 2)
    const evento = new Event('beforeinput', { bubbles: true, cancelable: true }) as InputEvent
    Object.defineProperty(evento, 'inputType', { value: 'insertText' })
    Object.defineProperty(evento, 'data', { value: 'X' })
    act(() => {
      blocks()[0]!.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(textos(editor)).toEqual(['uXs'])
  })

  it('adentro de un solo bloque el navegador sigue mandando: no se cancela nada', () => {
    const { editor } = mount('- uno\n- dos')
    caretTo(editor, 0, 1)
    const evento = new Event('beforeinput', { bubbles: true, cancelable: true }) as InputEvent
    Object.defineProperty(evento, 'inputType', { value: 'insertText' })
    Object.defineProperty(evento, 'data', { value: 'X' })
    act(() => {
      blocks()[0]!.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(false)
  })

  it('arrastrar texto y soltarlo en otro bloque no se hace: rompía el bloque donde caía', () => {
    const { editor } = mount('- uno\n- dos')
    caretTo(editor, 0, 1)
    const evento = new Event('beforeinput', { bubbles: true, cancelable: true }) as InputEvent
    Object.defineProperty(evento, 'inputType', { value: 'insertFromDrop' })
    act(() => {
      blocks()[1]!.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(textos(editor)).toEqual(['uno', 'dos'])
  })

  it('un pegado que ningún handler entendió no entra crudo al DOM', () => {
    const { editor } = mount('- uno\n- dos')
    caretTo(editor, 0, 1)
    // Una imagen del portapapeles: no hay ni html, ni texto, ni lo nuestro. `onPaste` no lo
    // atiende, y sin cancelar el `beforeinput` el navegador lo inyecta adentro del bloque.
    const evento = new Event('beforeinput', { bubbles: true, cancelable: true }) as InputEvent
    Object.defineProperty(evento, 'inputType', { value: 'insertFromPaste' })
    act(() => {
      blocks()[0]!.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(textos(editor)).toEqual(['uno', 'dos'])
  })

  it('lo que se escribe en un control propio no dispara las reglas de tipeo del bloque de al lado', () => {
    const { editor } = mount('uno\n\ndos')
    const primero = hijos(editor)[0]!
    // Un párrafo cuyo texto es literalmente "# ": nadie lo convirtió porque el texto entró por el
    // modelo y no por el teclado. Queda armado como una trampa para las reglas de tipeo.
    act(() => {
      editor.exec((ctx) => {
        ctx.tr.setText(primero, [{ text: '# ' }])
        return true
      })
    })
    caretTo(editor, 0, 2)
    const control = document.createElement('input')
    control.setAttribute('data-melu-skip', 'true')
    blocks()[1]!.append(control)
    act(() => {
      control.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(editor.block(primero)?.type).toBe('paragraph')
  })

  it('elegir un bloque entero no lo deshace el caret viejo que el navegador tenía puesto', () => {
    const { editor } = mount('- uno\n- dos')
    caretTo(editor, 0, 1)
    act(() => {
      editor.run('selectBlock', { id: hijos(editor)[1]! })
    })
    // El repintado hace que el navegador avise del caret que le quedó, en el otro bloque. Ese
    // aviso llega siempre, y no lo pidió nadie: escucharlo hacía que elegir un bloque durara lo
    // que tarda un render.
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    expect(editor.selection).toMatchObject({ kind: 'blocks', ids: [hijos(editor)[1]] })
  })

  it('con un bloque elegido el foco se queda en la superficie, que es donde llegan las teclas', () => {
    const { editor } = mount('- uno\n- dos')
    caretTo(editor, 0, 1)
    act(() => {
      editor.run('selectBlock', { id: hijos(editor)[1]! })
    })
    const superficie = document.querySelector('[data-melu-surface]')
    expect(superficie?.contains(document.activeElement)).toBe(true)
  })

  it('un click sí la deshace: lo que pide alguien apretando el mouse manda', () => {
    const { editor } = mount('- uno\n- dos')
    act(() => {
      editor.run('selectBlock', { id: hijos(editor)[1]! })
    })
    // Un click de verdad: primero el puntero, después el aviso del navegador.
    fireEvent.pointerDown(blocks()[0]!, { buttons: 1 })
    caretTo(editor, 0, 2)
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    expect(editor.selection).toMatchObject({ kind: 'text' })
  })

  it('apretar un asa o un menú no cuenta como pedir el caret: la selección de bloques aguanta', () => {
    const { editor } = mount('- uno\n- dos')
    act(() => {
      editor.run('selectBlock', { id: hijos(editor)[1]! })
    })
    const asa = document.createElement('div')
    asa.setAttribute('data-melu-skip', 'true')
    document.querySelector('[data-melu-surface]')!.append(asa)
    fireEvent.pointerDown(asa, { buttons: 1 })
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    expect(editor.selection).toMatchObject({ kind: 'blocks' })
  })

  it('el navegador no puede arrancar su propio arrastre adentro del editor', () => {
    mount('- uno\n- dos')
    const evento = new Event('dragstart', { bubbles: true, cancelable: true })
    document.querySelector('[data-melu-surface]')!.dispatchEvent(evento)
    // Soltar lo cancelamos igual, así que dejarlo empezar sólo sirve para que se coma los eventos
    // de puntero del arrastre propio y lo deje colgado.
    expect(evento.defaultPrevented).toBe(true)
  })

  it('lo que no es texto se declara no arrastrable: adentro de un editable Chrome lo arrastra solo', () => {
    mount('- uno\n- dos')
    expect(document.querySelector('.melu-bullet')).toHaveAttribute('draggable', 'false')
  })

  it('sin selección los atajos siguen andando: antes morían todos', () => {
    const { editor } = mount('uno\n\ndos')
    act(() => {
      editor.setSelection(null)
    })
    const superficie = document.querySelector('[data-melu-surface]')!
    act(() => {
      fireEvent.keyDown(superficie, { key: 'a', ctrlKey: true })
    })
    expect(editor.selection).not.toBeNull()
  })

  it('la flecha izquierda sobre un rango lo colapsa, en lugar de saltar al bloque anterior', () => {
    const { editor } = mount('uno\n\ndos')
    caretTo(editor, 1, 0, 2)
    const antes = editor.selection
    act(() => {
      fireEvent.keyDown(blocks()[1]!, { key: 'ArrowLeft' })
    })
    // El motor no la toca: colapsar un rango es del navegador, y saltar de bloque acá era saltarse
    // el principio de lo que estaba elegido.
    expect(editor.selection).toEqual(antes)
  })

  it('Mod+Shift+arriba sube el bloque, con el caret adentro del texto', async () => {
    const user = userEvent.setup()
    const { editor } = mount('- uno\n- dos')
    caretTo(editor, 1, 0)
    await user.keyboard('{Control>}{Shift>}{ArrowUp}{/Shift}{/Control}')
    expect(textos(editor)).toEqual(['dos', 'uno'])
  })
})
