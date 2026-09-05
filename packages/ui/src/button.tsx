import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, Slot, Slottable } from './lib'
import { Spinner } from './spinner'

export const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold outline-none transition-[background-color,border-color,color,box-shadow] focus-visible:ring-3 focus-visible:ring-focus/30 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-solid text-on-solid hover:bg-solid-hover',
        secondary: 'border-2 border-ink bg-surface text-ink hover:bg-hover',
        outline: 'border border-line-strong bg-surface text-ink hover:bg-hover',
        ghost: 'text-ink-muted hover:bg-hover hover:text-ink',
        subtle: 'bg-muted text-ink hover:bg-hover',
        accent: 'bg-accent text-white hover:brightness-110',
        destructive: 'bg-danger text-white hover:brightness-110',
        link: 'h-auto rounded-none p-0 text-accent underline-offset-4 hover:underline',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-9.5 px-4 text-sm', lg: 'h-11 px-5 text-base' },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'color'>, VariantProps<typeof buttonVariants> {
  /** Renders the child (an <a>, a <Link>) with the button styles, instead of a <button>. */
  asChild?: boolean
  /** Shows a spinner, disables, and announces the state. */
  loading?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({ className, variant, size, block, asChild, loading = false, disabled, startIcon, endIcon, children, type = 'button', ...props }: ButtonProps) {
  const Cmp = asChild ? Slot : 'button'
  const spinnerSize = size === 'lg' ? 'md' : 'sm'
  return (
    <Cmp
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {loading ? <Spinner size={spinnerSize} /> : startIcon}
      <Slottable>{children}</Slottable>
      {endIcon}
    </Cmp>
  )
}

/** Buttons joined in a row: they share borders and rounding. */
export function ButtonGroup({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div role="group"
      className={cn('inline-flex [&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*+*]:-ml-px [&>*:hover]:z-10 [&>*:focus-visible]:z-10', className)}
      {...props} />
  )
}
