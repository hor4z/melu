import { useCallback, useRef, useState, type ComponentPropsWithoutRef, type PointerEvent as RPointerEvent } from 'react'
import { cn, useControllableState } from './lib'
import { ariaDeCampo, useField } from './field'

export interface SliderProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'defaultValue'> {
  /** Un número para un valor; dos para un rango. */
  value?: number | [number, number]
  defaultValue?: number | [number, number]
  onValueChange?: (v: number | [number, number]) => void
  /** Se dispara al soltar: útil para pegarle al servidor una sola vez. */
  onValueCommit?: (v: number | [number, number]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  marks?: { value: number; label?: string }[]
  formatValue?: (v: number) => string
  valueDisplay?: 'tooltip' | 'text' | 'none'
  minStepsBetweenThumbs?: number
  label?: string
}

const aArray = (v: number | [number, number]) => (Array.isArray(v) ? [...v] : [v])

export function Slider({
  value, defaultValue = 0, onValueChange, onValueCommit, min = 0, max = 100, step = 1,
  disabled, marks, formatValue = String, valueDisplay = 'tooltip', minStepsBetweenThumbs = 0, label, className, ...props
}: SliderProps) {
  const f = useField()
  const aria = ariaDeCampo(f)
  const [val, setVal] = useControllableState<number | [number, number]>({ value, defaultValue, onChange: onValueChange })
  const nums = aArray(val)
  const rango = nums.length === 2
  const pista = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState<number | null>(null)
  const pct = (n: number) => ((n - min) / (max - min)) * 100

  const emitir = useCallback((i: number, bruto: number, commit = false) => {
    const alPaso = Math.round((bruto - min) / step) * step + min
    const sep = minStepsBetweenThumbs * step
    let n = Math.min(max, Math.max(min, alPaso))
    if (rango) n = i === 0 ? Math.min(n, nums[1] - sep) : Math.max(n, nums[0] + sep)
    const next = [...nums]; next[i] = Number(n.toFixed(10))
    const salida = (rango ? (next as [number, number]) : next[0])
    setVal(salida)
    if (commit) onValueCommit?.(salida)
  }, [min, max, step, rango, nums, minStepsBetweenThumbs, setVal, onValueCommit])

  const desdeEvento = (e: { clientX: number }) => {
    const r = pista.current?.getBoundingClientRect()
    if (!r) return min
    return min + ((e.clientX - r.left) / r.width) * (max - min)
  }
  const alApretar = (e: RPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    const bruto = desdeEvento(e)
    const i = rango ? (Math.abs(bruto - nums[0]) <= Math.abs(bruto - nums[1]) ? 0 : 1) : 0
    setActivo(i); emitir(i, bruto)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const alMover = (e: RPointerEvent<HTMLDivElement>) => { if (activo !== null && !disabled) emitir(activo, desdeEvento(e)) }
  const alSoltar = () => { if (activo !== null) { onValueCommit?.(val); setActivo(null) } }

  const alTeclear = (i: number) => (e: React.KeyboardEvent<HTMLSpanElement>) => {
    const grande = (max - min) / 10
    const mapa: Record<string, number> = {
      ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step,
      PageUp: grande, PageDown: -grande,
    }
    if (e.key === 'Home') { e.preventDefault(); return emitir(i, min, true) }
    if (e.key === 'End') { e.preventDefault(); return emitir(i, max, true) }
    const d = mapa[e.key]
    if (d === undefined) return
    e.preventDefault()
    emitir(i, nums[i] + d * (e.shiftKey ? 10 : 1), true)
  }

  return (
    <div className={cn('flex flex-col gap-2', disabled && 'opacity-50', className)} {...props}>
      {valueDisplay === 'text' && (
        <output className="text-sm font-semibold tabular-nums">{nums.map(formatValue).join(' – ')}</output>
      )}
      <div ref={pista} onPointerDown={alApretar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}
        className={cn('relative flex h-5 items-center', disabled ? 'cursor-not-allowed' : 'cursor-pointer touch-none')}>
        <span className="absolute inset-x-0 h-1.5 rounded-full bg-muted" />
        <span className="absolute h-1.5 rounded-full bg-solid" style={{ left: `${rango ? pct(nums[0]) : 0}%`, right: `${100 - pct(nums[rango ? 1 : 0])}%` }} />
        {marks?.map((m) => (
          <span key={m.value} className="absolute -translate-x-1/2" style={{ left: `${pct(m.value)}%` }}>
            <span className="block size-1 rounded-full bg-line-strong" />
          </span>
        ))}
        {nums.map((n, i) => (
          <span key={i} role="slider" tabIndex={disabled ? -1 : 0}
            aria-label={label ?? (rango ? (i === 0 ? 'Mínimo' : 'Máximo') : undefined)} aria-describedby={aria['aria-describedby']}
            aria-valuemin={min} aria-valuemax={max} aria-valuenow={n} aria-valuetext={formatValue(n)} aria-disabled={disabled}
            onKeyDown={alTeclear(i)}
            className="group absolute size-5 -translate-x-1/2 rounded-full border-2 border-solid bg-surface shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-focus/30"
            style={{ left: `${pct(n)}%` }}>
            {valueDisplay === 'tooltip' && (
              <span className={cn('pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-white opacity-0 transition-opacity tabular-nums group-hover:opacity-100 group-focus-visible:opacity-100', activo === i && 'opacity-100')}>
                {formatValue(n)}
              </span>
            )}
          </span>
        ))}
      </div>
      {marks && marks.some((m) => m.label) && (
        <div className="relative h-4">
          {marks.map((m) => m.label && (
            <span key={m.value} className="absolute -translate-x-1/2 text-xs text-ink-muted" style={{ left: `${pct(m.value)}%` }}>{m.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}
