import { describe, expect, test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@melu/ui'

describe('Tooltip', () => {
  test('aparece al pasar por encima y se va al salir', async () => {
    render(
      <Tooltip delay={0}>
        <TooltipTrigger><Button>Guardar</Button></TooltipTrigger>
        <TooltipContent>Se guarda solo</TooltipContent>
      </Tooltip>,
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await userEvent.hover(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Se guarda solo'))
    await userEvent.unhover(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
  })

  test('también aparece con el foco, que es como llega el teclado', async () => {
    render(
      <Tooltip delay={0}>
        <TooltipTrigger><Button>Guardar</Button></TooltipTrigger>
        <TooltipContent>Se guarda solo</TooltipContent>
      </Tooltip>,
    )
    await userEvent.tab()
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument())
  })
})
