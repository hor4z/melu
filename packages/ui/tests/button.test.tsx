import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, ButtonGroup, Icon, IconButton } from '@melu/ui'
import { Star } from 'lucide-react'

describe('Button', () => {
  test('rinde el texto y avisa el clic', async () => {
    const clic = vi.fn()
    render(<Button onClick={clic}>Guardar</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(clic).toHaveBeenCalledOnce()
  })

  test('`loading` deshabilita y lo anuncia, así no hay que acordarse de las dos cosas', async () => {
    const clic = vi.fn()
    render(<Button loading onClick={clic}>Guardar</Button>)
    const boton = screen.getByRole('button', { name: 'Guardar' })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(boton)
    expect(clic).not.toHaveBeenCalled()
  })

  test('con `asChild` el elemento sigue siendo un enlace, y los íconos quedan adentro', () => {
    render(
      <Button asChild startIcon={<Icon icon={Star} label="estrella" />}>
        <a href="/grupos">Mis grupos</a>
      </Button>,
    )
    const enlace = screen.getByRole('link', { name: /Mis grupos/ })
    expect(enlace).toHaveAttribute('href', '/grupos')
    expect(enlace.querySelector('svg')).toBeInTheDocument()
  })

  test('el tipo por defecto es `button`: adentro de un formulario no lo manda sin querer', () => {
    render(<Button>Cancelar</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('ButtonGroup', () => {
  test('agrupa a sus hijos', () => {
    render(<ButtonGroup><Button>Uno</Button><Button>Dos</Button></ButtonGroup>)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})

describe('IconButton', () => {
  test('el `label` es el nombre accesible, porque no hay texto visible', () => {
    render(<IconButton label="Destacar" icon={<Icon icon={Star} />} />)
    expect(screen.getByRole('button', { name: 'Destacar' })).toBeInTheDocument()
  })
})
