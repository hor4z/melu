import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from '@melu/ui'

describe('Switch', () => {
  test('es un switch, no una casilla: el rol lo dice', () => {
    render(<Switch>Avisos</Switch>)
    expect(screen.getByRole('switch', { name: 'Avisos' })).toBeInTheDocument()
  })

  test('prende y apaga, y avisa el valor nuevo', async () => {
    const cambio = vi.fn()
    render(<Switch onCheckedChange={cambio}>Avisos</Switch>)
    const control = screen.getByRole('switch')
    await userEvent.click(control)
    expect(control).toBeChecked()
    expect(cambio).toHaveBeenLastCalledWith(true)
    await userEvent.click(control)
    expect(cambio).toHaveBeenLastCalledWith(false)
  })

  test('deshabilitado no contesta', async () => {
    const cambio = vi.fn()
    render(<Switch disabled onCheckedChange={cambio}>Avisos</Switch>)
    await userEvent.click(screen.getByRole('switch'))
    expect(cambio).not.toHaveBeenCalled()
  })
})
