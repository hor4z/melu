import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl, SegmentedControlItem } from '@melu/ui'

const control = (props: { value?: string; onValueChange?: (v: string) => void; defaultValue?: string }) => (
  <SegmentedControl label="Período" {...props}>
    <SegmentedControlItem value="dia">Día</SegmentedControlItem>
    <SegmentedControlItem value="semana">Semana</SegmentedControlItem>
    <SegmentedControlItem value="mes">Mes</SegmentedControlItem>
  </SegmentedControl>
)

describe('SegmentedControl', () => {
  test('son opciones excluyentes: un radiogroup con sus radios', () => {
    render(control({ defaultValue: 'semana' }))
    expect(screen.getByRole('radiogroup', { name: 'Período' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Semana' })).toBeChecked()
  })

  test('elegir avisa el valor', async () => {
    const cambio = vi.fn()
    render(control({ defaultValue: 'dia', onValueChange: cambio }))
    await userEvent.click(screen.getByRole('radio', { name: 'Mes' }))
    expect(cambio).toHaveBeenCalledWith('mes')
  })

  test('controlado no se mueve solo', async () => {
    const cambio = vi.fn()
    render(control({ value: 'dia', onValueChange: cambio }))
    await userEvent.click(screen.getByRole('radio', { name: 'Mes' }))
    expect(cambio).toHaveBeenCalledWith('mes')
    expect(screen.getByRole('radio', { name: 'Día' })).toBeChecked()
  })
})
