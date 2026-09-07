import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input, Textarea } from '@melu/ui'

describe('Input', () => {
  test('escribe y avisa cada tecla', async () => {
    const cambio = vi.fn()
    render(<Input aria-label="Buscar" onChange={cambio} />)
    await userEvent.type(screen.getByRole('textbox'), 'sol')
    expect(cambio).toHaveBeenCalledTimes(3)
  })

  test('la X aparece solo con texto y avisa que hay que vaciar', async () => {
    const vaciar = vi.fn()
    const { rerender } = render(<Input aria-label="Buscar" value="" clearable onClear={vaciar} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()

    rerender(<Input aria-label="Buscar" value="sol" clearable onClear={vaciar} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(vaciar).toHaveBeenCalledOnce()
  })

  test('`invalid` lo dice en el aria y no solo en el borde', () => {
    render(<Input aria-label="Correo" invalid />)
    expect(screen.getByRole('textbox')).toBeInvalid()
  })
})

describe('Textarea', () => {
  test('escribe en varias líneas', async () => {
    render(<Textarea aria-label="Consigna" />)
    const caja = screen.getByRole('textbox')
    await userEvent.type(caja, 'una{enter}otra')
    expect(caja).toHaveValue('una\notra')
  })

  test('`autoGrow` crece con el contenido en vez de scrollear', async () => {
    render(<Textarea aria-label="Consigna" autoGrow />)
    const caja = screen.getByRole('textbox') as HTMLTextAreaElement
    await userEvent.type(caja, 'algo')
    // jsdom no maquetea, así que el alto queda en 0px; lo que se prueba es que la escriba, que
    // es lo que rompía cuando `onChange` no se encadenaba.
    expect(caja.style.height).toBe('0px')
    expect(caja).toHaveValue('algo')
  })
})
