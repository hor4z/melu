import { createContext, useContext, useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn, useControllableState } from './lib'
import { ariaDeCampo, useField } from './field'

type Ctx = { value: string; setValue: (v: string) => void; name: string; disabled?: boolean; size: 'sm' | 'md' }
const RadioCtx = createContext<Ctx | null>(null)

export interface RadioGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'defaultValue'> {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  name?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  orientation?: 'vertical' | 'horizontal'
}

export function RadioGroup({ value, defaultValue = '', onValueChange, name, disabled, size = 'md', orientation = 'vertical', className, children, ...props }: RadioGroupProps) {
  const f = useField()
  const [val, setVal] = useControllableState({ value, defaultValue, onChange: onValueChange })
  const auto = useRef(`r${Math.random().toString(36).slice(2, 8)}`)
  return (
    <RadioCtx.Provider value={{ value: val, setValue: setVal, name: name ?? auto.current, disabled: disabled ?? f?.disabled, size }}>
      <div role="radiogroup" aria-describedby={ariaDeCampo(f)['aria-describedby']}
        className={cn('flex gap-2', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center gap-4', className)} {...props}>
        {children}
      </div>
    </RadioCtx.Provider>
  )
}

export interface RadioGroupItemProps extends Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'children'> {
  value: string
  children?: ReactNode
  description?: ReactNode
}

/** Un radio con su etiqueta. Las flechas mueven entre opciones, como manda la práctica. */
export function RadioGroupItem({ value, children, description, disabled, className, ...props }: RadioGroupItemProps) {
  const ctx = useContext(RadioCtx)
  if (!ctx) throw new Error('RadioGroupItem necesita un RadioGroup alrededor')
  const activo = ctx.value === value
  const caja = ctx.size === 'sm' ? 'size-4' : 'size-[18px]'
  const mover = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const teclas = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
    if (!teclas.includes(e.key)) return
    e.preventDefault()
    const grupo = e.currentTarget.closest('[role="radiogroup"]')
    const items = [...(grupo?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)') ?? [])]
    const i = items.indexOf(e.currentTarget)
    const paso = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
    const next = items[(i + paso + items.length) % items.length]
    next?.focus(); next?.click()
  }
  return (
    <button
      type="button" role="radio" aria-checked={activo} name={ctx.name} value={value}
      disabled={disabled ?? ctx.disabled} tabIndex={activo || !ctx.value ? 0 : -1}
      onClick={() => ctx.setValue(value)} onKeyDown={mover}
      className={cn('group flex items-start gap-2.5 rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    >
      <span className={cn('mt-px grid shrink-0 place-items-center rounded-full border-2 transition-colors', caja, activo ? 'border-solid' : 'border-line-strong group-hover:border-ink')}>
        {activo && <span className="size-2 rounded-full bg-solid" />}
      </span>
      {(children || description) && (
        <span className="min-w-0">{children}{description && <span className="mt-0.5 block text-[13px] font-normal text-ink-muted">{description}</span>}</span>
      )}
    </button>
  )
}

/** Variante en tarjeta: toda la caja es clickeable. Buena para elegir modo o plan. */
export function RadioCard({ value, children, description, disabled, className, ...props }: RadioGroupItemProps) {
  const ctx = useContext(RadioCtx)
  const activo = ctx?.value === value
  return (
    <RadioGroupItem value={value} disabled={disabled}
      className={cn('items-center rounded-xl border-2 p-4 transition-colors', activo ? 'border-ink bg-accent-subtle' : 'border-line hover:border-ink', className)}
      {...props}>
      <span className="min-w-0"><span className="block font-semibold">{children}</span>{description && <span className="mt-0.5 block text-[13px] font-normal text-ink-muted">{description}</span>}</span>
    </RadioGroupItem>
  )
}
