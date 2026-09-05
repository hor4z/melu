import { createContext, useContext, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { cn } from './lib'
import { Icon } from './icon'

export type FieldState = 'error' | 'warning' | 'success'

type Ctx = {
  id: string; descId: string; msgId: string
  hasDesc: boolean; hasMsg: boolean
  status?: FieldState; disabled?: boolean; required?: boolean
}
const FieldCtx = createContext<Ctx | null>(null)

/** The kit controls read this to inherit id, aria and state without wiring them by hand. */
export function useField() { return useContext(FieldCtx) }

/** the aria-* attributes that belong to the control inside a Field. */
export function fieldAria(f: Ctx | null, own: { id?: string; 'aria-describedby'?: string } = {}) {
  if (!f) return { ...own, 'aria-invalid': undefined, 'aria-required': undefined, disabled: undefined } as const
  const desc = [f.hasDesc && f.descId, f.hasMsg && f.msgId, own['aria-describedby']].filter(Boolean).join(' ')
  return {
    id: own.id ?? f.id,
    'aria-describedby': desc || undefined,
    'aria-invalid': f.status === 'error' || undefined,
    'aria-required': f.required || undefined,
    disabled: f.disabled,
  }
}

export interface FieldProps extends Omit<ComponentPropsWithoutRef<'div'>, 'id'> {
  /** Short label. If you do not pass it, use <FieldLabel> as a child. */
  label?: ReactNode
  description?: ReactNode
  /** Message with a tone: red for error, amber for warning, green for confirmation. */
  status?: { type: FieldState; message?: ReactNode }
  optional?: boolean
  required?: boolean
  disabled?: boolean
  /** For groups (radios, checkboxes): renders fieldset/legend instead of label. */
  asGroup?: boolean
}

export function Field({ label, description, status, optional, required, disabled, asGroup, className, children, ...props }: FieldProps) {
  const base = useId()
  const ctx: Ctx = {
    id: `${base}-c`, descId: `${base}-d`, msgId: `${base}-m`,
    hasDesc: Boolean(description), hasMsg: Boolean(status?.message),
    status: status?.type, disabled, required,
  }
  const content = (
    <>
        {label && <FieldLabel asLegend={asGroup} optional={optional}>{label}</FieldLabel>}
        {description && <FieldDescription>{description}</FieldDescription>}
        {children}
        {status?.message && <FieldStatus type={status.type}>{status.message}</FieldStatus>}
    </>
  )
  return (
    <FieldCtx.Provider value={ctx}>
      {asGroup
        ? <fieldset className={cn('flex min-w-0 flex-col gap-1.5', className)}>{content}</fieldset>
        : <div className={cn('flex min-w-0 flex-col gap-1.5', className)} {...props}>{content}</div>}
    </FieldCtx.Provider>
  )
}

export function FieldLabel({ className, children, optional, asLegend, ...props }: ComponentPropsWithoutRef<'label'> & { optional?: boolean; asLegend?: boolean }) {
  const f = useField()
  const content = <>{children}{optional && <span className="ml-1 font-normal text-ink-subtle">(opcional)</span>}{f?.required && !optional && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}</>
  if (asLegend) return <legend className={cn('text-sm font-semibold text-ink', className)}>{content}</legend>
  return <label htmlFor={f?.id} className={cn('text-sm font-semibold text-ink', f?.disabled && 'opacity-50', className)} {...props}>{content}</label>
}

export function FieldDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  const f = useField()
  return <p id={f?.descId} className={cn('text-sm leading-snug text-ink-muted', className)} {...props} />
}

const STATUS_ICON = { error: CircleAlert, warning: TriangleAlert, success: CircleCheck }
const STATUS_COLOR = { error: 'text-danger', warning: 'text-warning', success: 'text-success' }

export function FieldStatus({ type = 'error', className, children, ...props }: ComponentPropsWithoutRef<'p'> & { type?: FieldState }) {
  const f = useField()
  return (
    <p id={f?.msgId} role={type === 'error' ? 'alert' : undefined}
      className={cn('flex items-start gap-1.5 text-sm leading-snug', STATUS_COLOR[type], className)} {...props}>
      <Icon icon={STATUS_ICON[type]} size="sm" className="mt-px" />
      <span>{children}</span>
    </p>
  )
}

/** Form rows with consistent spacing. */
export function Form({ className, ...props }: ComponentPropsWithoutRef<'form'>) {
  return <form className={cn('flex flex-col gap-5', className)} {...props} />
}
export function FormRow({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />
}
export function FormActions({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2 pt-1', className)} {...props} />
}
