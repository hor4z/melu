import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, useControllableState } from './lib'

const toggleVariantes = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/30 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'data-[on=true]:bg-solid data-[on=true]:text-on-solid data-[on=false]:text-ink-muted data-[on=false]:hover:bg-hover data-[on=false]:hover:text-ink',
        outline: 'border-2 data-[on=true]:border-ink data-[on=true]:bg-accent-subtle data-[on=true]:text-ink data-[on=false]:border-line data-[on=false]:text-ink-muted data-[on=false]:hover:border-ink',
      },
      size: { sm: 'h-8 px-2.5 text-sm', md: 'h-9.5 px-3 text-sm', lg: 'h-11 px-4 text-base' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export interface ToggleProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange'>, VariantProps<typeof toggleVariantes> {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  icon?: ReactNode
  pressedIcon?: ReactNode
}

export function Toggle({ pressed, defaultPressed = false, onPressedChange, variant, size, icon, pressedIcon, className, children, ...props }: ToggleProps) {
  const [on, setOn] = useControllableState({ value: pressed, defaultValue: defaultPressed, onChange: onPressedChange })
  return (
    <button type="button" aria-pressed={on} data-on={on} onClick={() => setOn(!on)}
      className={cn(toggleVariantes({ variant, size }), className)} {...props}>
      {on ? (pressedIcon ?? icon) : icon}{children}
    </button>
  )
}

type GroupCtx = { values: string[]; toggle: (v: string) => void; size: ToggleProps['size']; variant: ToggleProps['variant'] }
const ToggleGroupCtx = createContext<GroupCtx | null>(null)

export interface ToggleGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'defaultValue'>, VariantProps<typeof toggleVariantes> {
  /** `single` keeps one active; `multiple` allows several. */
  type?: 'single' | 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (v: string[]) => void
}

export function ToggleGroup({ type = 'single', value, defaultValue = [], onValueChange, variant, size, className, children, ...props }: ToggleGroupProps) {
  const [vals, setVals] = useControllableState({ value, defaultValue, onChange: onValueChange })
  const toggle = (v: string) => setVals(type === 'single' ? (vals.includes(v) ? [] : [v]) : vals.includes(v) ? vals.filter((x) => x !== v) : [...vals, v])
  return (
    <ToggleGroupCtx.Provider value={{ values: vals, toggle, size, variant }}>
      <div role="group" className={cn('flex flex-wrap items-center gap-1.5', className)} {...props}>{children}</div>
    </ToggleGroupCtx.Provider>
  )
}

export function ToggleGroupItem({ value, className, children, ...props }: Omit<ToggleProps, 'pressed' | 'onPressedChange' | 'value'> & { value: string }) {
  const ctx = useContext(ToggleGroupCtx)
  if (!ctx) throw new Error('ToggleGroupItem necesita un ToggleGroup alrededor')
  return <Toggle pressed={ctx.values.includes(value)} onPressedChange={() => ctx.toggle(value)} size={ctx.size} variant={ctx.variant} className={className} {...props}>{children}</Toggle>
}
