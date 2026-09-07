import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@melu/ui'

describe('Checkbox', () => {
  test('suelto se tilda solo', async () => {
    render(<Checkbox>Listo</Checkbox>)
    const casilla = screen.getByRole('checkbox', { name: 'Listo' })
    expect(casilla).not.toBeChecked()
    await userEvent.click(casilla)
    expect(casilla).toBeChecked()
  })

  test('controlado obedece a quien lo controla, no al clic', async () => {
    const cambio = vi.fn()
    render(<Checkbox checked={false} onCheckedChange={cambio}>Listo</Checkbox>)
    const casilla = screen.getByRole('checkbox')
    await userEvent.click(casilla)
    expect(cambio).toHaveBeenCalledWith(true)
    expect(casilla).not.toBeChecked()
  })

  test('`indeterminate` se anuncia como mixto, que es un estado y no un dibujo', () => {
    render(<Checkbox checked="indeterminate">Algunos</Checkbox>)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
  })

  test('desde el mixto, tocarlo tilda todo', async () => {
    const cambio = vi.fn()
    render(<Checkbox checked="indeterminate" onCheckedChange={cambio}>Algunos</Checkbox>)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(cambio).toHaveBeenCalledWith(true)
  })

  test('la descripción es parte del nombre accesible', () => {
    render(<Checkbox description="Se aplica a todo el grupo">Avisos</Checkbox>)
    expect(screen.getByRole('checkbox', { name: /Avisos/ })).toBeInTheDocument()
    expect(screen.getByText('Se aplica a todo el grupo')).toBeInTheDocument()
  })
})
