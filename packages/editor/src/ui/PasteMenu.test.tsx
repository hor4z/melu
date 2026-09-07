// El menú que aparece al pegar una dirección, de punta a punta.

import { describe, expect, it } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { plain } from '../core/index.ts'
import { eventoDePegado } from '../test/setup.ts'
import { blocks, caretTo, mount } from '../test/view.tsx'

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
