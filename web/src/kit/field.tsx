import { createContext, useContext, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { cn } from './lib'
import { Icon } from './icon'

export type EstadoCampo = 'error' | 'warning' | 'success'

type Ctx = {
  id: string; descId: string; msgId: string
  tieneDesc: boolean; tieneMsg: boolean
  estado?: EstadoCampo; disabled?: boolean; required?: boolean
}
const FieldCtx = createContext<Ctx | null>(null)

/** Los controles del kit leen esto para heredar id, aria y estado sin que los cablees a mano. */
export function useField() { return useContext(FieldCtx) }

/** aria-* que corresponden al control dentro de un Field. */
export function ariaDeCampo(f: Ctx | null, propios: { id?: string; 'aria-describedby'?: string } = {}) {
  if (!f) return { ...propios, 'aria-invalid': undefined, 'aria-required': undefined, disabled: undefined } as const
  const desc = [f.tieneDesc && f.descId, f.tieneMsg && f.msgId, propios['aria-describedby']].filter(Boolean).join(' ')
  return {
    id: propios.id ?? f.id,
    'aria-describedby': desc || undefined,
    'aria-invalid': f.estado === 'error' || undefined,
    'aria-required': f.required || undefined,
    disabled: f.disabled,
  }
}

export interface FieldProps extends Omit<ComponentPropsWithoutRef<'div'>, 'id'> {
  /** Etiqueta corta. Si no la pasás, usá <FieldLabel> como hijo. */
  label?: ReactNode
  description?: ReactNode
  /** Mensaje con tono: rojo para error, ámbar para aviso, verde para confirmación. */
  status?: { type: EstadoCampo; message?: ReactNode }
  optional?: boolean
  required?: boolean
  disabled?: boolean
  /** Para grupos (radios, checkboxes): rinde fieldset/legend en vez de label. */
  asGroup?: boolean
}

export function Field({ label, description, status, optional, required, disabled, asGroup, className, children, ...props }: FieldProps) {
  const base = useId()
  const ctx: Ctx = {
    id: `${base}-c`, descId: `${base}-d`, msgId: `${base}-m`,
    tieneDesc: Boolean(description), tieneMsg: Boolean(status?.message),
    estado: status?.type, disabled, required,
  }
  const contenido = (
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
        ? <fieldset className={cn('flex min-w-0 flex-col gap-1.5', className)}>{contenido}</fieldset>
        : <div className={cn('flex min-w-0 flex-col gap-1.5', className)} {...props}>{contenido}</div>}
    </FieldCtx.Provider>
  )
}

export function FieldLabel({ className, children, optional, asLegend, ...props }: ComponentPropsWithoutRef<'label'> & { optional?: boolean; asLegend?: boolean }) {
  const f = useField()
  const contenido = <>{children}{optional && <span className="ml-1 font-normal text-ink-subtle">(opcional)</span>}{f?.required && !optional && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}</>
  if (asLegend) return <legend className={cn('text-sm font-semibold text-ink', className)}>{contenido}</legend>
  return <label htmlFor={f?.id} className={cn('text-sm font-semibold text-ink', f?.disabled && 'opacity-50', className)} {...props}>{contenido}</label>
}

export function FieldDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  const f = useField()
  return <p id={f?.descId} className={cn('text-[13px] leading-snug text-ink-muted', className)} {...props} />
}

const ICONO_ESTADO = { error: CircleAlert, warning: TriangleAlert, success: CircleCheck }
const COLOR_ESTADO = { error: 'text-danger', warning: 'text-warning', success: 'text-success' }

export function FieldStatus({ type = 'error', className, children, ...props }: ComponentPropsWithoutRef<'p'> & { type?: EstadoCampo }) {
  const f = useField()
  return (
    <p id={f?.msgId} role={type === 'error' ? 'alert' : undefined}
      className={cn('flex items-start gap-1.5 text-[13px] leading-snug', COLOR_ESTADO[type], className)} {...props}>
      <Icon icon={ICONO_ESTADO[type]} size="sm" className="mt-px" />
      <span>{children}</span>
    </p>
  )
}

/** Filas de formulario con separación consistente. */
export function Form({ className, ...props }: ComponentPropsWithoutRef<'form'>) {
  return <form className={cn('flex flex-col gap-5', className)} {...props} />
}
export function FormRow({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />
}
export function FormActions({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2 pt-1', className)} {...props} />
}
