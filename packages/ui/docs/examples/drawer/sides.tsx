import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, Text } from '@melu/ui'

const SIDES = [['right', 'Derecha'], ['left', 'Izquierda'], ['bottom', 'Abajo']] as const

export default function Demo() {
  return (
    <>
      {SIDES.map(([side, label]) => (
        <Drawer key={side}>
          <DrawerTrigger><Button variant="secondary">{label}</Button></DrawerTrigger>
          <DrawerContent side={side}>
            <DrawerHeader><DrawerTitle>Entra desde {label.toLowerCase()}</DrawerTitle></DrawerHeader>
            <DrawerBody><Text size="sm" variant="muted">Abajo es el que sirve en el teléfono: el pulgar llega.</Text></DrawerBody>
          </DrawerContent>
        </Drawer>
      ))}
    </>
  )
}
