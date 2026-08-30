import { createContext, useContext, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { FloatingPortal, autoUpdate, flip, offset, shift, useDismiss, useFloating, useFocus, useHover, useInteractions, useRole, type Placement } from '@floating-ui/react'
import { cn, Slot } from './lib'

type Ctx = {
  abierto: boolean
  refs: ReturnType<typeof useFloating>['refs']
  floatingStyles: React.CSSProperties
  getReferenceProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getFloatingProps: (u?: Record<string, unknown>) => Record<string, unknown>
}
const TooltipCtx = createContext<Ctx | null>(null)
const useTooltipCtx = () => {
  const c = useContext(TooltipCtx)
  if (!c) throw new Error('Usá los componentes de Tooltip dentro de <Tooltip>')
  return c
}

export function Tooltip({ children, placement = 'top', delay = 200 }: { children: ReactNode; placement?: Placement; delay?: number }) {
  const [abierto, setAbierto] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open: abierto, onOpenChange: setAbierto, placement, whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false, delay: { open: delay, close: 0 } }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
  ])
  return <TooltipCtx.Provider value={{ abierto, refs, floatingStyles, getReferenceProps, getFloatingProps }}>{children}</TooltipCtx.Provider>
}

export function TooltipTrigger({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'span'> & { asChild?: boolean }) {
  const t = useTooltipCtx()
  const Cmp = asChild ? Slot : 'span'
  return <Cmp ref={t.refs.setReference} {...t.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

export function TooltipContent({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const t = useTooltipCtx()
  if (!t.abierto) return null
  return (
    <FloatingPortal>
      <div ref={t.refs.setFloating} style={t.floatingStyles} data-state="open"
        className={cn('kit-fade z-50 max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-md', className)}
        {...t.getFloatingProps(props as Record<string, unknown>)}>
        {children}
      </div>
    </FloatingPortal>
  )
}
