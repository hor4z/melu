import { createContext, useContext, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import {
  FloatingFocusManager, FloatingList, FloatingNode, autoUpdate, flip, offset, shift, size as sizeMw,
  useClick, useDismiss, useFloating, useFloatingNodeId, useInteractions, useListItem, useListNavigation, useRole, useTypeahead,
  type Placement,
} from '@floating-ui/react'
import { Portal } from './portal'
import { Check, MoreHorizontal, MoreVertical } from 'lucide-react'
import { cn, Slot, useControllableState } from './lib'
import { Icon } from './icon'
import { IconButton } from './icon-button'

type Ctx = {
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  activeIndex: number | null
  getItemProps: (u?: Record<string, unknown>) => Record<string, unknown>
  refs: ReturnType<typeof useFloating>['refs']
  floatingStyles: React.CSSProperties
  positioned: boolean
  context: ReturnType<typeof useFloating>['context']
  getReferenceProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getFloatingProps: (u?: Record<string, unknown>) => Record<string, unknown>
  elementsRef: React.RefObject<(HTMLElement | null)[]>
  labelsRef: React.RefObject<(string | null)[]>
  nodeId: string | undefined
}
const MenuCtx = createContext<Ctx | null>(null)
const useMenuCtx = () => {
  const c = useContext(MenuCtx)
  if (!c) throw new Error('Usá los componentes de DropdownMenu dentro de <DropdownMenu>')
  return c
}

export interface DropdownMenuProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (v: boolean) => void
  placement?: Placement
}

export function DropdownMenu({ children, open, defaultOpen = false, onOpenChange, placement = 'bottom-start' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const elementsRef = useRef<(HTMLElement | null)[]>([])
  const labelsRef = useRef<(string | null)[]>([])
  const nodeId = useFloatingNodeId()

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    nodeId, open: isOpen, onOpenChange: setIsOpen, placement, whileElementsMounted: autoUpdate,
    middleware: [
      offset(6), flip({ padding: 8 }), shift({ padding: 8 }),
      sizeMw({ padding: 8, apply({ availableHeight, elements }) { elements.floating.style.maxHeight = `${Math.max(160, availableHeight)}px` } }),
    ],
  })
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context),
    // `bubbles: false`: closing this menu must not also close the modal containing it.
    useDismiss(context, { bubbles: false }),
    useRole(context, { role: 'menu' }),
    useListNavigation(context, { listRef: elementsRef, activeIndex, onNavigate: setActiveIndex, loop: true }),
    useTypeahead(context, { listRef: labelsRef, activeIndex, onMatch: setActiveIndex, enabled: isOpen }),
  ])

  return (
    <MenuCtx.Provider value={{ isOpen, setIsOpen, activeIndex, getItemProps, refs, floatingStyles, context, positioned: isPositioned, getReferenceProps, getFloatingProps, elementsRef, labelsRef, nodeId }}>
      {children}
    </MenuCtx.Provider>
  )
}

export function DropdownMenuTriggerBase({ children, asChild = true, ...props }: ComponentPropsWithoutRef<'button'> & { asChild?: boolean }) {
  const m = useMenuCtx()
  const Cmp = asChild ? Slot : 'button'
  return <Cmp ref={m.refs.setReference} data-state={m.isOpen ? 'open' : 'closed'} {...m.getReferenceProps(props as Record<string, unknown>)}>{children}</Cmp>
}

export const DropdownMenuTrigger = DropdownMenuTriggerBase

export function DropdownMenuContent({ className, children, minWidth = 200, ...props }: ComponentPropsWithoutRef<'div'> & { minWidth?: number }) {
  const m = useMenuCtx()
  if (!m.isOpen) return null
  return (
    <FloatingNode id={m.nodeId}>
    <Portal>
      <FloatingFocusManager context={m.context} modal={false} initialFocus={-1} returnFocus disabled={!m.positioned}>
        <div ref={m.refs.setFloating} style={{ ...m.floatingStyles, minWidth, visibility: m.positioned ? undefined : 'hidden' }} data-state="open"
          className={cn('kit-pop z-50 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg outline-none', className)}
          {...m.getFloatingProps(props as Record<string, unknown>)}>
          <FloatingList elementsRef={m.elementsRef} labelsRef={m.labelsRef}>{children}</FloatingList>
        </div>
      </FloatingFocusManager>
    </Portal>
    </FloatingNode>
  )
}

export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<'div'> {
  /** Text for type-ahead search. If the children are not plain text, pass it by hand. */
  label?: string
  icon?: ReactNode
  shortcut?: string
  destructive?: boolean
  disabled?: boolean
  /** Keeps the menu open on pick: useful for options that get checked. */
  keepOpen?: boolean
}

export function DropdownMenuItem({ className, children, label, icon, shortcut, destructive, disabled, keepOpen, onClick, ...props }: DropdownMenuItemProps) {
  const m = useMenuCtx()
  const { ref, index } = useListItem({ label: disabled ? null : (label ?? (typeof children === 'string' ? children : undefined)) })
  const isOn = m.activeIndex === index
  return (
    <div ref={ref} role="menuitem" tabIndex={isOn ? 0 : -1} aria-disabled={disabled}
      className={cn('flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none',
        destructive ? 'text-danger' : 'text-ink',
        isOn && !disabled && (destructive ? 'bg-danger-subtle' : 'bg-hover'),
        disabled && 'pointer-events-none opacity-45', className)}
      {...m.getItemProps({
        ...props,
        onClick: (e: React.MouseEvent<HTMLDivElement>) => { if (disabled) return; onClick?.(e); if (!keepOpen) m.setIsOpen(false) },
      })}>
      {icon && <span className="text-ink-subtle">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <kbd className="font-mono text-[11px] text-ink-subtle">{shortcut}</kbd>}
    </div>
  )
}

export function DropdownMenuCheckboxItem({ checked, children, ...props }: DropdownMenuItemProps & { checked?: boolean }) {
  return (
    <DropdownMenuItem keepOpen role="menuitemcheckbox" aria-checked={checked}
      icon={<span className="grid size-4 place-items-center">{checked && <Icon icon={Check} size="sm" />}</span>} {...props}>
      {children}
    </DropdownMenuItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-subtle', className)} {...props} />
}
export function DropdownMenuSeparator({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div role="separator" className={cn('-mx-1.5 my-1.5 h-px bg-line', className)} {...props} />
}
export function DropdownMenuGroup({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div role="group" className={cn('flex flex-col', className)} {...props} />
}

export type MenuOption = { label: string; icon?: ReactNode; onSelect?: () => void; destructive?: boolean; disabled?: boolean; separatorBefore?: boolean }

/** The three-dot menu: the “more actions” gesture on a row or a card. */
DropdownMenu.Trigger = DropdownMenuTriggerBase
DropdownMenu.Content = DropdownMenuContent
DropdownMenu.Item = DropdownMenuItem
DropdownMenu.Label = DropdownMenuLabel
DropdownMenu.Separator = DropdownMenuSeparator

export function MoreMenu({ items, label = 'Más acciones', orientation = 'horizontal', placement = 'bottom-end', size = 'md', variant = 'ghost' }: {
  items: MenuOption[]; label?: string; orientation?: 'horizontal' | 'vertical'; placement?: Placement
  size?: 'sm' | 'md' | 'lg'; variant?: 'ghost' | 'outline' | 'subtle'
}) {
  return (
    <DropdownMenu placement={placement}>
      <DropdownMenuTrigger>
        <IconButton label={label} size={size} variant={variant} icon={<Icon icon={orientation === 'vertical' ? MoreVertical : MoreHorizontal} size="lg" />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((it) => (
          <div key={it.label}>
            {it.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem icon={it.icon} destructive={it.destructive} disabled={it.disabled} onClick={it.onSelect}>{it.label}</DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
