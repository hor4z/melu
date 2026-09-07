import { describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState, Table, TableBody, TableCaption, TableCell, TableEmpty, TableFooter, TableHead, TableHeader, TableRow } from '@melu/ui'

describe('Table', () => {
  test('es una tabla de verdad, con su cabecera y sus filas', () => {
    render(
      <Table>
        <TableCaption>Las entregas de esta semana.</TableCaption>
        <TableHeader><TableRow><TableHead>Aprendiz</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow><TableCell>Ana Gómez</TableCell><TableCell>Para mirar</TableCell></TableRow>
          <TableRow><TableCell>Leo Paz</TableCell><TableCell>Corregida</TableCell></TableRow>
        </TableBody>
        <TableFooter><TableRow><TableCell colSpan={2}>Dos entregas</TableCell></TableRow></TableFooter>
      </Table>,
    )
    expect(screen.getByRole('table', { name: 'Las entregas de esta semana.' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  test('la cabecera es cabecera de columna, con su `scope`', () => {
    render(<Table><TableHeader><TableRow><TableHead>Aprendiz</TableHead></TableRow></TableHeader></Table>)
    expect(screen.getByRole('columnheader')).toHaveAttribute('scope', 'col')
  })

  test('sin `onSort` la columna no ordena ni lo dice', () => {
    render(<Table><TableHeader><TableRow><TableHead>Aprendiz</TableHead></TableRow></TableHeader></Table>)
    const cabecera = screen.getByRole('columnheader')
    expect(cabecera).not.toHaveAttribute('aria-sort')
    expect(within(cabecera).queryByRole('button')).not.toBeInTheDocument()
  })

  test('con `onSort` el título es un botón y el sentido se anuncia', async () => {
    const ordenar = vi.fn()
    const { rerender } = render(
      <Table><TableHeader><TableRow><TableHead sort={false} onSort={ordenar}>Tiempo</TableHead></TableRow></TableHeader></Table>,
    )
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none')
    await userEvent.click(screen.getByRole('button', { name: 'Tiempo' }))
    expect(ordenar).toHaveBeenCalledOnce()

    rerender(<Table><TableHeader><TableRow><TableHead sort="asc" onSort={ordenar}>Tiempo</TableHead></TableRow></TableHeader></Table>)
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending')

    rerender(<Table><TableHeader><TableRow><TableHead sort="desc" onSort={ordenar}>Tiempo</TableHead></TableRow></TableHeader></Table>)
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending')
  })

  test('la fila elegida se marca con un dato, no con `aria-selected`, que es de una grilla', () => {
    render(<Table><TableBody><TableRow selected><TableCell>Ana</TableCell></TableRow></TableBody></Table>)
    const fila = screen.getByRole('row')
    expect(fila).toHaveAttribute('data-selected')
    expect(fila).not.toHaveAttribute('aria-selected')
  })

  test('la fila interactiva contesta al clic', async () => {
    const abrir = vi.fn()
    render(<Table><TableBody><TableRow interactive onClick={abrir}><TableCell>Ana</TableCell></TableRow></TableBody></Table>)
    await userEvent.click(screen.getByRole('row'))
    expect(abrir).toHaveBeenCalledOnce()
  })

  test('la caja de alrededor es la que scrollea, y está posicionada para no derramar el desborde', () => {
    const { container } = render(<Table><TableBody><TableRow><TableCell>Ana</TableCell></TableRow></TableBody></Table>)
    const caja = container.firstElementChild as HTMLElement
    expect(caja.className).toContain('overflow-x-auto')
    expect(caja.className).toContain('relative')
  })

  test('`TableEmpty` ocupa todo el ancho', () => {
    render(
      <Table>
        <TableHeader><TableRow><TableHead>A</TableHead><TableHead>B</TableHead></TableRow></TableHeader>
        <TableBody><TableEmpty colSpan={2}><EmptyState title="Nada acá" /></TableEmpty></TableBody>
      </Table>,
    )
    expect(screen.getByRole('cell')).toHaveAttribute('colspan', '2')
    expect(screen.getByText('Nada acá')).toBeInTheDocument()
  })
})
