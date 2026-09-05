import { AlertDialog, Button } from '@melu/ui'

export default function Demo() {
  return (
    <AlertDialog
      trigger={<Button variant="destructive">Borrar la actividad</Button>}
      title="¿Borrar «Puente de espagueti»?"
      description="Se borra para vos y para los guías de tu espacio. Las entregas que ya llegaron se conservan."
      confirmLabel="Borrar"
      tone="danger"
      onConfirm={() => {}}
    />
  )
}
