import type { ComponentPropsWithoutRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './lib'

const TAMANOS = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const
const COLORES = {
  inherit: '', ink: 'text-ink', muted: 'text-ink-muted', subtle: 'text-ink-subtle',
  accent: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger',
} as const

export interface IconProps extends Omit<ComponentPropsWithoutRef<LucideIcon>, 'size' | 'color' | 'ref'> {
  /** Cualquier ícono de lucide-react: es el set del kit. */
  icon: LucideIcon
  size?: keyof typeof TAMANOS | number
  color?: keyof typeof COLORES
  /** Solo para íconos con significado propio; si hay texto al lado, dejalo vacío. */
  label?: string
}

export function Icon({ icon: Cmp, size = 'md', color = 'inherit', label, className, strokeWidth = 2, ...props }: IconProps) {
  const px = typeof size === 'number' ? size : TAMANOS[size]
  return (
    <Cmp
      width={px} height={px} strokeWidth={strokeWidth} aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined} aria-label={label}
      className={cn('shrink-0', COLORES[color], className)} {...props}
    />
  )
}
