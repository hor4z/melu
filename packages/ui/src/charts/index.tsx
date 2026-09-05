// Piezas de datos dibujadas a mano, sin librería. Genéricas: no saben de melu.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib'

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