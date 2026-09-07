import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DOODLES, DoodleWave, Logo, Logomark, PhotoFrame } from '@melu/ui'

describe('Logo', () => {
  test('el logo dice el nombre; el logomark es decorativo, porque el nombre ya está al lado', () => {
    const { container } = render(<><Logo /><Logomark /></>)
    expect(screen.getByText('melu')).toBeInTheDocument()
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})

describe('PhotoFrame', () => {
  test('rinde una figura con su foto', () => {
    const { container } = render(<PhotoFrame src="https://ejemplo.test/foto.jpg" alt="Un puente de espagueti" />)
    expect(container.querySelector('figure')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Un puente de espagueti' })).toBeInTheDocument()
  })
})

describe('Doodles', () => {
  test('están los diez y todos dibujan', () => {
    const nombres = Object.keys(DOODLES)
    expect(nombres).toHaveLength(10)
    for (const nombre of nombres) {
      const Doodle = DOODLES[nombre as keyof typeof DOODLES]
      const { container, unmount } = render(<Doodle />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      unmount()
    }
  })

  test('cada uno también se importa por su nombre', () => {
    const { container } = render(<DoodleWave />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
