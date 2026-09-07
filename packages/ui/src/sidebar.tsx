import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn, focusRing, Slot, Slottable, useControllableState } from './lib'
import { Icon } from './icon'
import { IconButton } from './icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

type Ctx = { expanded: boolean; setExpanded: (v: boolean) => void }
const SidebarCtx = createContext<Ctx | null>(null)
const useSidebar = () => {
  const c = useContext(SidebarCtx)
  if (!c) throw new Error('Usá los componentes de Sidebar dentro de <Sidebar>')
  return c
}

export interface SidebarProps extends Omit<ComponentPropsWithoutRef<'aside'>, 'onChange'> {
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

/**
 * The rail on the side, in parts. Folded it is icons; unfolded, icons with their names.
 *
 * It does not remember on its own: whoever uses it holds the state, because where that is kept
 * (the url, a preference, nothing) is a decision of the app and not of the rail.
 *
 * The width is not animated, and that is the point. Sliding it means the page beside it reflows
 * on every frame: a table recomputes its columns sixty times and the text jitters, which reads
 * as a glitch and not as a movement. Folding is a change of state, not a trip.
 */
export function Sidebar({ expanded, defaultExpanded = true, onExpandedChange, className, children, ...props }: SidebarProps) {
  const [open, setOpen] = useControllableState({ value: expanded, defaultValue: defaultExpanded, onChange: onExpandedChange })
  return (
    <SidebarCtx.Provider value={{ expanded: open, setExpanded: setOpen }}>
      <aside
        data-expanded={open || undefined}
        className={cn(
          // `overflow-hidden`: doblado, los nombres siguen en el DOM y son más anchos que el
          // riel. Sin recortarlos, se desbordaban y aparecía una barra de scroll horizontal.
          'sticky top-0 flex h-screen shrink-0 flex-col gap-2 overflow-hidden border-r border-line bg-surface',
          open ? 'w-56' : 'w-16',
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </SidebarCtx.Provider>
  )
}

/**
 * What goes on top: the logo on one side and the fold button on the other. Folded, only the
 * button is left, centred: sixty-four pixels do not fit a brand and a control, and of the two
 * the one that has to be reachable is the control.
 */
export function SidebarHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  const { expanded } = useSidebar()
  return (
    <div
      className={cn('flex h-16 shrink-0 items-center gap-2', expanded ? 'justify-between px-4' : 'justify-center px-2', className)}
      {...props}
    />
  )
}

export function SidebarNav({ className, ...props }: ComponentPropsWithoutRef<'nav'>) {
  const { expanded } = useSidebar()
  // `overflow-x-hidden` a mano: con solo `overflow-y-auto`, el eje horizontal se calcula en
  // `auto` y el nombre que asoma mientras el riel está doblado dibuja una barra de scroll.
  return <nav className={cn('flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden pb-3', expanded ? 'px-3' : 'px-2', className)} {...props} />
}

/** The heading of a stretch of the nav. Folded it stays for whoever listens and stops taking room. */
export function SidebarLabel({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  const { expanded } = useSidebar()
  return (
    <p
      className={cn('px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-ink-subtle', !expanded && 'sr-only', className)}
      {...props}
    />
  )
}

export interface SidebarItemProps extends Omit<ComponentPropsWithoutRef<'a'>, 'children'> {
  /** The name. Folded it stays as the accessible name and comes back as a tooltip. */
  label: ReactNode
  icon?: ReactNode
  /** Lends the styles to a router link, which is what this almost always is. */
  asChild?: boolean
  children?: ReactNode
}

/**
 * One destination. The active one paints itself off `aria-current="page"`, which a router link
 * already sets: that way the rail does not need to know which router it is living in.
 */
export function SidebarItem({ label, icon, asChild, className, children, ...props }: SidebarItemProps) {
  const { expanded } = useSidebar()
  const Cmp = asChild ? Slot : 'a'
  const item = (
    <Cmp
      className={cn(
        `flex shrink-0 items-center gap-3 rounded-md py-2.5 text-sm transition-colors ${focusRing}`,
        'text-ink-muted hover:bg-hover hover:text-ink',
        'aria-[current=page]:bg-teal aria-[current=page]:font-semibold aria-[current=page]:text-accent',
        expanded ? 'px-3' : 'justify-center px-0',
        className,
      )}
      {...props}
    >
      {icon}
      <span className={cn('truncate', !expanded && 'sr-only')}>{label}</span>
      {asChild ? <Slottable>{children}</Slottable> : children}
    </Cmp>
  )
  if (expanded) return item
  // Doblado, el nombre está pero no se ve, así que el tooltip es la única forma de leerlo con
  // el mouse. A la derecha porque a la izquierda no hay lugar: el riel está contra el borde.
  return (
    <Tooltip placement="right">
      <TooltipTrigger>{item}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Folds and unfolds. It says which of the two it is doing, and to whom.
 *
 * It goes in the header and not at the foot: the control that changes the shape of the rail is
 * looked for where the rail starts, and at the bottom of a screen-tall column it is the furthest
 * thing from the eye that is going to use it.
 */
export function SidebarToggle({ className, ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'aria-label'>) {
  const { expanded, setExpanded } = useSidebar()
  const label = expanded ? 'Replegar el panel' : 'Desplegar el panel'
  return (
    <IconButton
      label={label} variant="ghost" size="sm" aria-expanded={expanded}
      onClick={() => setExpanded(!expanded)} className={className}
      icon={<Icon icon={expanded ? PanelLeftClose : PanelLeftOpen} size="lg" />}
      {...props}
    />
  )
}
