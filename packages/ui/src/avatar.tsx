import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, Slot } from './lib'

const SIZES = { xs: 'size-6 text-2xs', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base', xl: 'size-16 text-xl' }
const TINTS = ['bg-teal', 'bg-yellow', 'bg-blue', 'bg-lilac', 'bg-orange', 'bg-cyan', 'bg-green', 'bg-pink']

const avatarVariants = cva('relative inline-grid shrink-0 place-items-center overflow-hidden font-semibold text-ink select-none', {
  variants: {
    size: SIZES,
    shape: { circle: 'rounded-full', rounded: 'rounded-lg', square: 'rounded-none' },
  },
  defaultVariants: { size: 'md', shape: 'circle' },
})

/** Initials: one word gives one letter, two or more give two. */
export function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p.length === 1 ? p[0].slice(0, 1) : p[0][0] + p[p.length - 1][0]).toUpperCase()
}
/** The same name always lands on the same tint: the group's face does not dance between reloads. */
export function tintOf(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

export interface AvatarProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'>, VariantProps<typeof avatarVariants> {
  name: string
  src?: string
  /** Status dot in the corner: online, pending, whatever you need. */
  status?: 'online' | 'busy' | 'away' | ReactNode
  asChild?: boolean
}

const STATUS_COLOR = { online: 'bg-success', busy: 'bg-danger', away: 'bg-warning' }

export function Avatar({ name, src, size, shape, status, asChild, className, ...props }: AvatarProps) {
  const [fails, setFails] = useState(false)
  const Cmp = asChild ? Slot : 'span'
  return (
    <Cmp className={cn(avatarVariants({ size, shape }), !src || fails ? tintOf(name) : 'bg-muted', className)} title={name} {...props}>
      {src && !fails
        ? <img src={src} alt={name} onError={() => setFails(true)} className="size-full object-cover" />
        : <span aria-hidden="true">{initials(name)}</span>}
      <span className="sr-only">{name}</span>
      {status && (typeof status === 'string' && status in STATUS_COLOR
        ? <span className={cn('absolute bottom-0 right-0 size-1/4 rounded-full ring-2 ring-surface', STATUS_COLOR[status as keyof typeof STATUS_COLOR])} />
        : <span className="absolute bottom-0 right-0">{status}</span>)}
    </Cmp>
  )
}

/** Stack of overlapping avatars; past `max` it shows “+N”. */
export function AvatarGroup({ names, max = 4, size = 'sm', className, ...props }: ComponentPropsWithoutRef<'div'> & { names: string[]; max?: number; size?: AvatarProps['size'] }) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <div className={cn('flex items-center -space-x-2', className)} {...props}>
      {shown.map((n) => <Avatar key={n} name={n} size={size} className="ring-2 ring-surface" />)}
      {rest > 0 && (
        <span className={cn(avatarVariants({ size }), 'bg-muted text-ink-muted ring-2 ring-surface')} title={names.slice(max).join(', ')}>+{rest}</span>
      )}
    </div>
  )
}
