import type { ReactNode } from 'react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyState } from '@/kit'

/** Thin wrapper over the kit's Dialog, for the app's controlled modals. */
export function Modal({ isOpen, onClose, title, description, children, footer, boxWidth = 480 }: {
  isOpen: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; boxWidth?: number
}) {
  const size = boxWidth >= 640 ? 'lg' : boxWidth >= 520 ? 'md' : 'sm'
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()} purpose="form">
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return <EmptyState title={title} description={text} actions={action} />
}
