import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Eyebrow, Heading, Kbd, Text } from '@melu/ui'

describe('Text', () => {
  test('es un párrafo, y `as` lo cambia sin cambiar el estilo', () => {
    const { container, rerender } = render(<Text>Cuerpo</Text>)
    expect(container.querySelector('p')).toBeInTheDocument()
    rerender(<Text as="span">Cuerpo</Text>)
    expect(container.querySelector('span')).toBeInTheDocument()
  })
})

describe('Heading', () => {
  test('`level` es el nivel del encabezado, no su tamaño', () => {
    render(<><Heading level={1}>Uno</Heading><Heading level={3}>Tres</Heading></>)
    expect(screen.getByRole('heading', { level: 1, name: 'Uno' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Tres' })).toBeInTheDocument()
  })

  test('el tamaño se elige aparte del nivel: un h1 puede ser chico', () => {
    render(<Heading level={1} size="sm">Chico</Heading>)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('Eyebrow y Kbd', () => {
  test('rinden lo suyo', () => {
    const { container } = render(<><Eyebrow>Lo primero</Eyebrow><Kbd>Esc</Kbd></>)
    expect(screen.getByText('Lo primero')).toBeInTheDocument()
    expect(container.querySelector('kbd')).toHaveTextContent('Esc')
  })
})
