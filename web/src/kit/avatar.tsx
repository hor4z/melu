import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, Slot } from './lib'

const TAMANOS = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base', xl: 'size-16 text-xl' }
const TINTES = ['bg-teal', 'bg-yellow', 'bg-blue', 'bg-lilac', 'bg-orange', 'bg-cyan', 'bg-green', 'bg-pink']

const avatarVariantes = cva('relative inline-grid shrink-0 place-items-center overflow-hidden font-semibold text-ink select-none', {
  variants: {
    size: TAMANOS,
    shape: { circle: 'rounded-full', rounded: 'rounded-lg', square: 'rounded-none' },
  },
  defaultVariants: { size: 'md', shape: 'circle' },
})

/** Iniciales: una palabra da una letra, dos o más dan dos. */
export function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p.length === 1 ? p[0].slice(0, 1) : p[0][0] + p[p.length - 1][0]).toUpperCase()
}
/** El mismo nombre siempre cae en el mismo tinte: la cara del grupo no baila entre recargas. */
export function tinteDe(nombre: string) {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTES[h % TINTES.length]
}

export interface AvatarProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'>, VariantProps<typeof avatarVariantes> {
  name: string
  src?: string
  /** Punto de estado en la esquina: en línea, pendiente, lo que necesites. */
  status?: 'online' | 'busy' | 'away' | ReactNode
  asChild?: boolean
}

const COLOR_ESTADO = { online: 'bg-success', busy: 'bg-danger', away: 'bg-warning' }

export function Avatar({ name, src, size, shape, status, asChild, className, ...props }: AvatarProps) {
  const [falla, setFalla] = useState(false)
  const Cmp = asChild ? Slot : 'span'
  return (
    <Cmp className={cn(avatarVariantes({ size, shape }), !src || falla ? tinteDe(name) : 'bg-muted', className)} title={name} {...props}>
      {src && !falla
        ? <img src={src} alt={name} onError={() => setFalla(true)} className="size-full object-cover" />
        : <span aria-hidden="true">{iniciales(name)}</span>}
      <span className="sr-only">{name}</span>
      {status && (typeof status === 'string' && status in COLOR_ESTADO
        ? <span className={cn('absolute bottom-0 right-0 size-1/4 rounded-full ring-2 ring-surface', COLOR_ESTADO[status as keyof typeof COLOR_ESTADO])} />
        : <span className="absolute bottom-0 right-0">{status}</span>)}
    </Cmp>
  )
}

/** Pila de avatares superpuestos; a partir de `max` muestra “+N”. */
export function AvatarGroup({ names, max = 4, size = 'sm', className, ...props }: ComponentPropsWithoutRef<'div'> & { names: string[]; max?: number; size?: AvatarProps['size'] }) {
  const visibles = names.slice(0, max)
  const resto = names.length - visibles.length
  return (
    <div className={cn('flex items-center -space-x-2', className)} {...props}>
      {visibles.map((n) => <Avatar key={n} name={n} size={size} className="ring-2 ring-surface" />)}
      {resto > 0 && (
        <span className={cn(avatarVariantes({ size }), 'bg-muted text-ink-muted ring-2 ring-surface')} title={names.slice(max).join(', ')}>+{resto}</span>
      )}
    </div>
  )
}
