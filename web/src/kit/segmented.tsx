import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn, useControllableState } from './lib'

type Ctx = { value: string; setValue: (v: string) => void; size: 'sm' | 'md' | 'lg'; fill: boolean }
const SegCtx = createContext<Ctx | null>(null)

export interface SegmentedControlProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'defaultValue'> {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  size?: 'sm' | 'md' | 'lg'
  /** `fill` reparte el ancho entre las opciones. */
  layout?: 'hug' | 'fill'
  label?: string
}

const ALTO = { sm: 'h-8', md: 'h-9.5', lg: 'h-11' }

/** Un control de pocas opciones excluyentes, siempre visibles. Si son más de cinco, usá un Select. */
export function SegmentedControl({ value, defaultValue = '', onValueChange, size = 'md', layout = 'hug', label, className, children, ...props }: SegmentedControlProps) {
  const [val, setVal] = useControllableState({ value, defaultValue, onChange: onValueChange })
  return (
    <SegCtx.Provider value={{ value: val, setValue: setVal, size, fill: layout === 'fill' }}>
      <div role="radiogroup" aria-label={label}
        className={cn('inline-flex items-center gap-0.5 rounded-lg border border-line bg-muted p-1', ALTO[size], layout === 'fill' && 'flex w-full', className)} {...props}>
        {children}
      </div>
    </SegCtx.Provider>
  )
}

export function SegmentedControlItem({ value, className, children, disabled, ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'value'> & { value: string; children: ReactNode }) {
  const ctx = useContext(SegCtx)
  if (!ctx) throw new Error('SegmentedControlItem necesita un SegmentedControl alrededor')
  const activo = ctx.value === value
  const texto = ctx.size === 'sm' ? 'text-[13px]' : ctx.size === 'lg' ? 'text-[15px]' : 'text-sm'
  return (
    <button type="button" role="radio" aria-checked={activo} disabled={disabled} onClick={() => ctx.setValue(value)}
      className={cn('inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/30 disabled:opacity-45',
        texto, ctx.fill && 'flex-1', activo ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink', className)}
      {...props}>{children}</button>
  )
}
