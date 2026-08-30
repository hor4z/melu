import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib'
import { Icon } from './icon'

const alertVariantes = cva('flex items-start gap-3 rounded-xl p-4 text-sm', {
  variants: {
    variant: {
      info: 'bg-blue text-ink', success: 'bg-success-subtle text-ink',
      warning: 'bg-warning-subtle text-ink', danger: 'bg-danger-subtle text-ink',
      neutral: 'border border-line bg-surface text-ink',
    },
  },
  defaultVariants: { variant: 'info' },
})
const ICONOS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, neutral: Info }
const COLOR = { info: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger', neutral: 'text-ink-subtle' } as const

export interface AlertProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'>, VariantProps<typeof alertVariantes> {
  title?: ReactNode
  icon?: ReactNode | false
  actions?: ReactNode
}

export function Alert({ className, variant = 'info', title, icon, actions, children, ...props }: AlertProps) {
  const v = variant ?? 'info'
  return (
    <div role={v === 'danger' ? 'alert' : 'status'} className={cn(alertVariantes({ variant }), className)} {...props}>
      {icon !== false && (icon ?? <Icon icon={ICONOS[v]} size="lg" className={cn('mt-px', COLOR[v])} />)}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-ink-muted', title && 'mt-0.5')}>{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Separator({ className, orientation = 'horizontal', ...props }: ComponentPropsWithoutRef<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return <div role="separator" aria-orientation={orientation} className={cn('shrink-0 bg-line', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)} {...props} />
}

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export function Progress({ value, max = 100, className, label, showValue, ...props }: ComponentPropsWithoutRef<'div'> & { value: number; max?: number; label?: string; showValue?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-ink-muted">{label && <span>{label}</span>}{showValue && <span className="tabular-nums">{value}/{max}</span>}</div>
      )}
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-solid transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Vacío con explicación: siempre decí qué falta y qué se puede hacer. */
export function EmptyState({ className, icon, title, description, actions, ...props }: ComponentPropsWithoutRef<'div'> & { icon?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line-strong px-6 py-10 text-center', className)} {...props}>
      {icon}
      <div><p className="font-semibold">{title}</p>{description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}</div>
      {actions && <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
