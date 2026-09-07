import { createContext, useContext, type ComponentPropsWithoutRef } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn, focusRing } from './lib'
import { Icon } from './icon'

type Ctx = { size: 'sm' | 'md' }
const TableCtx = createContext<Ctx>({ size: 'md' })

const PAD = { sm: 'px-3 py-2', md: 'px-4 py-3' }
const ALIGN = { start: 'text-left', center: 'text-center', end: 'text-right' }

export interface TableProps extends ComponentPropsWithoutRef<'table'> {
  size?: 'sm' | 'md'
  /** Classes for the box around the table, which is the one that scrolls. */
  containerClassName?: string
}

/**
 * A table, in parts. The box around it scrolls sideways on its own, so a wide table never
 * drags the page with it.
 */
// `relative` on that box is not decoration: without it the overflow of the table climbs past
// the scroll container (past an `overflow: hidden` too) and ends up on the page, which then
// scrolls sideways showing empty canvas next to a table that was already clipped.
export function Table({ size = 'md', className, containerClassName, ...props }: TableProps) {
  return (
    <TableCtx.Provider value={{ size }}>
      <div className={cn('relative w-full overflow-x-auto', containerClassName)}>
        <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
      </div>
    </TableCtx.Provider>
  )
}

/**
 * `sticky` pins the header while the rows scroll, and it needs the box around the table to
 * have a height (`containerClassName="max-h-96"`): what scrolls is that box, and a sticky
 * header has nothing to stick against inside a box as tall as its content. It goes on the
 * cells and not on the `<thead>` on purpose: with `border-collapse` a sticky row loses its
 * bottom border.
 */
export function TableHeader({ className, sticky, ...props }: ComponentPropsWithoutRef<'thead'> & { sticky?: boolean }) {
  return <thead className={cn(sticky && '[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-surface', className)} {...props} />
}

export function TableBody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('[&>tr:last-child]:border-0', className)} {...props} />
}

/** The closing row: totals, or how many of them there are. */
export function TableFooter({ className, ...props }: ComponentPropsWithoutRef<'tfoot'>) {
  return <tfoot className={cn('border-t border-line bg-muted font-medium [&>tr]:border-0', className)} {...props} />
}

export interface TableRowProps extends ComponentPropsWithoutRef<'tr'> {
  /** The whole row answers the click: pointer and hover. */
  interactive?: boolean
  selected?: boolean
}

export function TableRow({ className, interactive, selected, ...props }: TableRowProps) {
  return (
    <tr
      // `data-` and not `aria-selected`: that one belongs to a row of a `grid`, not of a
      // table, and in a plain table it makes the reader announce "not selected" on every
      // other row.
      data-selected={selected || undefined}
      className={cn('border-b border-line transition-colors', interactive && 'cursor-pointer hover:bg-hover', selected && 'bg-accent-subtle', className)}
      {...props}
    />
  )
}

// `align` is ours, not the HTML one from last century: start/end and not left/right, so it
// follows the direction of the text.
export interface TableHeadProps extends Omit<ComponentPropsWithoutRef<'th'>, 'align'> {
  align?: 'start' | 'center' | 'end'
  /** Which way this column is sorting, or `false` when it can sort and is not the one sorting. */
  sort?: 'asc' | 'desc' | false
  /** Passing it turns the title into a button and announces `aria-sort`. */
  onSort?: () => void
}

export function TableHead({ className, align = 'start', sort, onSort, children, ...props }: TableHeadProps) {
  const { size } = useContext(TableCtx)
  const arrow = sort === 'asc' ? ArrowUp : sort === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <th
      scope="col"
      aria-sort={!onSort ? undefined : sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}
      className={cn('whitespace-nowrap border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-subtle', PAD[size], ALIGN[align], className)}
      {...props}
    >
      {onSort
        ? (
          <button
            type="button" onClick={onSort}
            // `uppercase` again: the reset turns off the `text-transform` of every button, so
            // without this the columns that sort are the only ones in lowercase.
            className={cn(`inline-flex items-center gap-1 rounded-xs uppercase transition-colors hover:text-ink ${focusRing}`, sort && 'text-ink', align === 'end' && 'flex-row-reverse')}
          >
            {children}
            <Icon icon={arrow} size="xs" className={cn(!sort && 'opacity-40')} />
          </button>
        )
        : children}
    </th>
  )
}

export interface TableCellProps extends Omit<ComponentPropsWithoutRef<'td'>, 'align'> {
  align?: 'start' | 'center' | 'end'
  /** Numbers: to the right and with even digits, so the column reads as a column. */
  numeric?: boolean
}

export function TableCell({ className, align, numeric, ...props }: TableCellProps) {
  const { size } = useContext(TableCtx)
  return <td className={cn('align-middle', PAD[size], ALIGN[align ?? (numeric ? 'end' : 'start')], numeric && 'tabular-nums', className)} {...props} />
}

/** What the table is, for whoever cannot see it. It reads below the table. */
export function TableCaption({ className, ...props }: ComponentPropsWithoutRef<'caption'>) {
  return <caption className={cn('mt-3 text-left text-sm text-ink-muted', className)} {...props} />
}

/** The "nothing here" row: one cell across the whole width, with the `EmptyState` inside. */
export function TableEmpty({ className, colSpan, children, ...props }: ComponentPropsWithoutRef<'td'> & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('px-4 py-10', className)} {...props}>{children}</td>
    </tr>
  )
}
