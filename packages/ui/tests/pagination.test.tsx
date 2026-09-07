import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination, PaginationNext, PaginationPrev, PaginationStatus } from '@melu/ui'

describe('PaginationStatus', () => {
  test('dice qué tramo se está viendo', () => {
    render(<PaginationStatus from={16} to={30} total={42} noun="entregas" />)
    expect(screen.getByText('16 a 30 de 42 entregas')).toBeInTheDocument()
  })

  test('cuando el tramo es todo, no cuenta desde dónde: eso sería decirlo tres veces', () => {
    render(<PaginationStatus from={1} to={17} total={17} noun="entregas" />)
    expect(screen.getByText('17 entregas')).toBeInTheDocument()
  })

  test('sin total dice el tramo y nada más, que es lo que se sabe con un cursor', () => {
    render(<PaginationStatus from={16} to={30} noun="entregas" />)
    expect(screen.getByText('16 a 30 entregas')).toBeInTheDocument()
  })

  test('arranca en uno si no le dicen otra cosa', () => {
    render(<PaginationStatus to={15} total={42} noun="entregas" />)
    expect(screen.getByText('1 a 15 de 42 entregas')).toBeInTheDocument()
  })

  test('la pantalla puede escribir su propia frase', () => {
    render(<PaginationStatus to={9}>Las nueve que faltan corregir</PaginationStatus>)
    expect(screen.getByText('Las nueve que faltan corregir')).toBeInTheDocument()
  })
})

describe('PaginationPrev y PaginationNext', () => {
  test('llevan al tramo de al lado', async () => {
    const antes = vi.fn()
    const despues = vi.fn()
    render(<><PaginationPrev onClick={antes} /><PaginationNext onClick={despues} /></>)
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(antes).toHaveBeenCalledOnce()
    expect(despues).toHaveBeenCalledOnce()
  })

  test('en las puntas se apagan, no se van: un par que aparece y desaparece corre al otro debajo del dedo', async () => {
    const antes = vi.fn()
    render(<PaginationPrev disabled onClick={antes} />)
    const boton = screen.getByRole('button', { name: 'Anterior' })
    expect(boton).toBeInTheDocument()
    expect(boton).toBeDisabled()
    await userEvent.click(boton)
    expect(antes).not.toHaveBeenCalled()
  })

  test('el `disabled` del siguiente es el `more` que contesta la api', () => {
    const { rerender } = render(<PaginationNext disabled={!true} />)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    rerender(<PaginationNext disabled={!false} />)
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  test('mientras el tramo viaja, hilan y no se puede tocar de nuevo', async () => {
    const despues = vi.fn()
    render(<PaginationNext loading onClick={despues} />)
    const boton = screen.getByRole('button')
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(boton)
    expect(despues).not.toHaveBeenCalled()
  })

  test('el texto se puede cambiar', () => {
    render(<PaginationNext>Más entregas</PaginationNext>)
    expect(screen.getByRole('button', { name: /Más entregas/ })).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  test('el tramo de un lado y los dos botones del otro', () => {
    render(
      <Pagination>
        <PaginationStatus from={16} to={30} total={42} noun="entregas" />
        <PaginationPrev onClick={() => {}} />
        <PaginationNext onClick={() => {}} />
      </Pagination>,
    )
    expect(screen.getByText('16 a 30 de 42 entregas')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
