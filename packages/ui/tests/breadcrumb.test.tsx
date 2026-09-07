import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbPage } from '@melu/ui'

const camino = (
  <Breadcrumb>
    <BreadcrumbItem href="/groups">Grupos</BreadcrumbItem>
    <BreadcrumbItem href="/groups/1">Taller de robótica</BreadcrumbItem>
    <BreadcrumbPage>El robot que cuenta</BreadcrumbPage>
  </Breadcrumb>
)

describe('Breadcrumb', () => {
  test('es una navegación con nombre y una lista de pasos', () => {
    render(camino)
    expect(screen.getByRole('navigation', { name: 'Dónde estás' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grupos' })).toHaveAttribute('href', '/groups')
  })

  test('la página en la que estás no es un enlace y lo dice', () => {
    render(camino)
    const aca = screen.getByText('El robot que cuenta')
    expect(aca.closest('li')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'El robot que cuenta' })).not.toBeInTheDocument()
  })

  test('los separadores los pone el componente y no los lee nadie', () => {
    const { container } = render(camino)
    // Uno menos que pasos, y todos escondidos del lector.
    const separadores = container.querySelectorAll('li[aria-hidden="true"]')
    expect(separadores).toHaveLength(2)
  })

  test('el padre se repite para la vuelta del celular, sin duplicar la página', () => {
    render(camino)
    // Dos veces el mismo destino (el camino y la fila angosta), una sola vez el resto.
    expect(screen.getAllByRole('link', { name: 'Taller de robótica' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Grupos' })).toHaveLength(1)
    expect(screen.getAllByText('El robot que cuenta')).toHaveLength(1)
  })

  test('un solo paso no tiene vuelta que ofrecer', () => {
    render(<Breadcrumb><BreadcrumbPage>Grupos</BreadcrumbPage></Breadcrumb>)
    expect(screen.getAllByText('Grupos')).toHaveLength(1)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  test('con asChild el paso es el enlace del router y conserva su texto', () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem asChild><a href="/groups" data-router="si">Grupos</a></BreadcrumbItem>
        <BreadcrumbPage>Taller de robótica</BreadcrumbPage>
      </Breadcrumb>,
    )
    // Dos veces, como todo padre: el camino y la fila del celular.
    const paso = screen.getAllByRole('link', { name: 'Grupos' })[0]
    expect(paso).toHaveAttribute('data-router', 'si')
    expect(paso).toHaveClass('text-ink-muted')
  })
})
