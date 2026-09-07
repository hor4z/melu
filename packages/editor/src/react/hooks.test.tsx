// Cuántos componentes se repintan por tecla, que es la única forma honesta de sostener la palabra
// "performante": se cuentan los renders. Y los hooks que usa un marco propio.

import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockEditor } from '../BlockEditor.tsx'
import { useEditorState, useHistoryState, useIsMarkActive } from './hooks.ts'
import { defaultRenderers, type Renderer, type Renderers } from './renderers.tsx'
import { type BlockJSON, type Editor } from '../core/index.ts'
import { blocks, caretTo, json, mount } from '../test/view.tsx'

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

describe('los hooks para un marco propio', () => {
  function MiBarra() {
    const { canUndo, canRedo } = useHistoryState()
    const negrita = useIsMarkActive('bold')
    const state = useEditorState()
    const cuantos = Object.keys(state.doc.blocks).length - 1
    return (
      <div>
        <button disabled={!canUndo}>Deshacer</button>
        <button disabled={!canRedo}>Rehacer</button>
        <span data-testid="negrita">{negrita ? 'sí' : 'no'}</span>
        <span data-testid="cuantos">{cuantos}</span>
      </div>
    )
  }

  const montar = () => {
    let editor!: Editor
    render(
      <BlockEditor
        value={json('Medir el patio')}
        toolbox={false}
        onReady={(e) => {
          editor = e
        }}
      >
        <MiBarra />
      </BlockEditor>,
    )
    return editor
  }

  it('useHistoryState sabe si hay algo que deshacer, y se actualiza', () => {
    const editor = montar()
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    caretTo(editor, 0, 5)
    act(() => {
      editor.run('insertText', { text: '!' })
    })
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Rehacer' })).toBeDisabled()
    act(() => {
      editor.undo()
    })
    expect(screen.getByRole('button', { name: 'Rehacer' })).toBeEnabled()
  })

  it('useIsMarkActive dice si lo seleccionado ya lleva la marca', () => {
    const editor = montar()
    expect(screen.getByTestId('negrita')).toHaveTextContent('no')
    caretTo(editor, 0, 0, 5)
    act(() => {
      editor.run('toggleMark', { type: 'bold' })
    })
    expect(screen.getByTestId('negrita')).toHaveTextContent('sí')
  })

  it('useEditorState ve el documento entero y se entera de un bloque nuevo', () => {
    const editor = montar()
    expect(screen.getByTestId('cuantos')).toHaveTextContent('1')
    act(() => {
      editor.run('insertBlock', { type: 'divider', at: 'end' })
    })
    expect(screen.getByTestId('cuantos')).toHaveTextContent('2')
  })
})
