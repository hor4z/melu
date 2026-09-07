import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Badge, Chip } from '@melu/ui'

describe('Chip', () => {
  test('muestra su texto', () => {
    render(<Chip>Reto</Chip>)
    expect(screen.getByText('Reto')).toBeInTheDocument()
  })

  test('la X quita, y no dispara el clic del chip', async () => {
    const quitar = vi.fn()
    const clic = vi.fn()
    render(<Chip onClick={clic} onRemove={quitar}>Matemática</Chip>)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(quitar).toHaveBeenCalledOnce()
    expect(clic).not.toHaveBeenCalled()
  })

  test('sin `onRemove` no hay X que tocar', () => {
    render(<Chip>Matemática</Chip>)
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument()
  })
})

describe('Badge', () => {
  test('es un contador corto', () => {
    render(<Badge>3</Badge>)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
