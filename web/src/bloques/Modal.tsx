import type { ReactNode } from 'react'
import { Dialog } from '@/ui'

// Envoltorio fino sobre el Dialog compuesto del kit.
export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie, ancho = 480 }: { abierto: boolean; onCerrar: () => void; titulo: string; descripcion?: string; children: ReactNode; pie?: ReactNode; ancho?: number }) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content style={{ maxWidth: ancho }}>
          <Dialog.Header>
            <Dialog.Title>{titulo}</Dialog.Title>
            {descripcion && <Dialog.Description>{descripcion}</Dialog.Description>}
          </Dialog.Header>
          <Dialog.Body>{children}</Dialog.Body>
          {pie && <Dialog.Footer>{pie}</Dialog.Footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <p className="font-medium">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-ink-muted">{texto}</p>}
      {accion}
    </div>
  )
}
