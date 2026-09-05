import { createContext, useContext, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { FloatingNode, autoUpdate, flip, offset, shift, useDismiss, useFloating, useFloatingNodeId, useFocus, useHover, useInteractions, useRole, type Placement } from '@floating-ui/react'
import { Portal } from './portal'
import { cn, Slot } from './lib'

type Ctx = {
  isOpen: boolean
  refs: ReturnType<typeof useFloating>['refs']
  floatingStyles: React.CSSProperties
  getReferenceProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getFloatingProps: (u?: Record<string, unknown>) => Record<string, unknown>
  nodeId: string | undefined
}
const TooltipCtx = createContext<Ctx | null>(null)
const useTooltipCtx = () => {
  const c = useContext(TooltipCtx)
  if (!c) throw new Error('Usá los componentes de Tooltip dentro de <Tooltip>')
  return c
}

export function Tooltip({ children, placement = 'top', delay = 200 }: { children: ReactNode; placement?: Placement; delay?: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const nodeId = useFloatingNodeId()
  const { refs, floatingStyles, context } = useFloating({
    nodeId, open: isOpen, onOpenChange: setIsOpen, placement, whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false, delay: { open: delay, close: 0 } }),
    useFocus(context),
    useDismiss(context, { bubbles: false }),
    useRole(context, { role: 'tooltip' }),
  ])
  return <TooltipCtx.Provider value={{ isOpen, refs, floatingStyles, getReferenceProps, getFloatingProps, nodeId }}>{children}</TooltipCtx.Provider>
}

export function TooltipTrigger({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'span'> & { asChild?: boolean }) {
  const t = useTooltipCtx()
  const Cmp = asChild ? Slot : 'span'
  return <Cmp ref={t.refs.setReference} {...t.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

export function TooltipContent({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const t = useTooltipCtx()
  if (!t.isOpen) return null
  return (
    <FloatingNode id={t.nodeId}>
    <Portal>
      <div ref={t.refs.setFloating} style={t.floatingStyles} data-state="open"
        className={cn('kit-fade z-50 max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-md', className)}
        {...t.getFloatingProps(props as Record<string, unknown>)}>
        {children}
      </div>
    </Portal>
    </FloatingNode>
  )
}
