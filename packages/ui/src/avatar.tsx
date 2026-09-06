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
// FNV-1a con una mezcla final. El `h * 31` de toda la vida alcanza para repartir en ocho
// tintes, pero acá se le piden seis rasgos a la vez leyendo pedacitos del número, y un nombre
// corto da un número chico: los bits de arriba quedaban en cero y "Ana", "Leo" y "Sol" caían
// en la misma boca y la misma separación de ojos. La mezcla lleva entropía a todos los bits.
function hashOf(name: string) {
  let h = 2166136261
  for (const c of name) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}
/** The same name always lands on the same tint: the group's face does not dance between reloads. */
export function tintOf(name: string) {
  return TINTS[hashOf(name) % TINTS.length]
}

const FACE_COLORS = [
  'var(--color-teal-500)', 'var(--color-cyan-500)', 'var(--color-purple-500)',
  'var(--color-orange-500)', 'var(--color-green-500)', 'var(--color-red-500)',
]
// Bit slices and not decimal digits: a short name gives a small hash, and the tens of
// thousands place of `Ana` is always zero. With digits, every three-letter name shared the same
// mouth and the same eye spacing, and short names are the norm here.
const slice = (h: number, at: number) => (h >>> at) & 7

function Figure({ name }: { name: string }) {
  const h = hashOf(name)
  const color = FACE_COLORS[h % FACE_COLORS.length]
  const dx = (slice(h, 3) % 5) - 2
  const dy = (slice(h, 6) % 5) - 2
  const tilt = slice(h, 9) - 3
  const eyeY = 14 + (slice(h, 12) % 3)
  const gap = 5 + (slice(h, 15) % 3)
  const mouth = slice(h, 18) % 3
  return (
    <svg viewBox="0 0 36 36" className="size-full" aria-hidden="true">
      <rect width="36" height="36" fill={color} />
      <g transform={`translate(${dx} ${dy}) rotate(${tilt} 18 18)`} fill="var(--color-white)">
        <rect x={17 - gap} y={eyeY} width="2.5" height="4" rx="1.25" />
        <rect x={16.5 + gap} y={eyeY} width="2.5" height="4" rx="1.25" />
        {mouth === 0 && (
          <path d="M13 24q5 4.5 10 0" fill="none" stroke="var(--color-white)" strokeWidth="2" strokeLinecap="round" />
        )}
        {mouth === 1 && <rect x="14" y="24" width="8" height="2" rx="1" />}
        {mouth === 2 && <circle cx="18" cy="25" r="2" />}
      </g>
    </svg>
  )
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
  const photo = src && !fails
  return (
    <Cmp className={cn(avatarVariants({ size, shape }), photo ? 'bg-muted' : tintOf(name), className)} title={name} {...props}>
      {photo
        ? <img src={src} alt={name} onError={() => setFails(true)} className="size-full object-cover"
            // Sin esto el navegador manda el referrer y los avatares de terceros (Google entre
            // ellos) contestan con un error. La foto se cae a la figura y parece un bug del kit.
            referrerPolicy="no-referrer" loading="lazy" />
        : <Figure name={name} />}
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
