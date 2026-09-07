import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Icon, Sidebar, SidebarHeader, SidebarItem, SidebarLabel, SidebarNav, SidebarToggle } from '@melu/ui'
import { Compass, LayoutDashboard } from 'lucide-react'

const riel = (props: { expanded?: boolean; defaultExpanded?: boolean; onExpandedChange?: (v: boolean) => void } = {}) => (
  <Sidebar {...props}>
    <SidebarHeader>melu<SidebarToggle /></SidebarHeader>
    <SidebarNav>
      <SidebarLabel>Enseñar</SidebarLabel>
      <SidebarItem asChild label="Inicio" icon={<Icon icon={LayoutDashboard} size="lg" />}>
        <a href="/home" aria-current="page" />
      </SidebarItem>
      <SidebarItem asChild label="Lentes" icon={<Icon icon={Compass} size="lg" />}>
        <a href="/lenses" />
      </SidebarItem>
    </SidebarNav>
  </Sidebar>
)

describe('Sidebar', () => {
  test('desplegado, cada destino se lee por su nombre', () => {
    render(riel())
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: 'Lentes' })).toBeInTheDocument()
    expect(screen.getByText('Enseñar')).toBeInTheDocument()
  })

  test('el destino activo sale del `aria-current` que ya pone el router', () => {
    render(riel())
    const activo = screen.getByRole('link', { name: 'Inicio' })
    expect(activo).toHaveAttribute('aria-current', 'page')
    expect(activo.className).toContain('aria-[current=page]:bg-teal')
  })

  test('replegado se angosta, y los nombres siguen ahí para quien escucha', () => {
    const { container, rerender } = render(riel({ expanded: true }))
    expect(container.firstElementChild?.className).toContain('w-56')

    rerender(riel({ expanded: false }))
    expect(container.firstElementChild?.className).toContain('w-16')
    // El nombre no se borra: se esconde. El enlace sigue teniéndolo como nombre accesible.
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByText('Inicio').className).toContain('sr-only')
  })

  test('el rótulo del tramo se esconde a la vista pero no del lector', () => {
    render(riel({ expanded: false }))
    expect(screen.getByText('Enseñar').className).toContain('sr-only')
  })

  test('replegado, el nombre vuelve como tooltip al pasar por encima', async () => {
    render(riel({ expanded: false }))
    await userEvent.hover(screen.getByRole('link', { name: 'Lentes' }))
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Lentes'))
  })

  test('el botón dice qué va a hacer y avisa el estado nuevo', async () => {
    const cambio = vi.fn()
    const { rerender } = render(riel({ expanded: true, onExpandedChange: cambio }))
    const boton = screen.getByRole('button', { name: 'Replegar el panel' })
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(boton)
    expect(cambio).toHaveBeenCalledWith(false)

    rerender(riel({ expanded: false, onExpandedChange: cambio }))
    expect(screen.getByRole('button', { name: 'Desplegar el panel' })).toHaveAttribute('aria-expanded', 'false')
  })

  test('suelto se abre y se cierra solo', async () => {
    const { container } = render(riel({ defaultExpanded: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Replegar el panel' }))
    expect(container.firstElementChild?.className).toContain('w-16')
    await userEvent.click(screen.getByRole('button', { name: 'Desplegar el panel' }))
    expect(container.firstElementChild?.className).toContain('w-56')
  })

  test('recorta lo que asoma y no anima el ancho: así no aparecía una barra de scroll ni parpadeaba', () => {
    const { container, rerender } = render(riel({ expanded: false }))
    const aside = container.firstElementChild as HTMLElement
    // Doblado, los nombres siguen en el DOM y son más anchos que el riel: hay que recortarlos.
    expect(aside.className).toContain('overflow-hidden')
    expect(aside.className).not.toContain('transition-[width]')
    // Y el nav no puede dejar el eje horizontal en `auto`, que es lo que dibujaba la barra.
    expect(screen.getByRole('navigation').className).toContain('overflow-x-hidden')

    rerender(riel({ expanded: true }))
    expect((container.firstElementChild as HTMLElement).className).toContain('overflow-hidden')
  })

  test('el botón está en la cabecera, que es donde se lo busca', () => {
    const { container } = render(riel())
    const cabecera = container.firstElementChild?.firstElementChild
    expect(cabecera?.contains(screen.getByRole('button', { name: 'Replegar el panel' }))).toBe(true)
  })

  test('sus partes no se usan por fuera: avisan en vez de rendir cualquier cosa', () => {
    expect(() => render(<SidebarNav />)).toThrow(/dentro de <Sidebar>/)
  })
})
