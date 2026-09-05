import { Badge, Icon, IconButton } from '@melu/ui'
import { Bell } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <Badge>3</Badge>
      <Badge color="success">Nuevo</Badge>
      <span className="relative inline-flex">
        <IconButton label="Notificaciones" variant="ghost" icon={<Icon icon={Bell} size="lg" />} />
        <Badge className="absolute -right-1 -top-1">5</Badge>
      </span>
    </>
  )
}
