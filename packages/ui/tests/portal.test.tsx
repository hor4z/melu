import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Portal } from '@melu/ui'

describe('Portal', () => {
  test('cuelga el contenido del body y no del padre, que es lo que evita que lo recorte un overflow', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <Portal><p>Afuera</p></Portal>
      </div>,
    )
    const suelto = screen.getByText('Afuera')
    expect(suelto).toBeInTheDocument()
    expect(container.contains(suelto)).toBe(false)
    expect(document.body.contains(suelto)).toBe(true)
  })
})
