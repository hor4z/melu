import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn, focusRing, useControllableState } from './lib'

type Ctx = { value: string; setValue: (v: string) => void; size: 'sm' | 'md' | 'lg'; fill: boolean }
const SegCtx = createContext<Ctx | null>(null)

export interface SegmentedControlProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'defaultValue'> {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  size?: 'sm' | 'md' | 'lg'
  /** `fill` splits the width across the options. */
  layout?: 'hug' | 'fill'
  label?: string
}

const HEIGHT = { sm: 'h-8', md: 'h-9.5', lg: 'h-11' }

/** A control for a few exclusive options, always visible. Past five, use a Select. */
export function SegmentedControl({ value, defaultValue = '', onValueChange, size = 'md', layout = 'hug', label, className, children, ...props }: SegmentedControlProps) {
  const [val, setVal] = useControllableState({ value, defaultValue, onChange: onValueChange })
  return (
    <SegCtx.Provider value={{ value: val, setValue: setVal, size, fill: layout === 'fill' }}>
      <div role="radiogroup" aria-label={label}
        className={cn('inline-flex items-center gap-0.5 rounded-lg border border-line bg-muted p-1', HEIGHT[size], layout === 'fill' && 'flex w-full', className)} {...props}>
        {children}
      </div>
    </SegCtx.Provider>
  )
}

export function SegmentedControlItem({ value, className, children, disabled, ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'value'> & { value: string; children: ReactNode }) {
  const ctx = useContext(SegCtx)
  if (!ctx) throw new Error('SegmentedControlItem necesita un SegmentedControl alrededor')
  const isOn = ctx.value === value
  // sm y md comparten tamaño de texto y se diferencian por el alto, como en Button e Input.
  const text = ctx.size === 'lg' ? 'text-base' : 'text-sm'
  return (
    <button type="button" role="radio" aria-checked={isOn} disabled={disabled} onClick={() => ctx.setValue(value)}
      className={cn(`inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 font-medium outline-none transition-colors disabled:opacity-45 ${focusRing}`,
        text, ctx.fill && 'flex-1', isOn ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink', className)}
      {...props}>{children}</button>
  )
}
