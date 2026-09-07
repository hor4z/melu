import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Filter, FilterBar, FilterReset, FilterSearch, FilterSet, facets, type FilterOption } from '@melu/ui'

const ESTADOS: FilterOption[] = [
  { value: 'submitted', label: 'Para mirar', color: 'warning', count: 10 },
  { value: 'graded', label: 'Corregida', color: 'success', count: 5 },
  { value: 'in_progress', label: 'Sin terminar', color: 'default', count: 2 },
]

const PERSONAS: FilterOption[] = ['Ana Gómez', 'Leo Paz', 'Sol Ríos', 'Juana Ferreyra', 'Tomás Britos', 'Mia Acosta', 'Bruno Sosa', 'Ciro Maldonado', 'Emma Quiroga']
  .map((n) => ({ value: n, label: n, avatar: true, count: 1 }))

describe('Filter', () => {
  test('el panel aparece recién al abrirlo, con las opciones y su cuenta', async () => {
    render(<Filter label="Estado" options={ESTADOS} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Estado' }))
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: /Para mirar/ })).toHaveTextContent('10')
  })

  test('elegir avisa el arreglo entero y lo elegido vuelve como chip al disparador', async () => {
    const cambio = vi.fn()
    render(<Filter label="Estado" options={ESTADOS} onValueChange={cambio} />)
    await userEvent.click(screen.getByRole('button', { name: 'Estado' }))
    await userEvent.click(screen.getByRole('option', { name: /Para mirar/ }))
    expect(cambio).toHaveBeenCalledWith(['submitted'])
    expect(screen.getByRole('button', { name: 'Estado: Para mirar' })).toBeInTheDocument()
  })

  test('con varios elegidos el panel sigue abierto y se acumulan', async () => {
    const cambio = vi.fn()
    render(<Filter label="Estado" options={ESTADOS} defaultValue={['submitted']} onValueChange={cambio} />)
    await userEvent.click(screen.getByRole('button', { name: /Estado/ }))
    await userEvent.click(screen.getByRole('option', { name: /Corregida/ }))
    expect(cambio).toHaveBeenCalledWith(['submitted', 'graded'])
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  test('tocar lo elegido lo saca', async () => {
    const cambio = vi.fn()
    render(<Filter label="Estado" options={ESTADOS} defaultValue={['submitted']} onValueChange={cambio} />)
    await userEvent.click(screen.getByRole('button', { name: /Estado/ }))
    await userEvent.click(screen.getByRole('option', { name: /Para mirar/ }))
    expect(cambio).toHaveBeenCalledWith([])
  })

  test('con `multiple` en false se elige uno y el panel se cierra', async () => {
    render(<Filter label="Lente" multiple={false} options={ESTADOS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Lente' }))
    await userEvent.click(screen.getByRole('option', { name: /Corregida/ }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('la caja de buscar aparece sola pasadas las ocho opciones, y filtra', async () => {
    render(<Filter label="Aprendiz" options={PERSONAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Aprendiz' }))
    await userEvent.type(screen.getByRole('textbox'), 'sol')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: /Sol Ríos/ })).toBeInTheDocument()
  })

  test('con pocas opciones no hay caja que buscar', async () => {
    render(<Filter label="Estado" options={ESTADOS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Estado' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  test('sin resultados lo dice, y mientras carga no miente', async () => {
    const { rerender } = render(<Filter label="Aprendiz" options={PERSONAS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Aprendiz' }))
    await userEvent.type(screen.getByRole('textbox'), 'zzz')
    expect(screen.getByText('Nada con ese nombre.')).toBeInTheDocument()

    rerender(<Filter label="Aprendiz" options={[]} loading searchable search="zzz" />)
    expect(screen.queryByText('Nada con ese nombre.')).not.toBeInTheDocument()
  })

  test('lo elegido sigue a la vista aunque la búsqueda de afuera lo deje afuera', () => {
    render(<Filter label="Aprendiz" options={[]} search="zzz" value={['Ana Gómez']} />)
    expect(screen.getByRole('button', { name: 'Aprendiz: Ana Gómez' })).toBeInTheDocument()
  })

  test('con `onRemove` hay una X que saca el filtro entero', async () => {
    const sacar = vi.fn()
    render(<Filter label="Estado" options={ESTADOS} onRemove={sacar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sacar el filtro Estado' }))
    expect(sacar).toHaveBeenCalledOnce()
  })

  // El panel entra invisible hasta que floating-ui lo acomoda, así que se lo espera: eso es lo
  // que evita que aparezca un cuadro en la esquina antes de caer en su lugar.
  test('`defaultOpen` abre el panel apenas aparece', async () => {
    render(<Filter label="Estado" options={ESTADOS} defaultOpen />)
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
  })

  test('el foco entra en la primera opción y las flechas recorren el resto', async () => {
    render(<Filter label="Estado" options={ESTADOS} defaultOpen />)
    await screen.findByRole('listbox')
    const opciones = screen.getAllByRole('option')
    // El foco lo pone el panel al abrirse; esperarlo es lo que evita pelearle con un `.focus()`
    // propio y que el test salga distinto según quién llegue primero.
    await waitFor(() => expect(opciones[0]).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}')
    expect(opciones[1]).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(opciones[2]).toHaveFocus()
  })
})

describe('FilterSet', () => {
  const FILTROS = [
    { name: 'estado', label: 'Estado', options: ESTADOS },
    { name: 'grupo', label: 'Grupo', options: [{ value: '4a', label: '4° A' }] },
  ]

  test('mientras no hay nada filtrando es un solo botón', () => {
    render(<FilterSet filters={FILTROS} />)
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Estado' })).not.toBeInTheDocument()
  })

  test('el filtro que se elige aparece en la barra con su panel ya abierto', async () => {
    render(<FilterSet filters={FILTROS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Estado' }))
    expect(screen.getByRole('button', { name: 'Estado' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Estado' })).toBeInTheDocument()
  })

  test('el que ya está puesto no vuelve a ofrecerse', async () => {
    render(<FilterSet filters={FILTROS} defaultValue={{ estado: [] }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }))
    expect(screen.getByRole('menuitem', { name: 'Grupo' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Estado' })).not.toBeInTheDocument()
  })

  test('con todos puestos no queda botón para agregar', () => {
    render(<FilterSet filters={FILTROS} defaultValue={{ estado: [], grupo: [] }} />)
    expect(screen.queryByRole('button', { name: 'Filtrar' })).not.toBeInTheDocument()
  })

  test('la X saca el filtro del objeto, no lo deja vacío', async () => {
    const cambio = vi.fn()
    render(<FilterSet filters={FILTROS} defaultValue={{ estado: ['submitted'] }} onValueChange={cambio} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sacar el filtro Estado' }))
    expect(cambio).toHaveBeenCalledWith({})
  })

  test('el reset vacía todo, y `onReset` lo reemplaza cuando la pantalla tiene más que limpiar', async () => {
    const cambio = vi.fn()
    const { rerender } = render(<FilterSet filters={FILTROS} defaultValue={{ estado: ['submitted'] }} onValueChange={cambio} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(cambio).toHaveBeenCalledWith({})

    const propio = vi.fn()
    rerender(<FilterSet filters={FILTROS} value={{ estado: ['submitted'] }} onReset={propio} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(propio).toHaveBeenCalledOnce()
  })
})

describe('FilterBar, FilterSearch y FilterReset', () => {
  test('la búsqueda avisa el texto y se vacía con la X', async () => {
    const cambio = vi.fn()
    const { rerender } = render(<FilterBar><FilterSearch value="" onValueChange={cambio} /></FilterBar>)
    await userEvent.type(screen.getByRole('textbox'), 'a')
    expect(cambio).toHaveBeenCalledWith('a')
    rerender(<FilterBar><FilterSearch value="ana" onValueChange={cambio} /></FilterBar>)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(cambio).toHaveBeenLastCalledWith('')
  })

  test('el reset avisa', async () => {
    const limpiar = vi.fn()
    render(<FilterReset onClick={limpiar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(limpiar).toHaveBeenCalledOnce()
  })
})

describe('facets', () => {
  const filas = [{ estado: 'a' }, { estado: 'a' }, { estado: 'b' }, { estado: undefined }]

  test('cuenta por clave y saltea lo que no tiene', () => {
    expect(facets(filas, (f) => f.estado)).toEqual({ a: 2, b: 1 })
  })

  test('sin filas no cuenta nada', () => {
    expect(facets([], () => 'a')).toEqual({})
  })
})
