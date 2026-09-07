import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@melu/ui'

const panel = (
  <Popover>
    <PopoverTrigger><Button>Abrir</Button></PopoverTrigger>
    <PopoverContent>
      <p>Contenido libre</p>
      <PopoverClose><Button>Cerrar</Button></PopoverClose>
    </PopoverContent>
  </Popover>
)

describe('Popover', () => {
  test('el contenido aparece recién al abrir', async () => {
    render(panel)
    expect(screen.queryByText('Contenido libre')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByText('Contenido libre')).toBeInTheDocument()
  })

  test('cierra desde adentro, con Escape y con un clic afuera', async () => {
    render(panel)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText('Contenido libre')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('Contenido libre')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await userEvent.click(document.body)
    expect(screen.queryByText('Contenido libre')).not.toBeInTheDocument()
  })

  test('controlado desde afuera se abre sin tocar el disparador', () => {
    render(
      <Popover open>
        <PopoverTrigger><Button>Abrir</Button></PopoverTrigger>
        <PopoverContent><p>Ya abierto</p></PopoverContent>
      </Popover>,
    )
    expect(screen.getByText('Ya abierto')).toBeInTheDocument()
  })
})
