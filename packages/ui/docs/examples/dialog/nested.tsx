import { Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@melu/ui'

export default function Demo() {
  return (
    <Dialog>
      <DialogTrigger><Button variant="outline">Un select adentro</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Asignar la actividad</DialogTitle></DialogHeader>
        <DialogBody>
          {/* Escape con la lista abierta cierra la lista; el modal se queda. Eso lo resuelve
              el FloatingTree que envuelve la app. */}
          <Field label="Grupo" description="Probá Escape con la lista abierta.">
            <Select defaultValue="a">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a">4° A · Matemática</SelectItem>
                <SelectItem value="b">Taller de robótica</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
