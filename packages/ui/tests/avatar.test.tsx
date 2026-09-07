import { describe, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Avatar, AvatarGroup, initials, tintOf } from '@melu/ui'

describe('initials', () => {
  test('una palabra da una letra; dos o más, dos', () => {
    expect(initials('Ana')).toBe('A')
    expect(initials('Ana Gómez')).toBe('AG')
    expect(initials('María Luz Pérez')).toBe('MP')
  })

  test('aguanta el vacío y los espacios de más', () => {
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
    expect(initials('  Ana   Gómez  ')).toBe('AG')
  })
})

describe('tintOf', () => {
  test('el mismo nombre da siempre el mismo tinte', () => {
    expect(tintOf('Ana Gómez')).toBe(tintOf('Ana Gómez'))
  })

  test('nombres cortos y parecidos no caen todos en el mismo', () => {
    const tintes = new Set(['Ana', 'Leo', 'Sol', 'Mia', 'Bru'].map(tintOf))
    expect(tintes.size).toBeGreaterThan(1)
  })
})

describe('Avatar', () => {
  test('el nombre está para quien no ve la figura', () => {
    render(<Avatar name="Ana Gómez" />)
    expect(screen.getByText('Ana Gómez')).toBeInTheDocument()
  })

  test('con foto la muestra, y si la foto falla se cae a la figura', () => {
    const { container } = render(<Avatar name="Ana Gómez" src="https://ejemplo.test/ana.jpg" />)
    const foto = screen.getByRole('img', { name: 'Ana Gómez' })
    expect(foto).toHaveAttribute('referrerpolicy', 'no-referrer')
    fireEvent.error(foto)
    expect(screen.queryByRole('img', { name: 'Ana Gómez' })).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('AvatarGroup', () => {
  test('pasado el máximo cuenta el resto', () => {
    render(<AvatarGroup names={['Ana', 'Leo', 'Sol', 'Mia', 'Bruno', 'Nina']} max={4} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  test('es contenido de línea: tiene que poder vivir adentro de un botón', () => {
    const { container } = render(<AvatarGroup names={['Ana', 'Leo']} />)
    expect(container.firstElementChild?.tagName).toBe('SPAN')
  })
})
