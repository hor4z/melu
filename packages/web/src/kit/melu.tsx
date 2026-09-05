// melu's own pieces, built on the kit. They live here so there are not two systems.
import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { ChevronDown, LogOut, RefreshCw, User } from 'lucide-react'
import { cn } from './lib'
import { Icon } from './icon'
import { Avatar } from './avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown'

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

/** Minimal trend line, no library. */
export function Sparkline({ data, width = 96, height = 32, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (data.length < 2) return <svg width={width} height={height} className={className} aria-hidden="true" />
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={`${d} L${pts[pts.length - 1][0]} ${height} L${pts[0][0]} ${height} Z`} fill="currentColor" opacity=".12" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill="currentColor" />
    </svg>
  )
}

/** Metric with a tint, a big number and a trend. The dashboard's unit. */
export function StatTile({ label, value, unit, delta, series, tint = 'bg-teal', icon, hint }: {
  label: string; value: string | number; unit?: string; delta?: number; series?: number[]; tint?: string; icon?: ReactNode; hint?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 overflow-hidden rounded-xl p-5', tint)}>
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-lg bg-white/70 text-ink">{icon}</span>
        {typeof delta === 'number' && (
          <span className={cn('rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums', delta >= 0 ? 'text-success' : 'text-danger')}>
            {delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-ink-muted">{label}</div>
          <div className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {value}{unit && <span className="ml-1 text-base font-medium text-ink-muted">{unit}</span>}
          </div>
          {hint && <div className="mt-0.5 text-xs text-ink-subtle">{hint}</div>}
        </div>
        {series && <Sparkline data={series} className="text-ink/70" />}
      </div>
    </div>
  )
}

export function ProgressRing({ value, size = 72, stroke = 7, children, className }: { value: number; size?: number; stroke?: number; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value))
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} className="text-accent transition-[stroke-dashoffset] duration-500" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">{children ?? `${Math.round(v * 100)}%`}</div>
    </div>
  )
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Pasos">
      {steps.map((p, i) => (
        <li key={p} className="flex items-center gap-2">
          <span className={cn('grid size-7 place-items-center rounded-full text-xs font-bold',
            i < current ? 'bg-accent text-white' : i === current ? 'bg-solid text-on-solid' : 'border-2 border-line text-ink-subtle')}>
            {i < current ? '✓' : i + 1}
          </span>
          <span className={cn('text-sm', i === current ? 'font-semibold' : 'text-ink-muted')}>{p}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-line" />}
        </li>
      ))}
    </ol>
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

export function Counter({ to, className }: { to: number; className?: string }) {
  const [v, setV] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const t0 = performance.now()
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / 700); setV(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf.current = requestAnimationFrame(tick) }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [to])
  return <span className={cn('tabular-nums', className)}>{v}</span>
}

/** Photo in a white frame with an ink border, slightly rotated. */
export function PhotoFrame({ src, alt = '', rotate = 0, className, children }: ComponentPropsWithoutRef<'figure'> & { src?: string; alt?: string; rotate?: number }) {
  return (
    <figure className={cn('overflow-hidden rounded-lg border-2 border-ink bg-white p-2', className)} style={{ transform: `rotate(${rotate}deg)` }}>
      {src ? <img src={src} alt={alt} className="block h-full w-full rounded-md object-cover" /> : <div className="grid h-full w-full place-items-center rounded-md bg-muted">{children}</div>}
    </figure>
  )
}

/** Avatar that opens the account menu. */
export function UserMenu({ name, email, subtitle, onProfile, onChangeSpace, onSignOut }: {
  name: string; email?: string; subtitle?: string; onProfile?: () => void; onChangeSpace?: () => void; onSignOut: () => void
}) {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger>
        <button type="button" className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30" aria-label="Menú de la cuenta">
          <Avatar name={name} size="sm" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium">{name}</span>
            {subtitle && <span className="block text-xs text-ink-subtle">{subtitle}</span>}
          </span>
          <Icon icon={ChevronDown} size="sm" color="subtle" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent minWidth={230}>
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold normal-case tracking-normal text-ink">{name}</span>
          {email && <span className="block text-xs font-normal normal-case tracking-normal text-ink-subtle">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onProfile && <DropdownMenuItem icon={<Icon icon={User} size="sm" />} onClick={onProfile}>Mi perfil</DropdownMenuItem>}
        {onChangeSpace && <DropdownMenuItem icon={<Icon icon={RefreshCw} size="sm" />} onClick={onChangeSpace}>Cambiar de espacio</DropdownMenuItem>}
        {(onProfile || onChangeSpace) && <DropdownMenuSeparator />}
        <DropdownMenuItem icon={<Icon icon={LogOut} size="sm" />} destructive onClick={onSignOut}>Salir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
