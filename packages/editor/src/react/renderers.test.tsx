// Lo que se dibuja de cada tipo de bloque, y la caja que pide una dirección.

import { describe, expect, it } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { eventoDePegado } from '../test/setup.ts'
import { blocks, mount } from '../test/view.tsx'

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

  it('la numeración de una lista la cuenta el CSS, no el JS', () => {
    mount('1. uno\n2. dos\n3. tres')
    // Sin número en el DOM: contarlo en JS dejaba el número viejo cuando el ítem de arriba
    // cambiaba de tipo, porque este ítem no se volvía a dibujar.
    const marcas = [...document.querySelectorAll('.melu-ordinal')]
    expect(marcas).toHaveLength(3)
    expect(marcas.every((m) => m.textContent === '')).toBe(true)
  })

  it('un ítem que arranca en otro número lleva el reinicio en su envoltorio', () => {
    mount('5. arranca en cinco\n6. sigue')
    const bloques = [...document.querySelectorAll<HTMLElement>('[data-melu-block][data-type="numbered_list"]')]
    // En el envoltorio y no adentro: el alcance de un contador CSS llega a los hermanos que
    // siguen, así que puesto adentro el resto de la tira volvía a empezar en uno.
    expect(bloques[0]!.style.counterReset).toBe('melu-ol 4')
    expect(bloques[1]!.style.counterReset).toBe('')
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

describe('una dirección que no es de fiar', () => {
  // El documento puede llegar de una API, y ahí nadie pasó por el pegado ni por la caja de link.
  it('un marcador que apunta a código se dibuja, pero no lleva a ningún lado', () => {
    mount([{ type: 'bookmark', props: { url: 'javascript:alert(1)', title: 'Mirá' } }])
    const link = screen.getByText('Mirá').closest('a')!
    expect(link).not.toHaveAttribute('href')
  })

  it('un archivo también', () => {
    mount([{ type: 'file', props: { src: 'javascript:alert(1)', name: 'planilla.xls' } }])
    expect(screen.getByText('planilla.xls').closest('a')).not.toHaveAttribute('href')
  })

  it('y el link de siempre sigue llevando adonde dice', () => {
    mount([{ type: 'bookmark', props: { url: 'https://educabot.com', title: 'Educabot' } }])
    expect(screen.getByText('Educabot').closest('a')).toHaveAttribute('href', 'https://educabot.com')
  })
})

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

/**
 * Los hooks que un marco propio usa.
 *
 * Son la forma documentada de armar una barra propia: van adentro de la superficie, como hijos,
 * porque necesitan el editor del contexto. Estaban exportados y sin correr nunca, que es la mitad
 * de estar escritos.
 */
