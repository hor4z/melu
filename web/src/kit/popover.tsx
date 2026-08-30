import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { FloatingFocusManager, FloatingPortal, autoUpdate, flip, offset, shift, useClick, useDismiss, useFloating, useInteractions, useRole, type Placement } from '@floating-ui/react'
import { cn, Slot, useControllableState } from './lib'

type Ctx = {
  abierto: boolean
  setAbierto: (v: boolean) => void
  refs: ReturnType<typeof useFloating>['refs']
  floatingStyles: React.CSSProperties
  posicionado: boolean
  context: ReturnType<typeof useFloating>['context']
  getReferenceProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getFloatingProps: (u?: Record<string, unknown>) => Record<string, unknown>
}
const PopoverCtx = createContext<Ctx | null>(null)
const usePopoverCtx = () => {
  const c = useContext(PopoverCtx)
  if (!c) throw new Error('Usá los componentes de Popover dentro de <Popover>')
  return c
}

export function Popover({ children, open, defaultOpen = false, onOpenChange, placement = 'bottom-start' }: { children: ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?: (v: boolean) => void; placement?: Placement }) {
  const [abierto, setAbierto] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: abierto, onOpenChange: setAbierto, placement, whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([useClick(context), useDismiss(context), useRole(context, { role: 'dialog' })])
  return <PopoverCtx.Provider value={{ abierto, setAbierto, refs, floatingStyles, context, posicionado: isPositioned, getReferenceProps, getFloatingProps }}>{children}</PopoverCtx.Provider>
}

export function PopoverTrigger({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const p = usePopoverCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp ref={p.refs.setReference} data-state={p.abierto ? 'open' : 'closed'} {...p.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

export function PopoverContent({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const p = usePopoverCtx()
  if (!p.abierto) return null
  return (
    <FloatingPortal>
      <FloatingFocusManager context={p.context} modal={false} returnFocus disabled={!p.posicionado}>
        <div ref={p.refs.setFloating} style={{ ...p.floatingStyles, visibility: p.posicionado ? undefined : 'hidden' }} data-state="open"
          className={cn('kit-pop z-50 rounded-xl border border-line bg-surface p-4 shadow-lg outline-none', className)}
          {...p.getFloatingProps(props as Record<string, unknown>)}>
          {children}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  )
}
export function PopoverClose({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const p = usePopoverCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp onClick={() => p.setAbierto(false)} {...props}>{children}</Cmp>
}
