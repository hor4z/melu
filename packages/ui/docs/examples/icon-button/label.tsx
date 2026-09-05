import { Icon, IconButton, Text } from '@melu/ui'
import { Trash2 } from 'lucide-react'

export default function Demo() {
  return (
    <>
      {/* `label` es el nombre accesible y el title: una sola prop resuelve las dos cosas. */}
      <IconButton label="Borrar la actividad" variant="ghost" icon={<Icon icon={Trash2} size="lg" />} />
      <Text size="sm" variant="muted">Pasá el mouse, o navegá con Tab y escuchá el lector.</Text>
    </>
  )
}
