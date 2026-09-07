import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Avatar, DataList, DataListActions, DataListHead, DataListItem, DataListMedia, DataListMeta, DataListText, DataListTitle } from '@melu/ui'

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

  test('`DataListMeta` pone el punto entre pedazo y pedazo, y no antes del primero', () => {
    render(<DataList><DataListItem><DataListMeta><span>4° A</span><span>hace 2 h</span><span>12 min</span></DataListMeta></DataListItem></DataList>)
    const meta = screen.getByText('4° A').parentElement as HTMLElement
    expect(meta.textContent).toBe('4° A·hace 2 h·12 min')
    expect(meta.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
  })

  test('un pedazo que no está no deja un punto suelto', () => {
    const minutos = 0
    render(
      <DataList>
        <DataListItem>
          <DataListMeta><span>4° A</span>{minutos > 0 && <span>{minutos} min</span>}<span>hace 2 h</span></DataListMeta>
        </DataListItem>
      </DataList>,
    )
    expect((screen.getByText('4° A').parentElement as HTMLElement).textContent).toBe('4° A·hace 2 h')
  })

  test('la figura ocupa las filas de la ficha en vez de estirar la primera', () => {
    const { container } = render(ficha())
    const media = container.querySelector('.row-span-full')
    expect(media).toBeInTheDocument()
    expect((screen.getByRole('listitem') as HTMLElement).className).toContain('grid-rows-')
  })
})
