import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib'

const textVariantes = cva('', {
  variants: {
    size: { xs: 'text-xs', sm: 'text-[13px]', md: 'text-sm', lg: 'text-base', xl: 'text-lg' },
    variant: { default: 'text-ink', muted: 'text-ink-muted', subtle: 'text-ink-subtle', accent: 'text-accent', danger: 'text-danger', success: 'text-success' },
    weight: { normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' },
    mono: { true: 'font-mono tabular-nums' },
  },
  defaultVariants: { size: 'md', variant: 'default', weight: 'normal' },
})

export interface TextProps extends Omit<ComponentPropsWithoutRef<'p'>, 'color'>, VariantProps<typeof textVariantes> {
  as?: ElementType
}

export function Text({ as: Cmp = 'p', className, size, variant, weight, mono, ...props }: TextProps) {
  return <Cmp className={cn(textVariantes({ size, variant, weight, mono }), className)} {...props} />
}

const headingVariantes = cva('font-display font-semibold tracking-tight text-balance text-ink', {
  variants: { size: { sm: 'text-base', md: 'text-lg', lg: 'text-xl', xl: 'text-2xl', '2xl': 'text-3xl', display: 'text-4xl leading-[1.05]' } },
  defaultVariants: { size: 'lg' },
})

export interface HeadingProps extends ComponentPropsWithoutRef<'h2'>, VariantProps<typeof headingVariantes> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const Cmp = `h${level}` as ElementType
  return <Cmp className={cn(headingVariantes({ size }), className)} {...props} />
}

/** Uppercase section label: the gesture that organizes the page. */
export function Eyebrow({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-[13px] font-bold uppercase tracking-[0.115em] text-ink-subtle', className)} {...props} />
}

export function Kbd({ className, ...props }: ComponentPropsWithoutRef<'kbd'>) {
  return <kbd className={cn('rounded border border-line bg-muted px-1.5 py-0.5 font-mono text-[11px] text-ink-muted', className)} {...props} />
}
