import type { ComponentPropsWithoutRef } from 'react'
import { cn } from './lib'
import { Skeleton } from './feedback'

/**
 * The same rows as a `Table`, one under the other, for when there is no width. A table in a
 * phone is either unreadable or scrolls sideways, and nobody scrolls sideways: here every row
 * is a card, and what does not fit is what did not matter.
 */
export function DataList({ className, ...props }: ComponentPropsWithoutRef<'ul'>) {
  return <ul className={cn('flex flex-col divide-y divide-line', className)} {...props} />
}

export interface DataListItemProps extends ComponentPropsWithoutRef<'li'> {
  /** The whole card answers the click: pointer and hover. */
  interactive?: boolean
  selected?: boolean
}

/**
 * One card. Inside, a grid of two columns: the picture on the left, and everything else
 * stacked on the right, which is what keeps the lines aligned when the name is long.
 */
export function DataListItem({ className, interactive, selected, ...props }: DataListItemProps) {
  return (
    <li
      data-selected={selected || undefined}
      // The rows are declared and not left to the content: `row-span-full` is `1 / -1`, and
      // without explicit rows that -1 is the first line, so the picture stopped spanning and
      // stretched the first row to its own height. The air between lines is each part's
      // margin, so a card with two parts does not pay for the rows it does not use.
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto_auto_auto] items-start gap-x-3 px-4 py-3.5 transition-colors',
        interactive && 'cursor-pointer hover:bg-hover', selected && 'bg-accent-subtle', className,
      )}
      {...props}
    />
  )
}

/** The picture on the left: an avatar, an icon. It takes the whole height of the card. */
export function DataListMedia({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('row-span-full self-start', className)} {...props} />
}

/** The first line: the title on one side and, at the other end, the state. */
export function DataListHead({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('col-start-2 flex items-start justify-between gap-3', className)} {...props} />
}

export function DataListTitle({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('min-w-0 truncate font-medium', className)} {...props} />
}

/** The second line: what the card is about. */
export function DataListText({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('col-start-2 mt-0.5 min-w-0 truncate text-sm text-ink-muted', className)} {...props} />
}

/**
 * The small print, in bits: the columns of the table that on a phone become one line.
 *
 * Separated by air and not by a dot. A name can carry its own dot inside ("4° A · Matemática"),
 * and then the separator and the content look the same and the line reads as one long string.
 * Space says the same thing and never collides with what it is separating.
 */
export function DataListMeta({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('col-start-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-subtle', className)} {...props} />
  )
}

/**
 * The list while the cards travel. The same shape they are going to have, so nothing jumps when
 * the data lands. It is the twin of `TableSkeleton`, for the width where there is no table.
 */
export function DataListSkeleton({ rows = 4, className, ...props }: ComponentPropsWithoutRef<'ul'> & { rows?: number }) {
  return (
    <ul aria-hidden="true" className={cn('flex flex-col divide-y divide-line', className)} {...props}>
      {Array.from({ length: rows }, (_, fila) => (
        <li key={fila} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 px-4 py-3.5">
          <Skeleton className="row-span-full size-10 rounded-full" />
          <Skeleton className="col-start-2 h-4 w-32" />
          <Skeleton className="col-start-2 mt-2 h-3.5 w-48" />
          <Skeleton className="col-start-2 mt-2 h-3 w-28" />
        </li>
      ))}
    </ul>
  )
}

/** The actions, at the closing corner of the card. */
export function DataListActions({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('col-start-2 mt-2 flex flex-wrap items-center justify-end gap-2', className)} {...props} />
}
