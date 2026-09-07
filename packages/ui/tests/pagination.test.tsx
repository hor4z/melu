import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination, PaginationMore, PaginationStatus } from '@melu/ui'

describe('PaginationStatus', () => {
  test('dice cuánto se ve de cuánto', () => {
    render(<PaginationStatus shown={15} total={17} noun="entregas" />)
    expect(screen.getByText('15 de 17 entregas')).toBeInTheDocument()
  })

  test('cuando ya se ve todo, el "de" sobra', () => {
    render(<PaginationStatus shown={17} total={17} noun="entregas" />)
    expect(screen.getByText('17 entregas')).toBeInTheDocument()
  })

  test('sin total solo cuenta lo que hay a la vista, que es lo que se sabe cuando el back pagina por cursor', () => {
    render(<PaginationStatus shown={40} noun="entregas" />)
    expect(screen.getByText('40 entregas')).toBeInTheDocument()
  })

  test('la pantalla puede escribir su propia frase', () => {
    render(<PaginationStatus shown={3} total={9}>Tres de nueve, y las demás las corrigió Ana</PaginationStatus>)
    expect(screen.getByText('Tres de nueve, y las demás las corrigió Ana')).toBeInTheDocument()
  })
})

describe('PaginationMore', () => {
  test('pide el tramo siguiente', async () => {
    const mas = vi.fn()
    render(<PaginationMore onClick={mas} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }))
    expect(mas).toHaveBeenCalledOnce()
  })

  test('sin más para pedir, no hay botón: no se deshabilita, se va', () => {
    render(<PaginationMore hasMore={false} onClick={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('mientras viaja, hila y no se puede tocar de nuevo', async () => {
    const mas = vi.fn()
    render(<PaginationMore loading onClick={mas} />)
    const boton = screen.getByRole('button')
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(boton)
    expect(mas).not.toHaveBeenCalled()
  })

  test('el texto se puede cambiar', () => {
    render(<PaginationMore>Ver más entregas</PaginationMore>)
    expect(screen.getByRole('button', { name: 'Ver más entregas' })).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  test('la cuenta de un lado y la acción del otro', () => {
    render(
      <Pagination>
        <PaginationStatus shown={15} total={17} noun="entregas" />
        <PaginationMore onClick={() => {}} />
      </Pagination>,
    )
    expect(screen.getByText('15 de 17 entregas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeInTheDocument()
  })
})
