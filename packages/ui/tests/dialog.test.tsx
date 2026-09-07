import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertDialog, Button, Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@melu/ui'

const modal = (props: { purpose?: 'info' | 'form' | 'required' } = {}) => (
  <Dialog {...props}>
    <DialogTrigger><Button>Invitar</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Invitar al grupo</DialogTitle><DialogDescription>Entran con Google.</DialogDescription></DialogHeader>
      <DialogBody><p>Cuerpo</p></DialogBody>
      <DialogFooter><DialogClose><Button>Cancelar</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>
)

describe('Dialog', () => {
  test('abre con el disparador y se anuncia con su título', async () => {
    render(modal())
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    expect(screen.getByRole('dialog', { name: 'Invitar al grupo' })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Entran con Google.')
  })

  test('cierra con Escape y con el botón de cerrar', async () => {
    render(modal())
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('`required` no se cierra con Escape: eso se responde', async () => {
    render(modal({ purpose: 'required' }))
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('el foco entra al diálogo', async () => {
    render(modal())
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }))
    await waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true))
  })

  test('controlado desde afuera no necesita disparador', () => {
    render(
      <Dialog open>
        <DialogContent><DialogHeader><DialogTitle>Sin disparador</DialogTitle></DialogHeader></DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Sin disparador' })).toBeInTheDocument()
  })
})

describe('AlertDialog', () => {
  test('es un alertdialog y confirma', async () => {
    const confirmar = vi.fn()
    render(<AlertDialog open title="¿Borrar la actividad?" description="No se puede deshacer." onConfirm={confirmar} />)
    expect(screen.getByRole('alertdialog', { name: '¿Borrar la actividad?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(confirmar).toHaveBeenCalledOnce()
  })

  test('el foco entra en Cancelar, que es la salida segura', async () => {
    render(<AlertDialog open title="¿Borrar?" tone="danger" onConfirm={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus())
  })

  test('un clic afuera no lo cierra: una confirmación se responde', async () => {
    render(<AlertDialog defaultOpen title="¿Borrar?" onConfirm={() => {}} />)
    await userEvent.click(document.body)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
