import { Button, Card, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Eyebrow, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Dialog>
      <DialogTrigger><Button>Abrir modal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar al grupo</DialogTitle>
          <DialogDescription>Entran con Google y escriben el código.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Card variant="yellow" padding="md">
            <Eyebrow>Código</Eyebrow>
            <Text mono size="xl" weight="bold" className="tracking-[0.3em]">DEMO4A</Text>
          </Card>
        </DialogBody>
        <DialogFooter>
          <Button>Copiar el link</Button>
          <Button variant="ghost">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
