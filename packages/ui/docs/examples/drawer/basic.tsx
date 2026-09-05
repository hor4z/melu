import { Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, Field, Input, Textarea } from '@melu/ui'

export default function Demo() {
  return (
    <Drawer>
      <DrawerTrigger><Button variant="outline">Abrir el panel</Button></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>Editar el grupo</DrawerTitle></DrawerHeader>
        <DrawerBody className="flex flex-col gap-4">
          <Field label="Nombre"><Input defaultValue="4° A · Matemática" /></Field>
          <Field label="Notas" description="Solo las ves vos."><Textarea autoGrow rows={4} /></Field>
        </DrawerBody>
        <DrawerFooter>
          <Button>Guardar</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
