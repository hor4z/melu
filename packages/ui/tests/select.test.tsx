import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NativeSelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@melu/ui'

const lista = (props: { value?: string; onValueChange?: (v: string) => void; defaultValue?: string }) => (
  <Select {...props}>
    <SelectTrigger aria-label="Ciclo"><SelectValue placeholder="Elegí un ciclo" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="primero">Primer ciclo</SelectItem>
      <SelectItem value="segundo">Segundo ciclo</SelectItem>
    </SelectContent>
  </Select>
)

describe('Select', () => {
  test('con nada elegido muestra el placeholder', () => {
    render(lista({}))
    expect(screen.getByText('Elegí un ciclo')).toBeInTheDocument()
  })

  test('abre, elige y muestra la etiqueta de lo elegido', async () => {
    const cambio = vi.fn()
    render(lista({ onValueChange: cambio }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Ciclo' }))
    await userEvent.click(screen.getByRole('option', { name: 'Segundo ciclo' }))
    expect(cambio).toHaveBeenCalledWith('segundo')
    expect(screen.getByRole('combobox')).toHaveTextContent('Segundo ciclo')
  })

  test('al elegir se cierra', async () => {
    render(lista({}))
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Primer ciclo' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('lo elegido se anuncia como elegido', async () => {
    render(lista({ defaultValue: 'primero' }))
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('option', { name: 'Primer ciclo' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Segundo ciclo' })).toHaveAttribute('aria-selected', 'false')
  })

  test('`invalid` no se queda en el borde: lo dice el aria', () => {
    render(
      <Select invalid>
        <SelectTrigger aria-label="Ciclo"><SelectValue placeholder="Elegí" /></SelectTrigger>
        <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
      </Select>,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('NativeSelect', () => {
  test('es el select del navegador y elige por valor', async () => {
    const cambio = vi.fn()
    render(
      <NativeSelect aria-label="Ciclo" defaultValue="primero" onChange={cambio}>
        <option value="primero">Primer ciclo</option>
        <option value="segundo">Segundo ciclo</option>
      </NativeSelect>,
    )
    await userEvent.selectOptions(screen.getByRole('combobox'), 'segundo')
    expect(cambio).toHaveBeenCalled()
    expect(screen.getByRole('combobox')).toHaveValue('segundo')
  })
})
