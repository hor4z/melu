import type { ReactNode } from 'react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyState } from '@/kit'

/** Envoltorio fino sobre el Dialog del kit, para los modales controlados de la app. */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie, ancho = 480 }: {
  abierto: boolean; onCerrar: () => void; titulo: string; descripcion?: string; children: ReactNode; pie?: ReactNode; ancho?: number
}) {
  const size = ancho >= 640 ? 'lg' : ancho >= 520 ? 'md' : 'sm'
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()} purpose="form">
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {pie && <DialogFooter>{pie}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return <EmptyState title={titulo} description={texto} actions={accion} />
}
