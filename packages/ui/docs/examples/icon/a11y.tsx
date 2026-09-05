import { Button, Icon, IconButton, Text } from '@melu/ui'
import { Send, Trash2 } from 'lucide-react'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-3">
      {/* Con texto al lado: el ícono no se anuncia, y así está bien. */}
      <span className="flex items-center gap-3">
        <Button startIcon={<Icon icon={Send} size="sm" />}>Enviar</Button>
        <Text size="sm" variant="muted">se anuncia «Enviar», una sola vez</Text>
      </span>
      {/* Sin texto: el nombre lo pone IconButton, que exige `label`. */}
      <span className="flex items-center gap-3">
        <IconButton label="Borrar la actividad" variant="ghost" icon={<Icon icon={Trash2} size="lg" />} />
        <Text size="sm" variant="muted">se anuncia «Borrar la actividad»</Text>
      </span>
    </div>
  )
}
