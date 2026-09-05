import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn, useControllableState } from './lib'
import { Icon } from './icon'
import { ariaDeCampo, useField } from './field'

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'value' | 'children' | 'checked' | 'defaultChecked'> {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  size?: 'sm' | 'md'
  children?: ReactNode
  description?: ReactNode
}

export function Checkbox({ checked, defaultChecked = false, onCheckedChange, size = 'md', disabled, children, description, className, ...props }: CheckboxProps) {
  const f = useField()
  const aria = ariaDeCampo(f)
  const [val, setVal] = useControllableState<boolean | 'indeterminate'>({ value: checked, defaultValue: defaultChecked, onChange: (v) => onCheckedChange?.(v === true) })
  const marcado = val === true
  const medio = val === 'indeterminate'
  const caja = size === 'sm' ? 'size-4' : 'size-[18px]'
  return (
    <button
      type="button" role="checkbox" aria-checked={medio ? 'mixed' : marcado} id={aria.id} aria-describedby={aria['aria-describedby']}
      disabled={disabled ?? aria.disabled} onClick={() => setVal(!marcado)}
      className={cn('group flex items-start gap-2.5 rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    >
      <span className={cn('mt-px grid shrink-0 place-items-center rounded border-2 transition-colors', caja, marcado || medio ? 'border-solid bg-solid text-on-solid' : 'border-line-strong bg-surface group-hover:border-ink')}>
        {medio ? <Icon icon={Minus} size="sm" /> : marcado ? <Icon icon={Check} size="sm" /> : null}
      </span>
      {(children || description) && (
        <span className="min-w-0">
          {children}
          {description && <span className="mt-0.5 block text-[13px] font-normal text-ink-muted">{description}</span>}
        </span>
      )}
    </button>
  )
}
