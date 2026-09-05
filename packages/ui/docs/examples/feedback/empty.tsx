import { Button, EmptyState, Icon } from '@melu/ui'
import { Users } from 'lucide-react'

export default function Demo() {
  return (
    <EmptyState
      icon={<Icon icon={Users} size={40} color="subtle" />}
      title="Todavía nadie se unió"
      description="Compartí el código del grupo o el QR. Entran con Google y aparecen acá."
      actions={<><Button>Invitar</Button><Button variant="ghost">Ver el código</Button></>}
    />
  )
}
