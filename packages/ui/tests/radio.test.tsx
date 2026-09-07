import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioCard, RadioGroup, RadioGroupItem } from '@melu/ui'

const opciones = (
  <>
    <RadioGroupItem value="solo">Individual</RadioGroupItem>
    <RadioGroupItem value="pareja">En parejas</RadioGroupItem>
    <RadioGroupItem value="equipo">En equipo</RadioGroupItem>
  </>
)

describe('RadioGroup', () => {
  test('elige uno y deselecciona al anterior', async () => {
    const cambio = vi.fn()
    render(<RadioGroup defaultValue="solo" onValueChange={cambio}>{opciones}</RadioGroup>)
    await userEvent.click(screen.getByRole('radio', { name: 'En parejas' }))
    expect(cambio).toHaveBeenCalledWith('pareja')
    expect(screen.getByRole('radio', { name: 'En parejas' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Individual' })).not.toBeChecked()
  })

  test('las flechas se mueven entre opciones, como corresponde a un grupo de radios', async () => {
    render(<RadioGroup defaultValue="solo">{opciones}</RadioGroup>)
    screen.getByRole('radio', { name: 'Individual' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'En parejas' })).toBeChecked()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('radio', { name: 'Individual' })).toBeChecked()
  })

  test('solo el elegido queda en el tabulador', () => {
    render(<RadioGroup defaultValue="pareja">{opciones}</RadioGroup>)
    expect(screen.getByRole('radio', { name: 'En parejas' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Individual' })).toHaveAttribute('tabindex', '-1')
  })

  test('el grupo se anuncia como radiogroup', () => {
    render(<RadioGroup aria-label="Cómo se trabaja">{opciones}</RadioGroup>)
    expect(screen.getByRole('radiogroup', { name: 'Cómo se trabaja' })).toBeInTheDocument()
  })
})

describe('RadioCard', () => {
  test('la tarjeta entera es el radio', async () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioCard value="a" description="Una hora">Corta</RadioCard>
        <RadioCard value="b" description="Tres clases">Larga</RadioCard>
      </RadioGroup>,
    )
    await userEvent.click(screen.getByRole('radio', { name: /Larga/ }))
    expect(screen.getByRole('radio', { name: /Larga/ })).toBeChecked()
  })
})
