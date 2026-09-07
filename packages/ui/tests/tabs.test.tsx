import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@melu/ui'

const solapas = (
  <Tabs defaultValue="misiones">
    <TabsList>
      <TabsTrigger value="misiones">Misiones</TabsTrigger>
      <TabsTrigger value="aprendices">Aprendices</TabsTrigger>
    </TabsList>
    <TabsContent value="misiones">Dos misiones</TabsContent>
    <TabsContent value="aprendices">Cuatro aprendices</TabsContent>
  </Tabs>
)

describe('Tabs', () => {
  test('muestra el panel de la solapa elegida y esconde el otro', async () => {
    render(solapas)
    expect(screen.getByText('Dos misiones')).toBeInTheDocument()
    expect(screen.queryByText('Cuatro aprendices')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Aprendices' }))
    expect(screen.getByText('Cuatro aprendices')).toBeInTheDocument()
    expect(screen.queryByText('Dos misiones')).not.toBeInTheDocument()
  })

  test('el panel dice de qué solapa es, y la solapa qué panel controla', () => {
    render(solapas)
    const solapa = screen.getByRole('tab', { name: 'Misiones' })
    const panel = screen.getByRole('tabpanel')
    expect(solapa).toHaveAttribute('aria-selected', 'true')
    expect(solapa).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', solapa.id)
  })

  test('las flechas cambian de solapa', async () => {
    render(solapas)
    screen.getByRole('tab', { name: 'Misiones' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Aprendices' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Misiones' })).toHaveAttribute('aria-selected', 'true')
  })

  test('solo la solapa activa queda en el tabulador', () => {
    render(solapas)
    expect(screen.getByRole('tab', { name: 'Misiones' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Aprendices' })).toHaveAttribute('tabindex', '-1')
  })
})
