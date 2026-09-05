import { Icon, IconButton } from '@melu/ui'
import { Check, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <IconButton label="Buscar" icon={<Icon icon={Search} size="lg" />} />
      <IconButton label="Editar" variant="outline" icon={<Icon icon={Pencil} size="lg" />} />
      <IconButton label="Más opciones" variant="subtle" icon={<Icon icon={MoreHorizontal} size="lg" />} />
      <IconButton label="Guardar" variant="primary" shape="circle" icon={<Icon icon={Check} size="lg" />} />
      <IconButton label="Borrar" variant="destructive" icon={<Icon icon={Trash2} size="lg" />} />
    </>
  )
}
