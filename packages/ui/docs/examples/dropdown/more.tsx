import { Icon, MoreMenu } from '@melu/ui'
import { Copy, Pencil, Share2, Trash2 } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <MoreMenu items={[
        { label: 'Editar', icon: <Icon icon={Pencil} size="sm" /> },
        { label: 'Duplicar', icon: <Icon icon={Copy} size="sm" /> },
        { label: 'Compartir', icon: <Icon icon={Share2} size="sm" /> },
        { label: 'Eliminar', icon: <Icon icon={Trash2} size="sm" />, destructive: true, separatorBefore: true },
      ]} />
      <MoreMenu orientation="vertical" variant="outline" items={[{ label: 'Ver detalle' }, { label: 'Archivar' }]} />
    </>
  )
}
