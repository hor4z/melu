import { Children, Fragment, type ComponentPropsWithoutRef } from 'react'
import { cn } from './lib'

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
 * The small print, in bits: the columns of the table that on a phone become one line. It puts
 * the dot between them, so nobody writes separators by hand and they all end up different.
 */
export function DataListMeta({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const bits = Children.toArray(children)
  return (
    <div className={cn('col-start-2 mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-subtle', className)} {...props}>
      {bits.map((bit, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden="true">·</span>}
          {bit}
        </Fragment>
      ))}
    </div>
  )
}

/** The actions, at the closing corner of the card. */
export function DataListActions({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('col-start-2 mt-2 flex flex-wrap items-center justify-end gap-2', className)} {...props} />
}
