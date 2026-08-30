import { Children, createContext, isValidElement, useContext, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react'
import {
  FloatingFocusManager, FloatingList, FloatingPortal, autoUpdate, flip, offset, shift, size as sizeMw,
  useClick, useDismiss, useFloating, useInteractions, useListItem, useListNavigation, useRole, useTypeahead,
} from '@floating-ui/react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn, useControllableState } from './lib'
import { Icon } from './icon'
import { ariaDeCampo, useField } from './field'

type Ctx = {
  value: string
  setValue: (v: string) => void
  abierto: boolean
  setAbierto: (v: boolean) => void
  etiquetas: Map<string, ReactNode>
  busqueda: string
  setBusqueda: (s: string) => void
  activeIndex: number | null
  disabled?: boolean
  size: 'sm' | 'md' | 'lg'
  invalid?: boolean
  refs: ReturnType<typeof useFloating>['refs']
  floatingStyles: React.CSSProperties
  posicionado: boolean
  context: ReturnType<typeof useFloating>['context']
  getReferenceProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getFloatingProps: (u?: Record<string, unknown>) => Record<string, unknown>
  getItemProps: (u?: Record<string, unknown>) => Record<string, unknown>
  elementsRef: React.RefObject<(HTMLElement | null)[]>
  labelsRef: React.RefObject<(string | null)[]>
}
const SelectCtx = createContext<Ctx | null>(null)
const useSelectCtx = () => {
  const c = useContext(SelectCtx)
  if (!c) throw new Error('Usá los componentes de Select dentro de <Select>')
  return c
}

const textoDe = (n: ReactNode): string =>
  typeof n === 'string' || typeof n === 'number' ? String(n)
    : Array.isArray(n) ? n.map(textoDe).join('')
      : isValidElement(n) ? textoDe((n.props as { children?: ReactNode }).children)
        : ''

/** Recorre el árbol de hijos buscando los <SelectItem>, aunque el menú esté cerrado. */
function recolectar(nodo: ReactNode, mapa: Map<string, ReactNode>) {
  Children.forEach(nodo, (hijo) => {
    if (!isValidElement(hijo)) return
    const el = hijo as ReactElement<{ value?: string; children?: ReactNode }>
    if (el.type === SelectItem && el.props.value !== undefined) mapa.set(el.props.value, el.props.children)
    if (el.props.children) recolectar(el.props.children, mapa)
  })
}

export interface SelectProps {
  children: ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  invalid?: boolean
}

export function Select({ children, value, defaultValue = '', onValueChange, disabled, size = 'md', invalid }: SelectProps) {
  const [val, setVal] = useControllableState({ value, defaultValue, onChange: onValueChange })
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const elementsRef = useRef<(HTMLElement | null)[]>([])
  const labelsRef = useRef<(string | null)[]>([])
  const etiquetas = useMemo(() => { const m = new Map<string, ReactNode>(); recolectar(children, m); return m }, [children])

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: abierto, onOpenChange: (o) => { setAbierto(o); if (!o) setBusqueda('') }, placement: 'bottom-start', whileElementsMounted: autoUpdate,
    middleware: [
      offset(6), flip({ padding: 8 }), shift({ padding: 8 }),
      sizeMw({ padding: 8, apply({ rects, availableHeight, elements }) {
        elements.floating.style.minWidth = `${rects.reference.width}px`
        elements.floating.style.maxHeight = `${Math.max(180, Math.min(320, availableHeight))}px`
      } }),
    ],
  })
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    useClick(context, { enabled: !disabled }),
    useDismiss(context),
    useRole(context, { role: 'listbox' }),
    useListNavigation(context, { listRef: elementsRef, activeIndex, onNavigate: setActiveIndex, loop: true, virtual: false }),
    useTypeahead(context, { listRef: labelsRef, activeIndex, onMatch: setActiveIndex, enabled: abierto }),
  ])

  return (
    <SelectCtx.Provider value={{ value: val, setValue: setVal, abierto, setAbierto, etiquetas, busqueda, setBusqueda, activeIndex, disabled, size, invalid, refs, floatingStyles, context, posicionado: isPositioned, getReferenceProps, getFloatingProps, getItemProps, elementsRef, labelsRef }}>
      {children}
    </SelectCtx.Provider>
  )
}

const ALTO = { sm: 'h-8 px-2.5 text-[13px]', md: 'h-9.5 px-3 text-sm', lg: 'h-11 px-3.5 text-[15px]' }

export function SelectTrigger({ className, children, startIcon, ...props }: ComponentPropsWithoutRef<'button'> & { startIcon?: ReactNode }) {
  const s = useSelectCtx()
  const f = useField()
  const aria = ariaDeCampo(f)
  const malo = s.invalid ?? (f?.estado === 'error')
  return (
    <button type="button" ref={s.refs.setReference} id={aria.id} aria-describedby={aria['aria-describedby']}
      disabled={s.disabled ?? aria.disabled} data-state={s.abierto ? 'open' : 'closed'}
      className={cn('flex w-full items-center gap-2 rounded-md border bg-surface text-left text-ink outline-none transition-[border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-focus/25 disabled:bg-muted disabled:opacity-60',
        ALTO[s.size], malo ? 'border-danger focus-visible:ring-danger/25' : 'border-line focus-visible:border-ink', className)}
      {...s.getReferenceProps(props as Record<string, unknown>)}>
      {startIcon && <span className="text-ink-subtle">{startIcon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <Icon icon={ChevronDown} size="sm" className={cn('text-ink-subtle transition-transform', s.abierto && 'rotate-180')} />
    </button>
  )
}

export function SelectValue({ placeholder = 'Elegir…' }: { placeholder?: string }) {
  const s = useSelectCtx()
  const etiqueta = s.etiquetas.get(s.value)
  return etiqueta ? <>{etiqueta}</> : <span className="text-ink-subtle">{placeholder}</span>
}

export function SelectContent({ className, children, searchable, searchPlaceholder = 'Buscar…', emptyText = 'Sin resultados', ...props }: ComponentPropsWithoutRef<'div'> & { searchable?: boolean; searchPlaceholder?: string; emptyText?: ReactNode }) {
  const s = useSelectCtx()
  if (!s.abierto) return null
  const q = s.busqueda.toLowerCase()
  const vacio = q.length > 0 && ![...s.etiquetas.values()].some((e) => textoDe(e).toLowerCase().includes(q))
  return (
    <FloatingPortal>
      <FloatingFocusManager context={s.context} modal={false} initialFocus={searchable ? 0 : -1} returnFocus disabled={!s.posicionado}>
        <div ref={s.refs.setFloating} style={{ ...s.floatingStyles, visibility: s.posicionado ? undefined : 'hidden' }} data-state="open"
          className={cn('kit-pop z-50 flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg outline-none', className)}
          {...s.getFloatingProps(props as Record<string, unknown>)}>
          {searchable && (
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <Icon icon={Search} size="sm" color="subtle" />
              <input autoFocus value={s.busqueda} onChange={(e) => s.setBusqueda(e.target.value)} placeholder={searchPlaceholder}
                aria-label={searchPlaceholder} className="w-full bg-transparent text-sm outline-none placeholder:text-ink-subtle" />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            <FloatingList elementsRef={s.elementsRef} labelsRef={s.labelsRef}>{children}</FloatingList>
          </div>
          {vacio && <p className="px-3 pb-3 pt-1 text-sm text-ink-muted">{emptyText}</p>}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  )
}

export interface SelectItemProps extends Omit<ComponentPropsWithoutRef<'div'>, 'value'> {
  value: string
  icon?: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export function SelectItem({ value, className, children, icon, description, disabled, ...props }: SelectItemProps) {
  const s = useSelectCtx()
  const texto = textoDe(children)
  const oculto = s.busqueda && !`${texto} ${textoDe(description)}`.toLowerCase().includes(s.busqueda.toLowerCase())
  const { ref, index } = useListItem({ label: disabled || oculto ? null : texto })
  if (oculto) return null
  const activo = s.activeIndex === index
  const elegido = s.value === value
  return (
    <div ref={ref} role="option" aria-selected={elegido} aria-disabled={disabled} tabIndex={activo ? 0 : -1}
      className={cn('flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none',
        activo && !disabled && 'bg-hover', elegido && 'font-medium', disabled && 'pointer-events-none opacity-45', className)}
      {...s.getItemProps({
        ...props,
        onClick: () => { if (disabled) return; s.setValue(value); s.setAbierto(false); s.setBusqueda('') },
      })}>
      {icon && <span className="text-ink-subtle">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {description && <span className="block truncate text-[13px] font-normal text-ink-muted">{description}</span>}
      </span>
      {elegido && <Icon icon={Check} size="sm" className="text-accent" />}
    </div>
  )
}

export function SelectGroup({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div role="group" className={cn('flex flex-col', className)} {...props} />
}
export function SelectLabel({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-subtle', className)} {...props} />
}
export function SelectSeparator({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div role="separator" className={cn('-mx-1.5 my-1.5 h-px bg-line', className)} {...props} />
}

/** El `<select>` del navegador con los estilos del kit: para formularios simples o listas larguísimas. */
export function NativeSelect({ className, size = 'md', invalid, children, ...props }: Omit<ComponentPropsWithoutRef<'select'>, 'size'> & { size?: 'sm' | 'md' | 'lg'; invalid?: boolean }) {
  const f = useField()
  const aria = ariaDeCampo(f, { id: props.id })
  const malo = invalid ?? (f?.estado === 'error')
  return (
    <div className="relative flex items-center">
      <select {...props} {...aria} disabled={props.disabled ?? aria.disabled}
        className={cn('w-full appearance-none rounded-md border bg-surface pr-9 text-ink outline-none transition-[border-color,box-shadow] focus:ring-3 focus:ring-focus/25 disabled:bg-muted disabled:opacity-60',
          ALTO[size], malo ? 'border-danger focus:ring-danger/25' : 'border-line focus:border-ink', className)}>
        {children}
      </select>
      <Icon icon={ChevronDown} size="sm" className="pointer-events-none absolute right-3 text-ink-subtle" />
    </div>
  )
}

