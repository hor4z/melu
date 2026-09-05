// La confirmación. Es un Dialog con la forma fija —título, explicación, cancelar y confirmar—
// porque esa forma no varía nunca: darla por props evita que cada pantalla la vuelva a armar
// y la arme distinto. Es la misma decisión que MoreMenu sobre DropdownMenu.
//
// Tres diferencias con un Dialog cualquiera, y las tres son de accesibilidad:
// el rol es `alertdialog`, un clic afuera no lo cierra —una confirmación se responde— y el
// foco entra en Cancelar, que es la salida segura cuando lo que se confirma es destructivo.
import { useRef, type ReactNode } from 'react'
import { Button } from './button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './dialog'

export interface AlertDialogProps {
  /** What opens the confirmation. Without it, control it from outside with `open`. */
  trigger?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (v: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Extra content between the explanation and the buttons. Rarely needed. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** `danger` paints the confirm button red: something is deleted, removed or lost. */
  tone?: 'default' | 'danger'
  /** Spins the button while the action travels, and blocks closing. */
  loading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

export function AlertDialog({
  trigger, open, defaultOpen, onOpenChange, title, description, children,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'default', loading = false,
  onConfirm, onCancel,
}: AlertDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} purpose={loading ? 'required' : 'form'}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent role="alertdialog" size="sm" initialFocus={cancelRef}>
        <DialogHeader showClose={false}>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
        <DialogFooter>
          <Button ref={cancelRef} variant="ghost" disabled={loading} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'destructive' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
