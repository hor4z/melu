import { useEffect, useRef, useState } from 'react'
import { cn } from '@/kit'
import type { Bloque, ValorRespuesta } from '../lib/api'
import type { EstadoPaso } from './Interactivo'

type Props = { b: Bloque; valor: ValorRespuesta | undefined; onChange: (v: ValorRespuesta) => void; estado: EstadoPaso; revelar?: boolean }

const redondear = (n: number, paso: number) => Math.round(n / paso) * paso
const limpio = (n: number) => Number(n.toFixed(4))

/**
 * Figuras que se tocan y se arrastran, dibujadas en SVG.
 * Es lo que hace que una idea se entienda moviéndola en vez de leyéndola.
 */
export function Manipulable(p: Props) {
  switch (p.b.figura) {
    case 'recta': return <RectaNumerica {...p} />
    case 'fraccion': return <BarraDeFraccion {...p} />
    case 'balanza': return <Balanza {...p} />
    default: return null
  }
}

// ---------- Recta numérica: arrastrar el punto hasta el valor ----------
function RectaNumerica({ b, valor, onChange, estado, revelar }: Props) {
  const min = b.min ?? 0, max = b.max ?? 10, paso = b.paso ?? 0.25
  const svg = useRef<SVGSVGElement>(null)
  const [agarrando, setAgarrando] = useState(false)
  const bloqueado = estado !== 'editando'
  const v = typeof valor === 'number' ? valor : undefined
  const W = 640, H = 130, M = 40
  const x = (n: number) => M + ((n - min) / (max - min)) * (W - 2 * M)

  const desdeEvento = (e: { clientX: number }) => {
    const r = svg.current?.getBoundingClientRect()
    if (!r) return min
    const px = ((e.clientX - r.left) / r.width) * W
    return limpio(Math.min(max, Math.max(min, redondear(min + ((px - M) / (W - 2 * M)) * (max - min), paso))))
  }
  const mover = (e: React.PointerEvent) => { if (agarrando && !bloqueado) onChange(desdeEvento(e)) }

  // Marcas: enteras con número, intermedias más cortas.
  const marcas: { n: number; grande: boolean }[] = []
  for (let n = min; n <= max + 1e-9; n = limpio(n + paso)) marcas.push({ n, grande: Math.abs(n - Math.round(n)) < 1e-9 })

  const ok = v !== undefined && Math.abs(v - (b.respuesta ?? 0)) <= (b.tolerancia ?? 0)

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="group"
      aria-label={`Recta numérica de ${min} a ${max}. Valor elegido: ${v ?? 'ninguno'}`}
      onPointerDown={(e) => { if (bloqueado) return; setAgarrando(true); onChange(desdeEvento(e)); (e.target as Element).setPointerCapture?.(e.pointerId) }}
      onPointerMove={mover} onPointerUp={() => setAgarrando(false)} onPointerCancel={() => setAgarrando(false)}>
      <line x1={M} y1={72} x2={W - M} y2={72} stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round" />
      {marcas.map((m, i) => (
        <g key={m.n} className="kit-reveal" style={{ animationDelay: `${Math.min(i * 14, 420)}ms` }}>
          <line x1={x(m.n)} y1={m.grande ? 60 : 66} x2={x(m.n)} y2={m.grande ? 84 : 78}
            stroke={m.grande ? 'var(--text-muted)' : 'var(--border-strong)'} strokeWidth={m.grande ? 2 : 1.5} strokeLinecap="round" />
          {m.grande && <text x={x(m.n)} y={104} textAnchor="middle" fontSize="13" fill="var(--text-muted)">{m.n}</text>}
        </g>
      ))}
      {/* Al revelar, dónde estaba la respuesta */}
      {revelar && b.respuesta !== undefined && !ok && (
        <g><line x1={x(b.respuesta)} y1={52} x2={x(b.respuesta)} y2={92} stroke="var(--success)" strokeWidth="2.5" strokeDasharray="4 4" />
          <text x={x(b.respuesta)} y={42} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--success)">acá</text></g>
      )}
      {v !== undefined && (
        <g style={{ transition: agarrando ? 'none' : 'transform 220ms cubic-bezier(.24,1,.4,1)', transform: `translateX(${x(v) - x(min)}px)` }}>
          <line x1={x(min)} y1={58} x2={x(min)} y2={86} stroke="var(--color-ink)" strokeWidth="2" />
          <circle cx={x(min)} cy={72} r={agarrando ? 15 : 12}
            fill={bloqueado ? (ok ? 'var(--success)' : 'var(--danger)') : 'var(--color-ink)'} stroke="white" strokeWidth="3"
            style={{ transition: 'r 140ms ease-out, fill 200ms' }} />
          <text x={x(min)} y={32} textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--color-ink)">{v}</text>
        </g>
      )}
      {v === undefined && <text x={W / 2} y={32} textAnchor="middle" fontSize="14" fill="var(--text-subtle)" className="kit-nudge">Tocá la recta para poner el punto</text>}
    </svg>
  )
}

// ---------- Barra de fracción: pintar las partes ----------
function BarraDeFraccion({ b, valor, onChange, estado, revelar }: Props) {
  const partes = b.partes ?? 4
  const pintadas = typeof valor === 'number' ? valor : 0
  const bloqueado = estado !== 'editando'
  const W = 640, H = 120, M = 20
  const ancho = (W - 2 * M) / partes
  const objetivo = b.respuesta ?? 0
  const ok = pintadas === objetivo

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" role="group" aria-label={`Barra dividida en ${partes} partes, ${pintadas} pintadas`}>
        {Array.from({ length: partes }, (_, i) => {
          const activa = i < pintadas
          return (
            <g key={i} onPointerDown={() => !bloqueado && onChange(pintadas === i + 1 ? i : i + 1)} style={{ cursor: bloqueado ? 'default' : 'pointer' }}>
              <rect x={M + i * ancho} y={26} width={ancho} height={62} rx="3"
                fill={activa ? (bloqueado ? (ok ? 'var(--success-subtle)' : 'var(--danger-subtle)') : 'var(--accent-subtle)') : 'var(--surface)'}
                stroke={activa ? (bloqueado ? (ok ? 'var(--success)' : 'var(--danger)') : 'var(--accent-text)') : 'var(--border-strong)'}
                strokeWidth={activa ? 2.5 : 1.5}
                style={{ transition: 'fill 220ms cubic-bezier(.24,1,.4,1), stroke 220ms' }} />
              {/* Barrido de relleno al pintar */}
              {activa && <rect x={M + i * ancho} y={26} width={ancho} height={62} rx="3" fill="var(--accent-text)" fillOpacity="0.14" />}
            </g>
          )
        })}
        <text x={W / 2} y={112} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text-muted)">
          {pintadas}/{partes}{revelar && !ok && <tspan fill="var(--success)">  →  {objetivo}/{partes}</tspan>}
        </text>
      </svg>
      {!bloqueado && <p className="text-sm text-ink-subtle">Tocá las partes para pintarlas.</p>}
    </div>
  )
}

// ---------- Balanza: equilibrar la ecuación moviendo pesos ----------
function Balanza({ b, valor, onChange, estado }: Props) {
  // La ecuación es a·x + b = c; el chico prueba valores de x y la balanza se inclina.
  const a = b.coefA ?? 1, bb = b.coefB ?? 0, c = b.coefC ?? 0
  const x = typeof valor === 'number' ? valor : 0
  const izq = a * x + bb
  const dif = izq - c
  const inclinacion = Math.max(-14, Math.min(14, dif * 3))
  const bloqueado = estado !== 'editando'
  const [animando, setAnimando] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  const cambiar = (d: number) => {
    if (bloqueado) return
    onChange(Math.max(0, x + d))
    setAnimando(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setAnimando(false), 500)
  }

  const W = 640, H = 220
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" role="img" aria-label={`Balanza: ${a}x + ${bb} contra ${c}, con x = ${x}. ${dif === 0 ? 'Equilibrada' : dif > 0 ? 'Pesa más la izquierda' : 'Pesa más la derecha'}`}>
        <polygon points={`${W / 2 - 26},${H - 22} ${W / 2 + 26},${H - 22} ${W / 2},${H - 92}`} fill="var(--color-ink)" opacity=".9" />
        <g style={{ transform: `rotate(${inclinacion}deg)`, transformOrigin: `${W / 2}px ${H - 96}px`, transition: 'transform 520ms cubic-bezier(.24,1,.4,1)' }}>
          <line x1={W / 2 - 210} y1={H - 96} x2={W / 2 + 210} y2={H - 96} stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="round" />
          {[[-210, izq, `${a}·${x}${bb ? ` + ${bb}` : ''}`], [210, c, String(c)]].map(([dx, peso, etiqueta], i) => (
            <g key={i} transform={`translate(${W / 2 + Number(dx)}, ${H - 96})`}>
              <line x1="0" y1="0" x2="0" y2="34" stroke="var(--border-strong)" strokeWidth="2" />
              <rect x="-58" y="34" width="116" height="46" rx="6" fill="var(--surface)" stroke="var(--color-ink)" strokeWidth="2" />
              <text x="0" y="58" textAnchor="middle" fontSize="13" fill="var(--text-muted)">{etiqueta}</text>
              <text x="0" y="74" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-ink)">{peso}</text>
            </g>
          ))}
        </g>
        {dif === 0 && <text x={W / 2} y={26} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--success)" className={cn(animando && 'kit-correcto')}>¡Equilibrada!</text>}
      </svg>
      <div className="flex items-center gap-3">
        <button type="button" disabled={bloqueado || x === 0} onClick={() => cambiar(-1)}
          className="size-11 rounded-md border border-line bg-surface text-lg font-bold hover:border-ink disabled:opacity-40" aria-label="Menos uno">−</button>
        <span className="min-w-24 text-center"><span className="block text-xs text-ink-subtle">x vale</span><span className="block font-display text-2xl font-semibold tabular-nums">{x}</span></span>
        <button type="button" disabled={bloqueado} onClick={() => cambiar(1)}
          className="size-11 rounded-md border border-line bg-surface text-lg font-bold hover:border-ink disabled:opacity-40" aria-label="Más uno">+</button>
      </div>
    </div>
  )
}
