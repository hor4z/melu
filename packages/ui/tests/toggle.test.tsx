import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toggle, ToggleGroup, ToggleGroupItem } from '@melu/ui'

describe('Toggle', () => {
  test('queda apretado y lo anuncia', async () => {
    render(<Toggle>Negrita</Toggle>)
    const boton = screen.getByRole('button', { name: 'Negrita' })
    expect(boton).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(boton)
    expect(boton).toHaveAttribute('aria-pressed', 'true')
  })

  test('controlado avisa y no decide', async () => {
    const cambio = vi.fn()
    render(<Toggle pressed={false} onPressedChange={cambio}>Negrita</Toggle>)
    await userEvent.click(screen.getByRole('button'))
    expect(cambio).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('ToggleGroup', () => {
  test('`single` deja uno solo apretado', async () => {
    const cambio = vi.fn()
    render(
      <ToggleGroup type="single" onValueChange={cambio}>
        <ToggleGroupItem value="papel">Papel</ToggleGroupItem>
        <ToggleGroupItem value="pantalla">Pantalla</ToggleGroupItem>
      </ToggleGroup>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Papel' }))
    expect(cambio).toHaveBeenLastCalledWith(['papel'])
    await userEvent.click(screen.getByRole('button', { name: 'Pantalla' }))
    expect(cambio).toHaveBeenLastCalledWith(['pantalla'])
  })

  test('`multiple` los acumula', async () => {
    const cambio = vi.fn()
    render(
      <ToggleGroup type="multiple" onValueChange={cambio}>
        <ToggleGroupItem value="papel">Papel</ToggleGroupItem>
        <ToggleGroupItem value="pantalla">Pantalla</ToggleGroupItem>
      </ToggleGroup>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Papel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pantalla' }))
    expect(cambio).toHaveBeenLastCalledWith(['papel', 'pantalla'])
  })

  test('vuelve a soltar lo que ya estaba apretado', async () => {
    const cambio = vi.fn()
    render(
      <ToggleGroup type="multiple" defaultValue={['papel']} onValueChange={cambio}>
        <ToggleGroupItem value="papel">Papel</ToggleGroupItem>
      </ToggleGroup>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Papel' }))
    expect(cambio).toHaveBeenLastCalledWith([])
  })

  test('el grupo se anuncia como grupo', () => {
    render(<ToggleGroup aria-label="Soporte"><ToggleGroupItem value="a">A</ToggleGroupItem></ToggleGroup>)
    expect(screen.getByRole('group', { name: 'Soporte' })).toBeInTheDocument()
  })
})
