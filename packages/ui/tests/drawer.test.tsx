import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@melu/ui'

const panel = (
  <Drawer>
    <DrawerTrigger><Button>Editar</Button></DrawerTrigger>
    <DrawerContent side="right">
      <DrawerHeader><DrawerTitle>Editar el grupo</DrawerTitle></DrawerHeader>
      <DrawerBody><p>Cuerpo</p></DrawerBody>
      <DrawerClose><Button>Cerrar</Button></DrawerClose>
    </DrawerContent>
  </Drawer>
)

describe('Drawer', () => {
  test('es el mismo modal que Dialog, pegado a un borde', async () => {
    render(panel)
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('dialog', { name: 'Editar el grupo' })).toBeInTheDocument()
  })

  test('cierra con Escape', async () => {
    render(panel)
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
