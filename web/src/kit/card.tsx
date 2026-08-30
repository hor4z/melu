import type { ComponentPropsWithoutRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, Slot } from './lib'

const cardVariantes = cva('flex min-w-0 flex-col rounded-xl', {
  variants: {
    variant: {
      default: 'border border-line bg-surface',
      elevated: 'border border-line bg-surface card-shadow',
      muted: 'bg-muted',
      teal: 'bg-teal', yellow: 'bg-yellow', blue: 'bg-blue', lilac: 'bg-lilac',
      orange: 'bg-orange', cyan: 'bg-cyan', green: 'bg-green', pink: 'bg-pink',
      dashed: 'border-2 border-dashed border-line-strong',
      ghost: '',
    },
    padding: { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' },
    interactive: { true: 'text-left outline-none transition-shadow hover:shadow-[0_0_0_2px_var(--color-ink)] focus-visible:shadow-[0_0_0_2px_var(--color-ink)]' },
  },
  defaultVariants: { variant: 'default', padding: 'none' },
})

export interface CardProps extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof cardVariantes> {
  asChild?: boolean
}

export function Card({ className, variant, padding, interactive, asChild, ...props }: CardProps) {
  const Cmp = asChild ? Slot : 'div'
  return <Cmp className={cn(cardVariantes({ variant, padding, interactive }), className)} {...props} />
}

export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
}
export function CardTitle({ className, ...props }: ComponentPropsWithoutRef<'h3'>) {
  return <h3 className={cn('font-display text-lg font-semibold tracking-tight', className)} {...props} />
}
export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-sm text-ink-muted', className)} {...props} />
}
export function CardContent({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('min-w-0 p-5 pt-0', className)} {...props} />
}
export function CardFooter({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('mt-auto flex flex-wrap items-center gap-2 p-5 pt-0', className)} {...props} />
}
/** Franja superior a sangre: portada, ilustración o foto. */
export function CardMedia({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('grid shrink-0 place-items-center overflow-hidden rounded-t-xl', className)} {...props} />
}
