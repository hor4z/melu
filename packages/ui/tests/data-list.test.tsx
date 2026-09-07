import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Avatar, DataList, DataListActions, DataListHead, DataListItem, DataListMedia, DataListMeta, DataListSkeleton, DataListText, DataListTitle } from '@melu/ui'

const ficha = (props: { onClick?: () => void } = {}) => (
  <DataList>
    <DataListItem interactive {...props}>
      <DataListMedia><Avatar name="Ana Gómez" /></DataListMedia>
      <DataListHead><DataListTitle>Ana Gómez</DataListTitle><span>Para mirar</span></DataListHead>
      <DataListText>Fracciones con la pizza</DataListText>
      <DataListMeta><span>4° A</span><span>hace 2 h</span><span>12 min</span></DataListMeta>
      <DataListActions><button type="button">Corregir</button></DataListActions>
    </DataListItem>
  </DataList>
)

describe('DataList', () => {
  test('es una lista y cada ficha es un ítem', () => {
    render(ficha())
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  test('la ficha entera contesta al clic', async () => {
    const abrir = vi.fn()
    render(ficha({ onClick: abrir }))
    await userEvent.click(screen.getByRole('listitem'))
    expect(abrir).toHaveBeenCalledOnce()
  })

  test('`DataListMeta` separa con aire a la vista, y con una coma que no se ve para quien escucha', () => {
    render(<DataList><DataListItem><DataListMeta><span>4° A</span><span>hace 2 h</span></DataListMeta></DataListItem></DataList>)
    const meta = screen.getByText('hace 2 h').parentElement as HTMLElement
    expect(meta.className).toContain('gap-x-')
    expect(meta.textContent).toBe('4° A, hace 2 h')
    // Lo que separa está escondido: a la vista no hay ningún carácter entre un pedazo y el otro.
    expect(meta.querySelector('.sr-only')?.textContent).toBe(', ')
  })

  test('el esqueleto tiene la forma de las fichas y el lector no lo lee', () => {
    render(<DataListSkeleton rows={3} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(document.querySelectorAll('li')).toHaveLength(3)
  })

  test('la figura ocupa las filas de la ficha en vez de estirar la primera', () => {
    const { container } = render(ficha())
    const media = container.querySelector('.row-span-full')
    expect(media).toBeInTheDocument()
    expect((screen.getByRole('listitem') as HTMLElement).className).toContain('grid-rows-')
  })
})
