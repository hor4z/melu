import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { FloatingFocusManager, FloatingNode, autoUpdate, flip, offset, shift, size as sizeMw, useClick, useDismiss, useFloating, useFloatingNodeId, useInteractions, useRole, type Placement } from '@floating-ui/react'
import { Portal } from './portal'
import { cn, Slot, useControllableState } from './lib'

type Ctx = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  refs: ReturnType<typeof useFloating>['refs']
  floatingStyles: React.CSSProperties
  positioned: boolean
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
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const nodeId = useFloatingNodeId()
  const { refs, floatingStyles, context, isPositioned } = useFloating({
    nodeId, open: isOpen, onOpenChange: setIsOpen, placement, whileElementsMounted: autoUpdate,
    middleware: [
      offset(6), flip({ padding: 8 }), shift({ padding: 8 }),
      sizeMw({ padding: 8, apply({ availableHeight, elements }) { elements.floating.style.maxHeight = `${Math.max(160, availableHeight)}px` } }),
    ],
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([useClick(context), useDismiss(context, { bubbles: false }), useRole(context, { role })])
  return <PopoverCtx.Provider value={{ isOpen, setIsOpen, refs, floatingStyles, context, positioned: isPositioned, getReferenceProps, getFloatingProps, nodeId }}>{children}</PopoverCtx.Provider>
}

/** Anchors the panel to an element without making it a trigger: something else opens it (typing "/", say). */
export function PopoverAnchor({ children }: { children: ReactNode }) {
  const p = usePopoverCtx()
  return <Slot ref={p.refs.setReference}>{children}</Slot>
}

export function PopoverTrigger({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const p = usePopoverCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp ref={p.refs.setReference} data-state={p.isOpen ? 'open' : 'closed'} {...p.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

export function PopoverContent({ className, children, manageFocus = true, ...props }: ComponentPropsWithoutRef<'div'> & { manageFocus?: boolean }) {
  const p = usePopoverCtx()
  if (!p.isOpen) return null
  const panel = (
    <div ref={p.refs.setFloating} style={{ ...p.floatingStyles, visibility: p.positioned ? undefined : 'hidden' }} data-state="open"
      className={cn('ui-pop z-50 overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-lg outline-none', className)}
      {...p.getFloatingProps(props as Record<string, unknown>)}>
      {children}
    </div>
  )
  return (
    <FloatingNode id={p.nodeId}>
      <Portal>
        {/* `manageFocus={false}` leaves focus where it was: useful when it opens while typing in another field. */}
        {manageFocus
          ? <FloatingFocusManager context={p.context} modal={false} returnFocus disabled={!p.positioned}>{panel}</FloatingFocusManager>
          : panel}
      </Portal>
    </FloatingNode>
  )
}
export function PopoverClose({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const p = usePopoverCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp onClick={() => p.setIsOpen(false)} {...props}>{children}</Cmp>
}
