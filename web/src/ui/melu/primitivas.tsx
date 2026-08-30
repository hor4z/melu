import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Icon } from '../src/icons/icon'

// Rótulo de sección: 14px, bold, mayúsculas, tracking 1.6px. Como los "OUR MISSION" de la landing.
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[13px] font-bold uppercase tracking-[0.115em] text-ink-subtle ${className}`}>{children}</p>
}

// Sparkline SVG puro.
export function Sparkline({ data, width = 96, height = 32, className = '' }: { data: number[]; width?: number; height?: number; className?: string }) {
  if (data.length < 2) return <svg width={width} height={height} className={className} aria-hidden="true" />
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${d} L${pts[pts.length - 1][0]} ${height} L${pts[0][0]} ${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={area} fill="currentColor" opacity=".12" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill="currentColor" />
    </svg>
  )
}

// Tile de métrica: tinte, ícono, número grande, delta y sparkline. Densidad tipo Minimal.
export function StatTile({ label, value, unit, delta, series, tint = 'bg-teal', icon, hint }: { label: string; value: string | number; unit?: string; delta?: number; series?: number[]; tint?: string; icon?: ReactNode; hint?: string }) {
  return (
    <div className={`relative flex flex-col gap-3 overflow-hidden rounded-xl ${tint} p-5`}>
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-lg bg-white/70 text-ink">{icon}</span>
        {typeof delta === 'number' && <span className={`rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums ${delta >= 0 ? 'text-success' : 'text-danger'}`}>{delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}%</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-ink-muted">{label}</div>
          <div className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}{unit && <span className="ml-1 text-base font-medium text-ink-muted">{unit}</span>}</div>
          {hint && <div className="mt-0.5 text-xs text-ink-subtle">{hint}</div>}
        </div>
        {series && <Sparkline data={series} className="text-ink/70" />}
      </div>
    </div>
  )
}

// Anillo de progreso.
export function ProgressRing({ value, size = 72, stroke = 7, children, className = '' }: { value: number; size?: number; stroke?: number; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value))
  return (
    <div className={`relative grid place-items-center ${className}`} style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} className="text-brand-text transition-[stroke-dashoffset] duration-500" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">{children ?? `${Math.round(v * 100)}%`}</div>
    </div>
  )
}

// Foto en marco blanco, borde tinta, apenas girada. Como el collage del hero.
export function PhotoFrame({ src, alt = '', rotate = 0, className = '', children }: { src?: string; alt?: string; rotate?: number; className?: string; children?: ReactNode }) {
  return (
    <figure className={`overflow-hidden rounded-lg border-2 border-ink bg-white p-2 shadow-[0_2px_0_0_var(--color-ink)] ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {src ? <img src={src} alt={alt} className="block h-full w-full rounded-md object-cover" /> : <div className="grid h-full w-full place-items-center rounded-md bg-muted">{children}</div>}
    </figure>
  )
}

// Acordeón horizontal de tarjetas: la activa se expande, las otras quedan como lomos con el título vertical.
export type NivelItem = { id: string; titulo: string; texto?: string; tint: string; ilustracion?: ReactNode; onClick?: () => void; accion?: string }
export function LevelAccordion({ items, defaultOpen = 0, height = 340 }: { items: NivelItem[]; defaultOpen?: number; height?: number }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="flex gap-3" style={{ height }} role="tablist">
      {items.map((it, i) => {
        const on = i === open
        return (
          <button key={it.id} type="button" role="tab" aria-selected={on} onClick={() => (on ? it.onClick?.() : setOpen(i))} onFocus={() => setOpen(i)}
            className={`relative flex overflow-hidden rounded-lg text-left transition-[flex-grow,box-shadow] duration-300 ease-out ${it.tint} ${on ? 'grow-[3] shadow-[0_0_0_2px_var(--color-ink)]' : 'grow-[0.55] hover:shadow-[0_0_0_2px_var(--color-ink)]'}`}>
            {on ? (
              <div className="flex w-full flex-col justify-between p-6">
                <div className="flex justify-center">{it.ilustracion}</div>
                <div>
                  <div className="font-display text-2xl font-semibold tracking-tight">{it.titulo}</div>
                  {it.texto && <p className="mt-1 text-sm text-ink-muted">{it.texto}</p>}
                  {it.accion && <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">{it.accion} <Icon icon={ChevronRight} size="sm" /></span>}
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-end justify-center pb-5"><span className="font-display text-xl font-semibold tracking-tight [writing-mode:vertical-rl] rotate-180">{it.titulo}</span></div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Indicador de pasos.
export function Stepper({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Pasos">
      {pasos.map((p, i) => (
        <li key={p} className="flex items-center gap-2">
          <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${i < actual ? 'bg-brand-text text-white' : i === actual ? 'bg-ink text-white' : 'border-2 border-line text-ink-subtle'}`}>{i < actual ? '✓' : i + 1}</span>
          <span className={`text-sm ${i === actual ? 'font-semibold' : 'text-ink-muted'}`}>{p}</span>
          {i < pasos.length - 1 && <span className="mx-1 h-px w-8 bg-line" />}
        </li>
      ))}
    </ol>
  )
}

// Subrayado dibujado bajo una palabra (hero).
export function Subrayado({ children }: { children: ReactNode }) {
  return <span className="relative inline-block"><span className="relative z-10">{children}</span><svg className="absolute -bottom-1 left-0 z-0 h-3 w-full text-brand-text" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8c20-6 40-6 60-2s28 2 36-2" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" /></svg></span>
}

// Número que cuenta hasta el valor al montarse.
export function Contador({ hasta, className = '' }: { hasta: number; className?: string }) {
  const [v, setV] = useState(0); const ref = useRef<number>(0)
  useEffect(() => { const t0 = performance.now(); const tick = (t: number) => { const k = Math.min(1, (t - t0) / 700); setV(Math.round(hasta * (1 - Math.pow(1 - k, 3)))); if (k < 1) ref.current = requestAnimationFrame(tick) }; ref.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(ref.current) }, [hasta])
  return <span className={`tabular-nums ${className}`}>{v}</span>
}
