import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, MenuButton, MoreMenu } from '@melu/ui'

const menu = (props: { onSelect?: () => void } = {}) => (
  <DropdownMenu>
    <DropdownMenuTrigger><Button>Acciones</Button></DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={props.onSelect}>Editar</DropdownMenuItem>
      <DropdownMenuItem>Duplicar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

describe('DropdownMenu', () => {
  test('abre con el disparador y cierra al elegir', async () => {
    const elegir = vi.fn()
    render(menu({ onSelect: elegir }))
    await userEvent.click(screen.getByRole('button', { name: 'Acciones' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }))
    expect(elegir).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  test('Escape lo cierra sin elegir nada', async () => {
    const elegir = vi.fn()
    render(menu({ onSelect: elegir }))
    await userEvent.click(screen.getByRole('button', { name: 'Acciones' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(elegir).not.toHaveBeenCalled()
  })

  test('la opción que se tilda se anuncia tildada y deja el menú abierto sola', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger><Button>Columnas</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Grupo</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Columnas' }))
    const opcion = screen.getByRole('menuitemcheckbox', { name: 'Grupo' })
    expect(opcion).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(opcion)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  test('el disparador dice si está abierto', async () => {
    render(menu())
    const boton = screen.getByRole('button', { name: 'Acciones' })
    expect(boton).toHaveAttribute('data-state', 'closed')
    await userEvent.click(boton)
    expect(boton).toHaveAttribute('data-state', 'open')
  })
})

describe('MoreMenu', () => {
  test('los tres puntos llevan nombre y sus opciones adentro', async () => {
    const borrar = vi.fn()
    render(<MoreMenu label="Más acciones" items={[{ label: 'Borrar', onSelect: borrar, destructive: true }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Borrar' }))
    expect(borrar).toHaveBeenCalledOnce()
  })
})

describe('MenuButton', () => {
  test('muestra la etiqueta y la línea de abajo', () => {
    render(<MenuButton description="2 espacios">Escuela 12</MenuButton>)
    expect(screen.getByText('Escuela 12')).toBeInTheDocument()
    expect(screen.getByText('2 espacios')).toBeInTheDocument()
  })
})
