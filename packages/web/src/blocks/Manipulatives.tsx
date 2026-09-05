import { useEffect, useRef, useState } from 'react'
import { cn } from '@/kit'
import type { Block, AnswerValue } from '../lib/api'
import type { StepState } from './Interactive'

type Props = { b: Block; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; status: StepState; reveal?: boolean }

const roundTo = (n: number, stepSize: number) => Math.round(n / stepSize) * stepSize
const clean = (n: number) => Number(n.toFixed(4))

/**
 * Figures you touch and drag, drawn in SVG.
 * This is what makes an idea land by moving it instead of reading about it.
 */
export function ManipulativeBlock(p: Props) {
  switch (p.b.figure) {
    case 'number_line': return <NumberLine {...p} />
    case 'fraction_bar': return <FractionBar {...p} />
    case 'balance': return <Balance {...p} />
    default: return null
  }
}

// ---------- Number line: drag the point to the value ----------
function NumberLine({ b, value, onChange, status, reveal }: Props) {
  const min = b.min ?? 0, max = b.max ?? 10, stepSize = b.step ?? 0.25
  const svg = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const locked = status !== 'editing'
  const v = typeof value === 'number' ? value : undefined
  const W = 640, H = 130, M = 40
  const x = (n: number) => M + ((n - min) / (max - min)) * (W - 2 * M)

  const fromEvent = (e: { clientX: number }) => {
    const r = svg.current?.getBoundingClientRect()
    if (!r) return min
    const px = ((e.clientX - r.left) / r.width) * W
    return clean(Math.min(max, Math.max(min, roundTo(min + ((px - M) / (W - 2 * M)) * (max - min), stepSize))))
  }
  const moveBy = (e: React.PointerEvent) => { if (dragging && !locked) onChange(fromEvent(e)) }

  // Marks: whole ones with a number, in-between ones shorter.
  const marks: { n: number; large: boolean }[] = []
  for (let n = min; n <= max + 1e-9; n = clean(n + stepSize)) marks.push({ n, large: Math.abs(n - Math.round(n)) < 1e-9 })

  const ok = v !== undefined && Math.abs(v - (b.answer ?? 0)) <= (b.tolerance ?? 0)

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="group"
      aria-label={`Recta numérica de ${min} a ${max}. Valor elegido: ${v ?? 'ninguno'}`}
      onPointerDown={(e) => { if (locked) return; setDragging(true); onChange(fromEvent(e)); (e.target as Element).setPointerCapture?.(e.pointerId) }}
      onPointerMove={moveBy} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
      <line x1={M} y1={72} x2={W - M} y2={72} stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round" />
      {marks.map((m, i) => (
        <g key={m.n} className="ui-reveal" style={{ animationDelay: `${Math.min(i * 14, 420)}ms` }}>
          <line x1={x(m.n)} y1={m.large ? 60 : 66} x2={x(m.n)} y2={m.large ? 84 : 78}
            stroke={m.large ? 'var(--text-muted)' : 'var(--border-strong)'} strokeWidth={m.large ? 2 : 1.5} strokeLinecap="round" />
          {m.large && <text x={x(m.n)} y={104} textAnchor="middle" fontSize="13" fill="var(--text-muted)">{m.n}</text>}
        </g>
      ))}
      {/* On reveal, where the answer was */}
      {reveal && b.answer !== undefined && !ok && (
        <g><line x1={x(b.answer)} y1={52} x2={x(b.answer)} y2={92} stroke="var(--success)" strokeWidth="2.5" strokeDasharray="4 4" />
          <text x={x(b.answer)} y={42} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--success)">acá</text></g>
      )}
      {v !== undefined && (
        <g style={{ transition: dragging ? 'none' : 'transform 220ms cubic-bezier(.24,1,.4,1)', transform: `translateX(${x(v) - x(min)}px)` }}>
          <line x1={x(min)} y1={58} x2={x(min)} y2={86} stroke="var(--color-ink)" strokeWidth="2" />
          <circle cx={x(min)} cy={72} r={dragging ? 15 : 12}
            fill={locked ? (ok ? 'var(--success)' : 'var(--danger)') : 'var(--color-ink)'} stroke="white" strokeWidth="3"
            style={{ transition: 'r 140ms ease-out, fill 200ms' }} />
          <text x={x(min)} y={32} textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--color-ink)">{v}</text>
        </g>
      )}
      {v === undefined && <text x={W / 2} y={32} textAnchor="middle" fontSize="14" fill="var(--text-subtle)" className="ui-nudge">Tocá la recta para poner el punto</text>}
    </svg>
  )
}

// ---------- Fraction bar: paint the parts ----------
function FractionBar({ b, value, onChange, status, reveal }: Props) {
  const parts = b.parts ?? 4
  const painted = typeof value === 'number' ? value : 0
  const locked = status !== 'editing'
  const W = 640, H = 120, M = 20
  const boxWidth = (W - 2 * M) / parts
  const goal = b.answer ?? 0
  const ok = painted === goal

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="group" aria-label={`Barra dividida en ${parts} partes, ${painted} pintadas`}>
        {Array.from({ length: parts }, (_, i) => {
          const isActive = i < painted
          return (
            <g key={i} onPointerDown={() => !locked && onChange(painted === i + 1 ? i : i + 1)} style={{ cursor: locked ? 'default' : 'pointer' }}>
              <rect x={M + i * boxWidth} y={26} width={boxWidth} height={62} rx="3"
                fill={isActive ? (locked ? (ok ? 'var(--success-subtle)' : 'var(--danger-subtle)') : 'var(--accent-subtle)') : 'var(--surface)'}
                stroke={isActive ? (locked ? (ok ? 'var(--success)' : 'var(--danger)') : 'var(--accent-text)') : 'var(--border-strong)'}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{ transition: 'fill 220ms cubic-bezier(.24,1,.4,1), stroke 220ms' }} />
              {/* Fill sweep while painting */}
              {isActive && <rect x={M + i * boxWidth} y={26} width={boxWidth} height={62} rx="3" fill="var(--accent-text)" fillOpacity="0.14" />}
            </g>
          )
        })}
        <text x={W / 2} y={112} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text-muted)">
          {painted}/{parts}{reveal && !ok && <tspan fill="var(--success)">  →  {goal}/{parts}</tspan>}
        </text>
      </svg>
      {!locked && <p className="text-sm text-ink-subtle">Tocá las partes para pintarlas.</p>}
    </div>
  )
}

// ---------- Balance: level the equation by moving weights ----------
function Balance({ b, value, onChange, status }: Props) {
  // The equation is a·x + b = c; the kid tries values of x and the balance tips.
  const a = b.coefA ?? 1, bb = b.coefB ?? 0, c = b.coefC ?? 0
  const x = typeof value === 'number' ? value : 0
  const left = a * x + bb
  const diff = left - c
  const tilt = Math.max(-14, Math.min(14, diff * 3))
  const locked = status !== 'editing'
  const [animating, setAnimating] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  const change = (d: number) => {
    if (locked) return
    onChange(Math.max(0, x + d))
    setAnimating(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setAnimating(false), 500)
  }

  const W = 640, H = 220
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label={`Balanza: ${a}x + ${bb} contra ${c}, con x = ${x}. ${diff === 0 ? 'Equilibrada' : diff > 0 ? 'Pesa más la izquierda' : 'Pesa más la derecha'}`}>
        <polygon points={`${W / 2 - 26},${H - 22} ${W / 2 + 26},${H - 22} ${W / 2},${H - 92}`} fill="var(--color-ink)" opacity=".9" />
        <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: `${W / 2}px ${H - 96}px`, transition: 'transform 520ms cubic-bezier(.24,1,.4,1)' }}>
          <line x1={W / 2 - 210} y1={H - 96} x2={W / 2 + 210} y2={H - 96} stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="round" />
          {[[-210, left, `${a}·${x}${bb ? ` + ${bb}` : ''}`], [210, c, String(c)]].map(([dx, weight, label], i) => (
            <g key={i} transform={`translate(${W / 2 + Number(dx)}, ${H - 96})`}>
              <line x1="0" y1="0" x2="0" y2="34" stroke="var(--border-strong)" strokeWidth="2" />
              <rect x="-58" y="34" width="116" height="46" rx="6" fill="var(--surface)" stroke="var(--color-ink)" strokeWidth="2" />
              <text x="0" y="58" textAnchor="middle" fontSize="13" fill="var(--text-muted)">{label}</text>
              <text x="0" y="74" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-ink)">{weight}</text>
            </g>
          ))}
        </g>
        {diff === 0 && <text x={W / 2} y={26} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--success)" className={cn(animating && 'ui-correct')}>¡Equilibrada!</text>}
      </svg>
      <div className="flex items-center gap-3">
        <button type="button" disabled={locked || x === 0} onClick={() => change(-1)}
          className="size-11 rounded-md border border-line bg-surface text-lg font-bold hover:border-ink disabled:opacity-40" aria-label="Menos uno">−</button>
        <span className="min-w-24 text-center"><span className="block text-xs text-ink-subtle">x vale</span><span className="block font-display text-2xl font-semibold tabular-nums">{x}</span></span>
        <button type="button" disabled={locked} onClick={() => change(1)}
          className="size-11 rounded-md border border-line bg-surface text-lg font-bold hover:border-ink disabled:opacity-40" aria-label="Más uno">+</button>
      </div>
    </div>
  )
}
