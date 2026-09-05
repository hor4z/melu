import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn, focusRing, useControllableState } from './lib'
import { Spinner } from './spinner'
import { fieldAria, useField } from './field'

export interface SwitchProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'value' | 'children'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: 'sm' | 'md'
  loading?: boolean
  /** Label next to the control. Without this, put the Switch inside a Field. */
  children?: ReactNode
  /** Pushes the label to the opposite edge: useful in settings lists. */
  spread?: boolean
}

const MEASURES = {
  sm: { hint: 'h-4.5 w-8', ball: 'size-3.5', on: 'translate-x-3.5' },
  md: { hint: 'h-5.5 w-10', ball: 'size-4.5', on: 'translate-x-4.5' },
}

export function Switch({ checked, defaultChecked = false, onCheckedChange, size = 'md', loading, disabled, children, spread, className, ...props }: SwitchProps) {
  const f = useField()
  const aria = fieldAria(f)
  const [on, setOn] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange })
  const m = MEASURES[size]
  const isDisabled = disabled ?? aria.disabled ?? loading

  const control = (
    <span className={cn('relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors', m.hint, on ? 'bg-solid' : 'bg-line-strong', isDisabled && 'opacity-50')}>
      <span className={cn('grid place-items-center rounded-full bg-white shadow-sm transition-transform', m.ball, on ? m.on : 'translate-x-0')}>
        {loading && <Spinner size="xs" className="text-ink-muted" />}
      </span>
    </span>
  )

  return (
    <button
      type="button" role="switch" aria-checked={on} id={aria.id} aria-describedby={aria['aria-describedby']}
      disabled={isDisabled} onClick={() => setOn(!on)}
      className={cn(`group inline-flex items-center gap-2.5 rounded-md text-left text-sm disabled:cursor-not-allowed ${focusRing}`, spread && 'w-full justify-between', className)}
      {...props}
    >
      {spread ? <><span className="min-w-0">{children}</span>{control}</> : <>{control}<span className="min-w-0">{children}</span></>}
    </button>
  )
}
