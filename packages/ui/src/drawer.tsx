// El panel lateral. Es el mismo modal que Dialog —la trampa de foco, el bloqueo del scroll y
// la devolución del foco al cerrar salen de ahí— con otra presentación: pegado a un borde y
// entrando desde afuera. Por eso sus partes son literalmente las de Dialog: la cabecera, el
// cuerpo y el pie de un panel no tienen por qué ser otra cosa.
import type { ComponentPropsWithoutRef } from 'react'
import { FloatingFocusManager, FloatingNode, FloatingOverlay } from '@floating-ui/react'
import { Portal } from './portal'
import { cn } from './lib'
import {
  Dialog, DialogBody, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DialogTrigger, useDialogCtx, type DialogProps,
} from './dialog'

/** A panel stuck to an edge. Its parts are Dialog's, renamed so the call site reads right. */
export function Drawer(props: DialogProps) {
  return <Dialog {...props} />
}

export {
  DialogTrigger as DrawerTrigger,
  DialogHeader as DrawerHeader,
  DialogTitle as DrawerTitle,
  DialogDescription as DrawerDescription,
  DialogBody as DrawerBody,
  DialogFooter as DrawerFooter,
  DialogClose as DrawerClose,
}

const SIDES = {
  right: 'ui-slide-right inset-y-0 right-0 h-full border-l',
  left: 'ui-slide-left inset-y-0 left-0 h-full border-r',
  bottom: 'ui-slide-bottom inset-x-0 bottom-0 w-full max-h-[85dvh] rounded-t-xl border-t',
}
const WIDTHS = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl' }

export function DrawerContent({
  className, children, side = 'right', size = 'md', ...props
}: ComponentPropsWithoutRef<'div'> & { side?: keyof typeof SIDES; size?: keyof typeof WIDTHS }) {
  const d = useDialogCtx()
  if (!d.isOpen) return null
  return (
    <FloatingNode id={d.nodeId}>
      <Portal>
        {/* Sin `p-4`: a diferencia del modal, el panel toca los bordes de la pantalla. */}
        <FloatingOverlay lockScroll data-state="open" className="ui-fade z-50 bg-[var(--overlay)]">
          <FloatingFocusManager context={d.context} returnFocus={false} initialFocus={0}>
            <div ref={d.refs.setFloating} aria-labelledby={d.titleId} aria-describedby={d.descId} data-state="open"
              className={cn(
                'fixed flex w-full flex-col overflow-hidden border-line bg-surface shadow-lg outline-none',
                SIDES[side], side !== 'bottom' && WIDTHS[size], className,
              )}
              {...d.getFloatingProps(props as Record<string, unknown>)}>
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      </Portal>
    </FloatingNode>
  )
}
