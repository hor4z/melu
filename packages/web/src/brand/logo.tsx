// Lo único que sobrevive del kit viejo: la marca. El resto de la identidad la pone milo.
import { cn } from '../lib/cn'

/** La marca chica: el zigzag de tres trazos, la "m" dibujada a mano. */
export function Logomark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d="M6 8h16l-13 8h16l-13 8h16" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** La marca completa, una sola para toda la app. */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [px, text] = ({ sm: [22, 'text-reading'], md: [26, 'text-title'], lg: [38, 'text-heading'] } as const)[size]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logomark size={px} />
      <span className={cn('font-semibold tracking-tight', text)}>melu</span>
    </span>
  )
}
