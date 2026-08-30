import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { FloatingFocusManager, FloatingNode, autoUpdate, flip, offset, shift, size as sizeMw, useClick, useDismiss, useFloating, useFloatingNodeId, useInteractions, useRole, type Placement } from '@floating-ui/react'
import { Portal } from './portal'
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
  nodeId: string | undefined
}
const PopoverCtx = createContext<Ctx | null>(null)
const usePopoverCtx = () => {
  const c = useContext(PopoverCtx)
  if (!c) throw new Error('Usá los componentes de Popover dentro de <Popover>')
  return c
}

export function Popover({ children, open, defaultOpen = false, onOpenChange, placement = 'bottom-start', role = 'dialog' }: {
  children: ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?: (v: boolean) => void; placement?: Placement; role?: 'dialog' | 'menu' | 'listbox'
}) {
  const [abierto, setAbierto] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const nodeId = useFloatingNodeId()
  const { refs, floatingStyles, context, isPositioned } = useFloating({
    nodeId, open: abierto, onOpenChange: setAbierto, placement, whileElementsMounted: autoUpdate,
    middleware: [
      offset(6), flip({ padding: 8 }), shift({ padding: 8 }),
      sizeMw({ padding: 8, apply({ availableHeight, elements }) { elements.floating.style.maxHeight = `${Math.max(160, availableHeight)}px` } }),
    ],
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([useClick(context), useDismiss(context, { bubbles: false }), useRole(context, { role })])
  return <PopoverCtx.Provider value={{ abierto, setAbierto, refs, floatingStyles, context, posicionado: isPositioned, getReferenceProps, getFloatingProps, nodeId }}>{children}</PopoverCtx.Provider>
}

/** Ancla el panel a un elemento sin convertirlo en disparador: el que abre es otro (por ejemplo, tipear «/»). */
export function PopoverAnchor({ children }: { children: ReactNode }) {
  const p = usePopoverCtx()
  return <Slot ref={p.refs.setReference}>{children}</Slot>
}

export function PopoverTrigger({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const p = usePopoverCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp ref={p.refs.setReference} data-state={p.abierto ? 'open' : 'closed'} {...p.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

export function PopoverContent({ className, children, manageFocus = true, ...props }: ComponentPropsWithoutRef<'div'> & { manageFocus?: boolean }) {
  const p = usePopoverCtx()
  if (!p.abierto) return null
  const panel = (
    <div ref={p.refs.setFloating} style={{ ...p.floatingStyles, visibility: p.posicionado ? undefined : 'hidden' }} data-state="open"
      className={cn('kit-pop z-50 overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-lg outline-none', className)}
      {...p.getFloatingProps(props as Record<string, unknown>)}>
      {children}
    </div>
  )
  return (
    <FloatingNode id={p.nodeId}>
      <Portal>
        {/* `manageFocus={false}` deja el foco donde estaba: sirve cuando se abre tipeando en otro campo. */}
        {manageFocus
          ? <FloatingFocusManager context={p.context} modal={false} returnFocus disabled={!p.posicionado}>{panel}</FloatingFocusManager>
          : panel}
      </Portal>
    </FloatingNode>
  )
}
export function PopoverClose({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const p = usePopoverCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp onClick={() => p.setAbierto(false)} {...props}>{children}</Cmp>
}
