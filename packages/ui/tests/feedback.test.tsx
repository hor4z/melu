import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, EmptyState, Progress, Separator, Skeleton } from '@melu/ui'

describe('Alert', () => {
  test('la información se anuncia como estado y el peligro interrumpe', () => {
    const { rerender } = render(<Alert title="Actividad asignada">Ya la ven</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Actividad asignada')
    rerender(<Alert variant="danger" title="No se pudo guardar" />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar')
  })
})

describe('Progress', () => {
  test('dice cuánto va sobre cuánto', () => {
    render(<Progress value={62} label="Entregas" />)
    const barra = screen.getByRole('progressbar', { name: 'Entregas' })
    expect(barra).toHaveAttribute('aria-valuenow', '62')
    expect(barra).toHaveAttribute('aria-valuemax', '100')
  })

  test('con otro máximo, el número es el crudo y no el porcentaje', () => {
    render(<Progress value={3} max={4} label="Entregas" />)
    const barra = screen.getByRole('progressbar')
    expect(barra).toHaveAttribute('aria-valuenow', '3')
    expect(barra).toHaveAttribute('aria-valuemax', '4')
  })
})

describe('Separator', () => {
  test('es un separador con su orientación', () => {
    render(<Separator orientation="vertical" />)
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })
})

describe('Skeleton', () => {
  test('no se anuncia: es un hueco mientras carga', () => {
    const { container } = render(<Skeleton className="h-4" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('EmptyState', () => {
  test('dice qué falta y qué se puede hacer', () => {
    render(<EmptyState title="Nada acá" description="Todavía no llegó ninguna entrega." actions={<button type="button">Asignar</button>} />)
    expect(screen.getByText('Nada acá')).toBeInTheDocument()
    expect(screen.getByText('Todavía no llegó ninguna entrega.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Asignar' })).toBeInTheDocument()
  })
})
