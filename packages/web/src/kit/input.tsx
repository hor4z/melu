import { type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './lib'
import { Icon } from './icon'
import { Spinner } from './spinner'
import { ariaDeCampo, useField } from './field'

const marco = cva(
  'flex w-full items-center gap-2 rounded-md border bg-surface text-ink transition-[border-color,box-shadow] focus-within:ring-3 focus-within:ring-focus/25 has-disabled:bg-muted has-disabled:opacity-60',
  {
    variants: {
      size: { sm: 'h-8 px-2.5 text-[13px]', md: 'h-9.5 px-3 text-sm', lg: 'h-11 px-3.5 text-[15px]' },
      invalid: { true: 'border-danger focus-within:ring-danger/25', false: 'border-line focus-within:border-ink' },
    },
    defaultVariants: { size: 'md', invalid: false },
  },
)

export interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'>, VariantProps<typeof marco> {
  startIcon?: ReactNode
  endIcon?: ReactNode
  loading?: boolean
  /** Muestra una X para vaciar el campo cuando tiene texto. */
  clearable?: boolean
  onClear?: () => void
  ref?: Ref<HTMLInputElement>
}

export function Input({ className, size, invalid, startIcon, endIcon, loading, clearable, onClear, disabled, value, ...props }: InputProps) {
  const f = useField()
  const aria = ariaDeCampo(f, { id: props.id, 'aria-describedby': props['aria-describedby'] })
  const malo = invalid ?? (f?.estado === 'error')
  const hayTexto = typeof value === 'string' ? value.length > 0 : undefined
  return (
    <div className={cn(marco({ size, invalid: malo }), className)}>
      {startIcon && <span className="text-ink-subtle">{startIcon}</span>}
      <input
        {...props} {...aria} value={value} disabled={disabled ?? aria.disabled}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-subtle disabled:cursor-not-allowed"
      />
      {loading && <Spinner size="sm" className="text-ink-subtle" />}
      {clearable && hayTexto && !loading && (
        <button type="button" onClick={onClear} aria-label="Borrar" className="rounded p-0.5 text-ink-subtle hover:bg-hover hover:text-ink"><Icon icon={X} size="sm" /></button>
      )}
      {endIcon && <span className="text-ink-subtle">{endIcon}</span>}
    </div>
  )
}

export interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  invalid?: boolean
  /** Crece con el contenido en vez de mostrar scroll. */
  autoGrow?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ className, invalid, autoGrow, rows = 3, onChange, ...props }: TextareaProps) {
  const f = useField()
  const aria = ariaDeCampo(f, { id: props.id, 'aria-describedby': props['aria-describedby'] })
  const malo = invalid ?? (f?.estado === 'error')
  return (
    <textarea
      {...props} {...aria} rows={rows}
      onChange={(e) => { if (autoGrow) { e.target.style.height = '0'; e.target.style.height = `${e.target.scrollHeight}px` } onChange?.(e) }}
      className={cn(
        'w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus:ring-3 focus:ring-focus/25 disabled:bg-muted disabled:opacity-60',
        malo ? 'border-danger focus:ring-danger/25' : 'border-line focus:border-ink',
        autoGrow && 'resize-none overflow-hidden',
        className,
      )}
    />
  )
}
