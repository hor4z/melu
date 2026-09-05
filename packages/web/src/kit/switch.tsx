import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn, useControllableState } from './lib'
import { Spinner } from './spinner'
import { ariaDeCampo, useField } from './field'

export interface SwitchProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange' | 'value' | 'children'> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  size?: 'sm' | 'md'
  loading?: boolean
  /** Etiqueta al lado del control. Sin esto, poné el Switch dentro de un Field. */
  children?: ReactNode
  /** Empuja la etiqueta contra el borde opuesto: útil en listas de ajustes. */
  spread?: boolean
}

const MEDIDAS = {
  sm: { pista: 'h-4.5 w-8', bola: 'size-3.5', on: 'translate-x-3.5' },
  md: { pista: 'h-5.5 w-10', bola: 'size-4.5', on: 'translate-x-4.5' },
}

export function Switch({ checked, defaultChecked = false, onCheckedChange, size = 'md', loading, disabled, children, spread, className, ...props }: SwitchProps) {
  const f = useField()
  const aria = ariaDeCampo(f)
  const [on, setOn] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange })
  const m = MEDIDAS[size]
  const inhabilitado = disabled ?? aria.disabled ?? loading

  const control = (
    <span className={cn('relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors', m.pista, on ? 'bg-solid' : 'bg-line-strong', inhabilitado && 'opacity-50')}>
      <span className={cn('grid place-items-center rounded-full bg-white shadow-sm transition-transform', m.bola, on ? m.on : 'translate-x-0')}>
        {loading && <Spinner size="xs" className="text-ink-muted" />}
      </span>
    </span>
  )

  return (
    <button
      type="button" role="switch" aria-checked={on} id={aria.id} aria-describedby={aria['aria-describedby']}
      disabled={inhabilitado} onClick={() => setOn(!on)}
      className={cn('group inline-flex items-center gap-2.5 rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-focus/30 disabled:cursor-not-allowed', spread && 'w-full justify-between', className)}
      {...props}
    >
      {spread ? <><span className="min-w-0">{children}</span>{control}</> : <>{control}<span className="min-w-0">{children}</span></>}
    </button>
  )
}
