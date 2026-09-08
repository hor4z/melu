// El editor armado: la puerta por la que entra una plataforma. Lo que se prueba acá no es el motor
// sino el cableado, que es donde estaba el bug que hacía entrar dos videos por uno.

import { describe, expect, it } from 'vitest'
import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockEditor } from './BlockEditor.tsx'
import { json } from './test/view.tsx'
import { sketch } from './test/vocabulary.ts'
import type { Editor } from './core/index.ts'

describe('avisar que el editor está listo', () => {
  it('avisa una sola vez, y no una por render', () => {
    let veces = 0
    const { rerender } = render(<BlockEditor value={json('uno')} onReady={() => veces++} />)
    rerender(<BlockEditor value={json('uno')} onReady={() => veces++} />)
    rerender(<BlockEditor value={json('uno')} onReady={() => veces++} />)
    expect(veces).toBe(1)
  })

  it('bajo StrictMode también avisa una sola vez: si no, un host que siembra contenido lo siembra dos veces', () => {
    let veces = 0
    render(
      <StrictMode>
        <BlockEditor value={json('uno')} onReady={() => veces++} />
      </StrictMode>,
    )
    expect(veces).toBe(1)
  })

  it('un host que inserta desde el aviso inserta un bloque, no dos', () => {
    let editor!: Editor
    render(
      <StrictMode>
        <BlockEditor
          value={json('uno')}
          onReady={(e) => {
            editor = e
            e.run('insertBlock', { type: 'video', props: { src: 'https://ejemplo/video.mp4' } })
          }}
        />
      </StrictMode>,
    )
    expect(sketch(editor).filter((l) => l.startsWith('video'))).toHaveLength(1)
  })

  it('el aviso llega con el motor ya armado, no con uno a medio hacer', () => {
    let tipos: readonly string[] = []
    render(<BlockEditor value={json('uno')} onReady={(e) => (tipos = e.state.schema.types)} />)
    expect(tipos.length).toBeGreaterThan(10)
  })
})

describe('el contenido inicial', () => {
  it('el value se lee al montar y no vuelve a pisar lo que alguien escribió', async () => {
    const user = userEvent.setup()
    let editor!: Editor
    const { rerender } = render(<BlockEditor value={json('uno')} onReady={(e) => (editor = e)} />)
    await user.click(document.querySelector('[data-melu-text]')!)
    await user.keyboard(' y algo más')
    // La plataforma vuelve a pasar el value que tenía guardado, como haría al recibir el guardado.
    rerender(<BlockEditor value={json('uno')} onReady={(e) => (editor = e)} />)
    expect(sketch(editor)[0]).toContain('y algo más')
  })

  it('sin value arranca con un bloque donde escribir, y no con la nada', () => {
    let editor!: Editor
    render(<BlockEditor onReady={(e) => (editor = e)} />)
    expect(sketch(editor)).toHaveLength(1)
  })
})

describe('lo que flota se puede sacar', () => {
  it('con toolbox en false no se monta la caja, y el resto sigue estando', () => {
    render(<BlockEditor value={json('uno')} toolbox={false} />)
    expect(document.querySelector('.melu-toolbox')).toBeNull()
    expect(document.querySelector('[data-melu-surface]')).not.toBeNull()
  })

  it('en solo lectura no se monta nada de lo que flota', () => {
    render(<BlockEditor value={json('uno')} readOnly />)
    expect(document.querySelector('.melu-toolbox')).toBeNull()
    expect(document.querySelector('.melu-handle')).toBeNull()
  })
})
