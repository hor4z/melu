import { cn } from './lib'

const SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 } as const

export function Spinner({ size = 'md', className, label }: { size?: keyof typeof SIZES | number; className?: string; label?: string }) {
  const px = typeof size === 'number' ? size : SIZES[size]
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className={cn('inline-block shrink-0', className)}>
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}
