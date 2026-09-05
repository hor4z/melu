import { useState } from 'react'
import { AlertDialog, Button } from '@melu/ui'

export default function Demo() {
  const [sending, setSending] = useState(false)
  return (
    <AlertDialog
      trigger={<Button variant="secondary">Confirmar algo que viaja</Button>}
      title="¿Cerrar la entrega?"
      description="Nadie más va a poder entregar después de esto."
      confirmLabel="Cerrar la entrega"
      loading={sending}
      onConfirm={() => { setSending(true); setTimeout(() => setSending(false), 1600) }}
    />
  )
}
