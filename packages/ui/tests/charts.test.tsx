import { describe, expect, test, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { Counter, ProgressRing, Sparkline } from '@melu/ui'

describe('Sparkline', () => {
  test('dibuja una línea con los datos que le dan', () => {
    const { container } = render(<Sparkline data={[3, 5, 4, 7]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('path')).toHaveAttribute('d')
  })

  test('sin datos no dibuja nada roto', () => {
    const { container } = render(<Sparkline data={[]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('ProgressRing', () => {
  test('el anillo dice su porcentaje', () => {
    render(<ProgressRing value={0.62} />)
    expect(screen.getByText('62%')).toBeInTheDocument()
  })
})

describe('Counter', () => {
  test('arranca en cero y termina en el número al que iba', () => {
    vi.useFakeTimers()
    try {
      render(<Counter to={128} />)
      expect(screen.getByText('0')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(800) })
      expect(screen.getByText('128')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
