import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Icon, Spinner } from '@melu/ui'
import { Star } from 'lucide-react'

describe('Icon', () => {
  test('sin `label` es decorativo y el lector lo saltea', () => {
    const { container } = render(<Icon icon={Star} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  test('con `label` es una imagen con nombre', () => {
    render(<Icon icon={Star} label="Destacada" />)
    expect(screen.getByRole('img', { name: 'Destacada' })).toBeInTheDocument()
  })
})

describe('Spinner', () => {
  test('callado por defecto: adentro de un botón que ya anuncia `aria-busy` sería decirlo dos veces', () => {
    render(<Spinner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('con `label` sí se anuncia, que es cuando hila solo en la pantalla', () => {
    render(<Spinner label="Cargando las entregas" />)
    expect(screen.getByRole('status', { name: 'Cargando las entregas' })).toBeInTheDocument()
  })
})
