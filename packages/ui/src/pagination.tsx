import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from './lib'
import { Button } from './button'
import { Text } from './text'

/**
 * The line under a table: how much is being seen, and how to ask for more.
 *
 * There are no page numbers on purpose. The api hands over a stretch and says whether there is
 * more, so what the person can do is exactly that: ask for more. Numbers would promise a total
 * and a jump that nobody behind can answer.
 */
export function Pagination({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3', className)}
      {...props}
    />
  )
}

export interface PaginationStatusProps extends Omit<ComponentPropsWithoutRef<'p'>, 'children'> {
  /** How many are on the screen. */
  shown: number
  /** How many there are in all. Without it, only what is being seen gets said. */
  total?: number
  /** What is being counted, in plural: "entregas". */
  noun?: string
  /** Replaces the whole sentence when the screen has a better one. */
  children?: ReactNode
}

/** How much of how much. It is the same sentence everywhere so nobody writes their own. */
export function PaginationStatus({ shown, total, noun, className, children, ...props }: PaginationStatusProps) {
  const cuantas = total === undefined || shown >= total ? `${shown}` : `${shown} de ${total}`
  return (
    <Text size="sm" variant="muted" className={cn('tabular-nums', className)} {...props}>
      {children ?? `${cuantas}${noun ? ` ${noun}` : ''}`}
    </Text>
  )
}

export interface PaginationMoreProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  /** With `false` it does not render: there is nothing left to ask for. */
  hasMore?: boolean
  loading?: boolean
  children?: ReactNode
}

/** Asks for the next stretch. It takes itself off the screen when there is no more. */
export function PaginationMore({ hasMore = true, loading, className, children = 'Cargar más', ...props }: PaginationMoreProps) {
  if (!hasMore) return null
  return (
    <Button type="button" variant="secondary" size="sm" loading={loading} className={cn('ml-auto', className)} {...props}>
      {children}
    </Button>
  )
}
