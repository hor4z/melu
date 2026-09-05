import type { ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './lib'

const SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const
const COLORS = {
  inherit: '', ink: 'text-ink', muted: 'text-ink-muted', subtle: 'text-ink-subtle',
  accent: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger',
} as const

export interface IconProps extends Omit<ComponentPropsWithoutRef<LucideIcon>, 'size' | 'color' | 'ref'> {
  /** Any lucide-react icon: that is the kit's set. */
  icon: LucideIcon
  size?: keyof typeof SIZES | number
  color?: keyof typeof COLORS
  /** Only for icons carrying meaning of their own; if there is text next to it, leave it empty. */
  label?: string
}

export function Icon({ icon: Cmp, size = 'md', color = 'inherit', label, className, strokeWidth = 2, ...props }: IconProps) {
  const px = typeof size === 'number' ? size : SIZES[size]
  return (
    <Cmp
      width={px} height={px} strokeWidth={strokeWidth} aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined} aria-label={label}
      className={cn('shrink-0', COLORS[color], className)} {...props}
    />
  )
}
