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

/** A radio with its label. Arrow keys move between options, as the practice demands. */
export function RadioGroupItem({ value, children, description, disabled, className, ...props }: RadioGroupItemProps) {
  const ctx = useContext(RadioCtx)
  if (!ctx) throw new Error('RadioGroupItem necesita un RadioGroup alrededor')
  const isOn = ctx.value === value
  const box = ctx.size === 'sm' ? 'size-4' : 'size-[18px]'
  const moveBy = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const keys2 = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
    if (!keys2.includes(e.key)) return
    e.preventDefault()
    const group = e.currentTarget.closest('[role="radiogroup"]')
    const items = [...(group?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)') ?? [])]
    const i = items.indexOf(e.currentTarget)
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
    const next = items[(i + step + items.length) % items.length]
    next?.focus(); next?.click()
  }
  return (
    <button
      type="button" role="radio" aria-checked={isOn} name={ctx.name} value={value}
      disabled={disabled ?? ctx.disabled} tabIndex={isOn || !ctx.value ? 0 : -1}
      onClick={() => ctx.setValue(value)} onKeyDown={moveBy}
      className={cn('group flex items-start gap-2.5 rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    >
      <span className={cn('mt-px grid shrink-0 place-items-center rounded-full border-2 transition-colors', box, isOn ? 'border-solid' : 'border-line-strong group-hover:border-ink')}>
        {isOn && <span className="size-2 rounded-full bg-solid" />}
      </span>
      {(children || description) && (
        <span className="min-w-0">{children}{description && <span className="mt-0.5 block text-[13px] font-normal text-ink-muted">{description}</span>}</span>
      )}
    </button>
  )
}

/** Card variant: the whole box is clickable. Good for picking a mode or a plan. */
export function RadioCard({ value, children, description, disabled, className, ...props }: RadioGroupItemProps) {
  const ctx = useContext(RadioCtx)
  const isOn = ctx?.value === value
  return (
    <RadioGroupItem value={value} disabled={disabled}
      className={cn('items-center rounded-xl border-2 p-4 transition-colors', isOn ? 'border-ink bg-accent-subtle' : 'border-line hover:border-ink', className)}
      {...props}>
      <span className="min-w-0"><span className="block font-semibold">{children}</span>{description && <span className="mt-0.5 block text-[13px] font-normal text-ink-muted">{description}</span>}</span>
    </RadioGroupItem>
  )
}
