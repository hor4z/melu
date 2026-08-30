// El logo, uno solo para toda la app. Un zigzag de tres trazos: la "m" de melu hecha con la mano.
export function Logomark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d="M6 8h16l-13 8h16l-13 8h16" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: [22, 'text-base'], md: [28, 'text-xl'], lg: [40, 'text-3xl'] }[size] as [number, string]
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <Logomark size={s[0]} />
      <span className={`font-display font-semibold tracking-tight ${s[1]}`}>melu</span>
    </span>
  )
}
