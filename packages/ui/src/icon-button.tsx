import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, focusRing, Slot } from './lib'
import { Spinner } from './spinner'

const iconButtonVariantes = cva(
  `inline-grid shrink-0 place-items-center rounded-md outline-none transition-colors disabled:pointer-events-none disabled:opacity-45 ${focusRing}`,
  {
    variants: {
      variant: {
        primary: 'bg-solid text-on-solid hover:bg-solid-hover',
        secondary: 'border-2 border-ink bg-surface text-ink hover:bg-hover',
        outline: 'border border-line-strong bg-surface text-ink hover:bg-hover',
        ghost: 'text-ink-muted hover:bg-hover hover:text-ink',
        subtle: 'bg-muted text-ink hover:bg-hover',
        destructive: 'bg-danger text-white hover:brightness-110',
      },
      size: { sm: 'size-8', md: 'size-9.5', lg: 'size-11' },
      shape: { square: '', circle: 'rounded-full' },
    },
    defaultVariants: { variant: 'ghost', size: 'md', shape: 'square' },
  },
)

export interface IconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'>, VariantProps<typeof iconButtonVariantes> {
  /** Required: it is the button's accessible name, since there is no visible text. */
  label: string
  icon: ReactNode
  loading?: boolean
  asChild?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function IconButton({ label, icon, loading, variant, size, shape, className, disabled, asChild, type = 'button', ...props }: IconButtonProps) {
  const Cmp = asChild ? Slot : 'button'
  return (
    <Cmp type={asChild ? undefined : type} aria-label={label} title={label} disabled={asChild ? undefined : disabled || loading}
      className={cn(iconButtonVariantes({ variant, size, shape }), className)} {...props}>
      {loading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : icon}
    </Cmp>
  )
}
