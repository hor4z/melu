import { createContext, useContext, useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { FloatingFocusManager, FloatingNode, FloatingOverlay, useClick, useDismiss, useFloating, useFloatingNodeId, useInteractions, useRole } from '@floating-ui/react'
import { Portal } from './portal'
import { X } from 'lucide-react'
import { cn, Slot, useControllableState } from './lib'
import { Icon } from './icon'
import { IconButton } from './icon-button'

type Ctx = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  refs: ReturnType<typeof useFloating>['refs']
  context: ReturnType<typeof useFloating>['context']
  getReferenceProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getFloatingProps: (u?: Record<string, unknown>) => Record<string, unknown>
  titleId: string
  descId: string
  nodeId: string | undefined
}
const DialogCtx = createContext<Ctx | null>(null)
const useDialogCtx = () => {
  const c = useContext(DialogCtx)
  if (!c) throw new Error('Usá los componentes de Dialog dentro de <Dialog>')
  return c
}

export interface DialogProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (v: boolean) => void
  /** `required` blocks closing with Escape or an outside click: only the buttons close it. */
  purpose?: 'info' | 'form' | 'required'
}

export function Dialog({ children, open, defaultOpen = false, onOpenChange, purpose = 'info' }: DialogProps) {
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const nodeId = useFloatingNodeId()
  const { refs, context } = useFloating({ nodeId, open: isOpen, onOpenChange: setIsOpen })

  // A modal controlled from outside has no trigger to give focus back to.
  // While it is closed we keep noting who has focus; on close, we give it back.
  // (Reading it on open is no good: by then floating-ui already moved focus inside.)
  const previous = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(isOpen)
  // This effect goes first on purpose: it has to read `previous` before the one below overwrites it.
  useEffect(() => {
    const wasClosed = wasOpen.current && !isOpen
    wasOpen.current = isOpen
    if (!wasClosed) return
    const el = previous.current
    if (el?.isConnected) requestAnimationFrame(() => el.focus({ preventScroll: true }))
  }, [isOpen])
  useEffect(() => {
    if (isOpen) return
    const note = () => { previous.current = document.activeElement as HTMLElement | null }
    document.addEventListener('focusin', note)
    return () => document.removeEventListener('focusin', note)
  }, [isOpen])
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context, { outsidePress: purpose === 'info', escapeKey: purpose !== 'required', bubbles: false, outsidePressEvent: 'mousedown' }),
    useRole(context),
  ])
  const base = context.floatingId
  return (
    <DialogCtx.Provider value={{ isOpen, setIsOpen, refs, context, getReferenceProps, getFloatingProps, titleId: `${base}-t`, descId: `${base}-d`, nodeId }}>
      {children}
    </DialogCtx.Provider>
  )
}

export function DialogTrigger({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const d = useDialogCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp ref={d.refs.setReference} {...d.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[calc(100vw-2rem)]' }

export function DialogContent({ className, children, size = 'md', ...props }: ComponentPropsWithoutRef<'div'> & { size?: keyof typeof WIDTHS }) {
  const d = useDialogCtx()
  if (!d.isOpen) return null
  return (
    <FloatingNode id={d.nodeId}>
    <Portal>
      <FloatingOverlay lockScroll data-state="open" className="ui-fade z-50 grid place-items-center bg-[var(--overlay)] p-4">
        <FloatingFocusManager context={d.context} returnFocus={false} initialFocus={0}>
          <div ref={d.refs.setFloating} aria-labelledby={d.titleId} aria-describedby={d.descId} data-state="open"
            className={cn('ui-pop flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg outline-none', WIDTHS[size], className)}
            {...d.getFloatingProps(props as Record<string, unknown>)}>
            {children}
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </Portal>
    </FloatingNode>
  )
}

export function DialogHeader({ className, children, showClose = true, ...props }: ComponentPropsWithoutRef<'div'> & { showClose?: boolean }) {
  const d = useDialogCtx()
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)} {...props}>
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
      {showClose && <IconButton label="Cerrar" size="sm" icon={<Icon icon={X} size="lg" />} onClick={() => d.setIsOpen(false)} />}
    </div>
  )
}
export function DialogTitle({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  const d = useDialogCtx()
  return <h2 id={d.titleId} className={cn('font-display text-lg font-semibold tracking-tight', className)} {...props} />
}
export function DialogDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  const d = useDialogCtx()
  return <p id={d.descId} className={cn('text-sm text-ink-muted', className)} {...props} />
}
export function DialogBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
}
export function DialogFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5', className)} {...props} />
}
export function DialogClose({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const d = useDialogCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp onClick={() => d.setIsOpen(false)} {...props}>{children}</Cmp>
}
