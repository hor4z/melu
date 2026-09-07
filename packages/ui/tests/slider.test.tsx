import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Slider } from '@melu/ui'

describe('Slider', () => {
  test('dice dónde está parado y entre qué valores', () => {
    render(<Slider value={62} label="Dificultad" />)
    const control = screen.getByRole('slider', { name: 'Dificultad' })
    expect(control).toHaveAttribute('aria-valuenow', '62')
    expect(control).toHaveAttribute('aria-valuemin', '0')
    expect(control).toHaveAttribute('aria-valuemax', '100')
  })

  test('las flechas lo mueven de a un paso', async () => {
    const cambio = vi.fn()
    render(<Slider defaultValue={50} onValueChange={cambio} label="Dificultad" />)
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(cambio).toHaveBeenLastCalledWith(51)
    await userEvent.keyboard('{ArrowLeft}')
    expect(cambio).toHaveBeenLastCalledWith(50)
  })

  test('Inicio y Fin van a las puntas', async () => {
    const cambio = vi.fn()
    render(<Slider defaultValue={50} onValueChange={cambio} label="Dificultad" />)
    screen.getByRole('slider').focus()
    await userEvent.keyboard('{End}')
    expect(cambio).toHaveBeenLastCalledWith(100)
    await userEvent.keyboard('{Home}')
    expect(cambio).toHaveBeenLastCalledWith(0)
  })

  test('un rango son dos manijas, y cada una dice cuál es', () => {
    render(<Slider value={[20, 80]} />)
    const manijas = screen.getAllByRole('slider')
    expect(manijas).toHaveLength(2)
    expect(manijas[0]).toHaveAccessibleName('Mínimo')
    expect(manijas[1]).toHaveAccessibleName('Máximo')
  })

  test('deshabilitado se sale del tabulador', () => {
    render(<Slider value={30} disabled label="Dificultad" />)
    expect(screen.getByRole('slider')).toHaveAttribute('tabindex', '-1')
  })
})
