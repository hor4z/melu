import { useMemo, useState, type ComponentPropsWithoutRef, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ListFilter, Search, X } from 'lucide-react'
import { cn, focusRing, useControllableState } from './lib'
import { Icon } from './icon'
import { Avatar, AvatarGroup } from './avatar'
import { Chip } from './chip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown'
import { Input, type InputProps } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Spinner } from './spinner'

export type FilterColor = 'default' | 'success' | 'warning' | 'danger' | 'accent'
  | 'teal' | 'yellow' | 'blue' | 'lilac' | 'orange' | 'cyan' | 'green' | 'pink'

// The dot repeats the color the row already wears in the table, so the eye jumps from the
// filter to the rows it left. Strong for the meaningful ones, the plain tint for the rest.
const DOT: Record<FilterColor, string> = {
  default: 'bg-line-strong', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', accent: 'bg-accent',
  teal: 'bg-teal', yellow: 'bg-yellow', blue: 'bg-blue', lilac: 'bg-lilac',
  orange: 'bg-orange', cyan: 'bg-cyan', green: 'bg-green', pink: 'bg-pink',
}

const HEIGHT = { sm: 'h-8', md: 'h-9.5' }

export type FilterOption = {
  value: string
  label: string
  /** Paints the dot and the chip of the choice. The same colors as `Chip`. */
  color?: FilterColor
  /** Draws the face of the name instead of the dot, and the chosen ones as an `AvatarGroup`. */
  avatar?: boolean
  /** How many rows fall here. It reads to the right of the option. */
  count?: number
}

export interface FilterProps {
  /** What is being filtered: "Estado", "Grupo". It is the name of the button and of the list. */
  label: string
  options: FilterOption[]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** With `false` only one option can be chosen, and choosing closes the panel. */
  multiple?: boolean
  /** The box to search inside the options. On its own past eight. */
  searchable?: boolean
  /**
   * Controlling it hands the search over: the options arrive already filtered. What is chosen
   * survives a query that leaves it out, but with its raw value as the name: send the chosen
   * options along with the results and the trigger keeps its color and its faces.
   */
  search?: string
  onSearchChange?: (search: string) => void
  /** While the options are being brought in. */
  loading?: boolean
  /** Goes to the left of the name, to tell one filter from another at a glance. */
  icon?: ReactNode
  /** Opens the panel as soon as it appears: the one just added is asking to be answered. */
  defaultOpen?: boolean
  /** Draws the X that takes the filter off the bar. Without it the filter is always there. */
  onRemove?: () => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * One filter of a table: a button that says what it filters, and a panel to choose. It holds
 * an array of values because the normal thing is to want two states at once, and it works
 * controlled or not, like the rest.
 */
export function Filter({
  label, options, value, defaultValue = [], onValueChange, multiple = true,
  searchable, search, onSearchChange, loading, icon, defaultOpen = false, onRemove, size = 'sm', className,
}: FilterProps) {
  const [chosen, setChosen] = useControllableState<string[]>({ value, defaultValue, onChange: onValueChange })
  const [open, setOpen] = useState(defaultOpen)
  const [ownQuery, setOwnQuery] = useState('')

  // Whoever passes `search` is searching on their side (over the wire, say): the options
  // arrive already filtered and filtering them again here would hide what they just brought.
  const outside = search !== undefined
  const query = outside ? search : ownQuery
  const setQuery = (v: string) => { if (!outside) setOwnQuery(v); onSearchChange?.(v) }
  const withBox = searchable ?? (outside || options.length > 8)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return outside || !q ? options : options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query, outside])

  // From `chosen` and not from `options`: with the search on the other side, an option that
  // the query leaves out would empty the trigger and the filter would look cleared while it
  // is still filtering.
  const picked = useMemo(
    () => chosen.map((v) => options.find((o) => o.value === v) ?? { value: v, label: v }),
    [options, chosen],
  )
  const faces = picked.length > 0 && picked.every((o) => o.avatar)

  const toggle = (v: string) => {
    if (!multiple) {
      setChosen(chosen.includes(v) ? [] : [v])
      setOpen(false)
      return
    }
    setChosen(chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v])
  }

  // Arrows walk the options, and from the search box the first one is one ArrowDown away.
  // Home and End only when the focus is already on an option: inside the box they belong to
  // the text, which is where someone types a name and wants to go back to its start.
  const moveBy = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')]
    if (!items.length) return
    const onOption = document.activeElement?.getAttribute('role') === 'option'
    if (!onOption && (e.key === 'Home' || e.key === 'End')) return
    e.preventDefault()
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'Home' ? items[0]
      : e.key === 'End' ? items[items.length - 1]
        : e.key === 'ArrowDown' ? items[i < 0 ? 0 : (i + 1) % items.length]
          : items[i <= 0 ? items.length - 1 : i - 1]
    next?.focus()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* The pill holds two buttons: the X has to be a sibling and not a button inside another
          one, which is neither valid HTML nor reachable with the tab key. The anchor is the
          left one, which is where the panel hangs from. */}
      <span
        className={cn(
          'inline-flex max-w-full items-center rounded-md border text-sm font-medium transition-colors',
          HEIGHT[size],
          picked.length ? 'border-ink bg-surface text-ink' : 'border-dashed border-line-strong text-ink-muted hover:border-ink',
          className,
        )}
      >
        <PopoverTrigger>
          <button
            type="button"
            aria-label={picked.length ? `${label}: ${picked.map((o) => o.label).join(', ')}` : label}
            className={cn(`inline-flex h-full max-w-full items-center gap-2 rounded-md px-2.5 transition-colors ${focusRing}`, !picked.length && 'hover:text-ink')}
          >
            {icon}
            {label}
            {picked.length > 0 && (
              <>
                <span className="h-4 w-px shrink-0 bg-line" />
                {faces
                  ? <AvatarGroup names={picked.map((o) => o.label)} max={3} size="xs" />
                  : picked.length <= 2
                    ? picked.map((o) => <Chip key={o.value} size="sm" color={o.color ?? 'default'}>{o.label}</Chip>)
                    : <Chip size="sm">{picked.length} elegidos</Chip>}
              </>
            )}
          </button>
        </PopoverTrigger>
        {onRemove && (
          <>
            <span className="h-4 w-px shrink-0 bg-line" />
            <button
              type="button" onClick={onRemove} aria-label={`Sacar el filtro ${label}`}
              className={`grid h-full place-items-center rounded-md px-1.5 text-ink-subtle transition-colors hover:text-ink ${focusRing}`}
            >
              <Icon icon={X} size="sm" />
            </button>
          </>
        )}
      </span>

      <PopoverContent className="w-64 p-0" onKeyDown={moveBy}>
        {withBox && (
          <div className="border-b border-line p-2">
            <Input
              size="sm" value={query} onChange={(e) => setQuery(e.target.value)} clearable onClear={() => setQuery('')}
              placeholder={`Buscar en ${label.toLowerCase()}`} aria-label={`Buscar en ${label.toLowerCase()}`}
              startIcon={<Icon icon={Search} size="sm" />} loading={loading}
            />
          </div>
        )}
        <div role="listbox" aria-multiselectable={multiple} aria-label={label} aria-busy={loading} className="max-h-72 overflow-y-auto p-1.5">
          {loading && visible.length === 0
            ? <div className="grid place-items-center py-6"><Spinner /></div>
            : visible.length === 0
              ? <p className="px-2.5 py-6 text-center text-sm text-ink-muted">Nada con ese nombre.</p>
              : visible.map((o) => {
                const on = chosen.includes(o.value)
                return (
                  <button
                    key={o.value} type="button" role="option" aria-selected={on} onClick={() => toggle(o.value)}
                    className={cn(`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-hover focus-visible:bg-hover`, on && 'font-medium')}
                  >
                    <span className={cn('grid size-[18px] shrink-0 place-items-center border-2 transition-colors',
                      multiple ? 'rounded-sm' : 'rounded-full',
                      on ? 'border-solid bg-solid text-on-solid' : 'border-line-strong bg-surface')}
                    >
                      {on && <Icon icon={Check} size="sm" />}
                    </span>
                    {o.avatar
                      ? <Avatar name={o.label} size="xs" />
                      : o.color && <span className={cn('size-2.5 shrink-0 rounded-full', DOT[o.color])} />}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.count !== undefined && <span className="shrink-0 text-xs tabular-nums text-ink-subtle">{o.count}</span>}
                  </button>
                )
              })}
        </div>
        {chosen.length > 0 && (
          <div className="border-t border-line p-1.5">
            <button
              type="button" onClick={() => setChosen([])}
              className={`w-full rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-hover hover:text-ink ${focusRing}`}
            >
              Limpiar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export type FilterDef = {
  /** The key the value travels under: `estado`. */
  name: string
  label: string
  icon?: ReactNode
  options: FilterOption[]
  multiple?: boolean
  searchable?: boolean
}

export interface FilterSetProps {
  filters: FilterDef[]
  /** What is on: `{ estado: ['submitted'] }`. A key that is there is a filter on the bar. */
  value?: Record<string, string[]>
  defaultValue?: Record<string, string[]>
  onValueChange?: (value: Record<string, string[]>) => void
  /** The word on the button while the bar is empty. */
  label?: string
  /** Replaces what the reset does: useful when the screen also has to empty its search. */
  onReset?: () => void
  size?: 'sm' | 'md'
}

/**
 * The filters of a table, added one at a time. It is one button while nothing is filtering,
 * and each filter that is chosen from it appears as a pill with its own panel and its own X.
 *
 * Showing every filter at once asks the person to read them all before knowing which one they
 * want; showing one asks them to say what they are looking for. It renders siblings, so it goes
 * inside a `FilterBar`, next to the search.
 */
export function FilterSet({ filters, value, defaultValue = {}, onValueChange, label = 'Filtrar', onReset, size = 'sm' }: FilterSetProps) {
  const [applied, setApplied] = useControllableState<Record<string, string[]>>({ value, defaultValue, onChange: onValueChange })
  // The one just added opens its panel by itself: it was chosen to be answered, not to be looked at.
  const [added, setAdded] = useState<string | null>(null)

  const on = filters.filter((f) => applied[f.name] !== undefined)
  const off = filters.filter((f) => applied[f.name] === undefined)

  const add = (name: string) => { setApplied({ ...applied, [name]: [] }); setAdded(name) }
  const drop = (name: string) => {
    const rest = { ...applied }
    delete rest[name]
    setApplied(rest)
  }

  return (
    <>
      {on.map((f) => (
        <Filter
          key={f.name} label={f.label} icon={f.icon} options={f.options} multiple={f.multiple} searchable={f.searchable}
          size={size} value={applied[f.name] ?? []} onValueChange={(v) => setApplied({ ...applied, [f.name]: v })}
          defaultOpen={added === f.name} onRemove={() => drop(f.name)}
        />
      ))}

      {off.length > 0 && (
        <DropdownMenu placement="bottom-start">
          <DropdownMenuTrigger>
            <button
              type="button" aria-label={label}
              className={cn(
                `inline-flex items-center gap-2 rounded-md border border-dashed border-line-strong px-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-ink hover:text-ink ${focusRing}`,
                HEIGHT[size],
              )}
            >
              <Icon icon={ListFilter} size="sm" />
              {/* With filters on, the button becomes an icon: what matters on the bar is what
                  is filtering, not the invitation to add one more. */}
              {on.length === 0 && label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent minWidth={200}>
            {off.map((f) => (
              <DropdownMenuItem key={f.name} icon={f.icon} onClick={() => add(f.name)}>{f.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {on.length > 0 && <FilterReset onClick={() => (onReset ? onReset() : setApplied({}))} />}
    </>
  )
}

/** The row above a table: the search, the filters and, when something is filtering, the reset. */
export function FilterBar({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
}

export interface FilterSearchProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
}

/** The free text of the bar: an `Input` with the magnifier, the X and the width it should have. */
export function FilterSearch({ value, onValueChange, placeholder = 'Buscar…', size = 'sm', className, ...props }: FilterSearchProps) {
  return (
    <Input
      size={size} value={value} onChange={(e) => onValueChange(e.target.value)} clearable onClear={() => onValueChange('')}
      placeholder={placeholder} aria-label={placeholder} startIcon={<Icon icon={Search} size="sm" />}
      className={cn('w-full sm:w-64', className)} {...props}
    />
  )
}

/** Undoes every filter at once. Show it only when there is something to undo. */
export function FilterReset({ className, children = 'Limpiar', ...props }: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      className={cn(`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink ${focusRing}`, className)}
      {...props}
    >
      <Icon icon={X} size="sm" />
      {children}
    </button>
  )
}

/**
 * How many rows fall in each option, which is the number the filter shows. Counting over the
 * rows that the *other* filters already left is what makes the number honest: an option
 * showing 4 leaves 4, and one showing 0 says so before being clicked.
 */
export function facets<T>(rows: T[], of: (row: T) => string | undefined | null): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const key = of(row)
    if (key != null) out[key] = (out[key] ?? 0) + 1
  }
  return out
}
