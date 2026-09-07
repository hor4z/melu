// La superficie: solo lectura, y usarla con su propio marco alrededor.

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { Surface } from './Surface.tsx'
import { useNewEditor } from './hooks.ts'
import { type Renderers } from './renderers.tsx'
import { activityKit } from '../plugins/index.ts'
import { fromMarkdown, plain } from '../core/index.ts'
import { blocks, mount } from '../test/view.tsx'

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
