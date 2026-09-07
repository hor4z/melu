import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, Form, FormActions, Input } from '@melu/ui'

describe('Field', () => {
  test('cablea la etiqueta con el control sin que haya que pasar un id', () => {
    render(<Field label="Nombre del grupo"><Input /></Field>)
    expect(screen.getByLabelText('Nombre del grupo')).toBe(screen.getByRole('textbox'))
  })

  test('la descripción llega al control por `aria-describedby`', () => {
    render(<Field label="Nombre" description="Lo ven los aprendices."><Input /></Field>)
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Lo ven los aprendices.')
  })

  test('el error se anuncia y marca el control como inválido', () => {
    render(<Field label="Correo" status={{ type: 'error', message: 'Falta el arroba' }}><Input /></Field>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falta el arroba')
    expect(screen.getByRole('textbox')).toBeInvalid()
  })

  test('el éxito no se anuncia: no hay nada que interrumpir', () => {
    render(<Field label="Correo" status={{ type: 'success', message: 'Listo' }}><Input /></Field>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Listo')).toBeInTheDocument()
  })

  test('el mensaje del estado también llega al control', () => {
    render(<Field label="Correo" status={{ type: 'error', message: 'Falta el arroba' }}><Input /></Field>)
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Falta el arroba')
  })

  test('`required` y `disabled` bajan al control', () => {
    render(<Field label="Nombre" required disabled><Input /></Field>)
    const campo = screen.getByRole('textbox')
    expect(campo).toBeRequired()
    expect(campo).toBeDisabled()
  })

  test('`asGroup` rinde un fieldset, que es lo que agrupa varios controles', () => {
    render(<Field asGroup label="Cómo se entrega"><Input /></Field>)
    expect(screen.getByRole('group', { name: 'Cómo se entrega' })).toBeInTheDocument()
  })
})

describe('Form', () => {
  test('es un formulario de verdad, con sus acciones adentro', () => {
    const { container } = render(<Form><FormActions><button type="submit">Guardar</button></FormActions></Form>)
    expect(container.querySelector('form')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })
})
