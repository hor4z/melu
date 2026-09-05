// La identidad visual de melu: el logo y los gestos dibujados a mano.
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../lib'

/** The logo, one for the whole app: a three-stroke zigzag, the “m” drawn by hand. */
export function Logomark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d="M6 8h16l-13 8h16l-13 8h16" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [px, text] = ({ sm: [22, 'text-base'], md: [28, 'text-xl'], lg: [40, 'text-3xl'] } as const)[size]
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <Logomark size={px} />
      <span className={cn('font-display font-semibold tracking-tight', text)}>melu</span>
    </span>
  )
}
/** Hand-drawn underline beneath a word. Used once per page, in the title. */
export function Squiggle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <svg className="absolute -bottom-1 left-0 z-0 h-3 w-full text-accent" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 8c20-6 40-6 60-2s28 2 36-2" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}
/** Photo in a white frame with an ink border, slightly rotated. */
export function PhotoFrame({ src, alt = '', rotate = 0, className, children }: ComponentPropsWithoutRef<'figure'> & { src?: string; alt?: string; rotate?: number }) {
  return (
    <figure className={cn('overflow-hidden rounded-lg border-2 border-ink bg-white p-2', className)} style={{ transform: `rotate(${rotate}deg)` }}>
      {src ? <img src={src} alt={alt} className="block h-full w-full rounded-sm object-cover" /> : <div className="grid h-full w-full place-items-center rounded-sm bg-muted">{children}</div>}
    </figure>
  )
}
