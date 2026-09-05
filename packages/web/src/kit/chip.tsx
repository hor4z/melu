import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, Slot } from './lib'
import { Icon } from './icon'

const chipVariantes = cva('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-md font-medium', {
  variants: {
    color: {
      default: 'bg-muted text-ink', outline: 'border border-line text-ink-muted',
      solid: 'bg-solid text-on-solid', accent: 'bg-accent-subtle text-accent',
      teal: 'bg-teal text-ink', yellow: 'bg-yellow text-ink', blue: 'bg-blue text-ink', lilac: 'bg-lilac text-ink',
      orange: 'bg-orange text-ink', cyan: 'bg-cyan text-ink', green: 'bg-green text-ink', pink: 'bg-pink text-ink',
      success: 'bg-success-subtle text-success', warning: 'bg-warning-subtle text-warning', danger: 'bg-danger-subtle text-danger',
    },
    size: { sm: 'h-5.5 px-2 text-[11px]', md: 'h-6.5 px-2.5 text-xs', lg: 'h-8 px-3 text-sm' },
    interactive: { true: 'cursor-pointer outline-none transition-colors hover:brightness-95 focus-visible:ring-3 focus-visible:ring-focus/30' },
  },
  defaultVariants: { color: 'default', size: 'md' },
})

export interface ChipProps extends Omit<ComponentPropsWithoutRef<'span'>, 'color'>, VariantProps<typeof chipVariantes> {
  icon?: ReactNode
  /** Muestra la X para quitarlo (filtros, etiquetas elegidas). */
  onRemove?: () => void
  asChild?: boolean
}

export function Chip({ className, color, size, interactive, icon, onRemove, asChild, children, ...props }: ChipProps) {
  const Cmp = asChild ? Slot : 'span'
  return (
    <Cmp className={cn(chipVariantes({ color, size, interactive: interactive ?? (props.onClick ? true : undefined) }), className)} {...props}>
      {icon}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove() }} aria-label="Quitar"
          className="-mr-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"><Icon icon={X} size="xs" /></button>
      )}
    </Cmp>
  )
}

/** Contador o estado breve. Más chico y redondo que un Chip. */
export function Badge({ className, color = 'danger', children, ...props }: Omit<ChipProps, 'size'>) {
  return <Chip color={color} size="sm" className={cn('h-5 min-w-5 justify-center rounded-full px-1.5 font-bold tabular-nums', className)} {...props}>{children}</Chip>
}
