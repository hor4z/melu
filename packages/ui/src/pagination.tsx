import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './lib'
import { Button } from './button'
import { Icon } from './icon'
import { Text } from './text'

/**
 * The line under a table: which stretch is being seen, and how to move to the next one.
 *
 * There are no page numbers on purpose. The api hands over a stretch and says whether there is
 * more; a number would promise a total and a jump that a cursor cannot answer. What it can
 * answer is the next one and the previous one, and that is what this offers.
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
  /** The last one on the screen, counting from one. */
  to: number
  /** The first one on the screen. */
  from?: number
  /** How many there are in all. Without it, only the stretch gets said. */
  total?: number
  /** What is being counted, in plural: "entregas". */
  noun?: string
  /** Replaces the whole sentence when the screen has a better one. */
  children?: ReactNode
}

/**
 * Which stretch is being seen. It is the same sentence everywhere so nobody writes their own,
 * and when the stretch is everything it stops counting from where: "17 entregas" and not
 * "1 a 17 de 17 entregas", which says the same thing three times.
 */
export function PaginationStatus({ to, from = 1, total, noun, className, children, ...props }: PaginationStatusProps) {
  const cola = noun ? ` ${noun}` : ''
  const frase = total !== undefined && from <= 1 && to >= total
    ? `${total}${cola}`
    : total !== undefined
      ? `${from} a ${to} de ${total}${cola}`
      : `${from} a ${to}${cola}`
  return (
    <Text size="sm" variant="muted" className={cn('tabular-nums', className)} {...props}>
      {children ?? frase}
    </Text>
  )
}

export interface PaginationNavProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  loading?: boolean
  children?: ReactNode
}

/**
 * The two of them travel together and are always there, greyed out at the ends: a pair that
 * appears and disappears moves the other one under the finger that was going for it.
 */
export function PaginationPrev({ loading, className, children = 'Anterior', ...props }: PaginationNavProps) {
  return (
    <Button
      type="button" variant="secondary" size="sm" loading={loading}
      startIcon={<Icon icon={ChevronLeft} size="sm" />} className={cn('ml-auto', className)} {...props}
    >
      {children}
    </Button>
  )
}

/** Its `disabled` is the `more` the api answers: while there is more, there is a next. */
export function PaginationNext({ loading, className, children = 'Siguiente', ...props }: PaginationNavProps) {
  return (
    <Button
      type="button" variant="secondary" size="sm" loading={loading}
      endIcon={<Icon icon={ChevronRight} size="sm" />} className={className} {...props}
    >
      {children}
    </Button>
  )
}
