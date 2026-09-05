import { Button, ButtonGroup, Icon } from '@melu/ui'
import { Copy, Pencil, Share2 } from 'lucide-react'

export default function Demo() {
  return (
    <ButtonGroup>
      <Button variant="outline" startIcon={<Icon icon={Pencil} size="sm" />}>Editar</Button>
      <Button variant="outline" startIcon={<Icon icon={Copy} size="sm" />}>Duplicar</Button>
      <Button variant="outline" startIcon={<Icon icon={Share2} size="sm" />}>Compartir</Button>
    </ButtonGroup>
  )
}
