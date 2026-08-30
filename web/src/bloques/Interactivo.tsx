import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Camera, Check, Mic, Paperclip, X } from 'lucide-react'
import { Chip, Icon, Input, Textarea, cn } from '@/kit'
import type { Bloque, ValorRespuesta } from '../lib/api'

export type EstadoPaso = 'editando' | 'correcto' | 'incorrecto' | 'revision'

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Parte «Un {{número}} más su mitad» en trozos de texto y huecos. */
export function partirHuecos(texto: string) {
  return texto.split(/(\{\{[^}]*\}\})/g).map((t) => (t.startsWith('{{') ? { hueco: true, texto: t.slice(2, -2).trim() } : { hueco: false, texto: t }))
}

/** ¿Está bien? `null` cuando el bloque no se corrige solo (pregunta abierta, evidencia, autoreporte). */
export function evaluar(b: Bloque, v: ValorRespuesta | undefined): boolean | null {
  if (v === undefined || v === null || v === '') return null
  switch (b.tipo) {
    case 'opciones': case 'chequeo':
      return b.correcta === undefined ? null : v === b.correcta
    case 'varias': {
      const esperado = [...(b.correctas ?? [])].sort()
      const dado = [...(v as number[])].sort()
      return esperado.length > 0 && esperado.length === dado.length && esperado.every((x, i) => x === dado[i])
    }
    case 'numerico': {
      if (b.respuesta === undefined) return null
      const n = Number(String(v).replace(',', '.'))
      return Number.isFinite(n) && Math.abs(n - b.respuesta) <= (b.tolerancia ?? 0)
    }
    case 'completar': {
      const esperado = b.huecos ?? []
      const dado = v as string[]
      return esperado.length > 0 && esperado.every((h, i) => norm(dado?.[i] ?? '') === norm(h))
    }
    case 'ordenar': {
      const dado = v as string[]
      return (b.items ?? []).every((it, i) => dado?.[i] === it)
    }
    case 'emparejar': {
      const dado = v as number[]
      return (b.pares ?? []).length > 0 && (b.pares ?? []).every((_, i) => dado?.[i] === i)
    }
    default:
      return null
  }
}

/** ¿Hay algo cargado como para poder comprobar? */
export function tieneValor(v: ValorRespuesta | undefined): boolean {
  if (v === undefined || v === null) return false
  if (Array.isArray(v)) return v.length > 0 && v.every((x) => x !== '' && x !== -1 && x !== undefined)
  return String(v).trim() !== ''
}

/** Los bloques que solo se leen. */
export function BloqueLectura({ b }: { b: Bloque }) {
  switch (b.tipo) {
    case 'titulo': return <h2 className="font-display text-2xl font-semibold tracking-tight">{b.texto}</h2>
    case 'lista': return <ul className="list-disc space-y-1.5 pl-6 text-lg leading-relaxed">{b.texto.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
    case 'destacado': return <div className="rounded-xl border-l-4 border-accent bg-teal px-5 py-4"><p className="text-lg font-medium text-ink">{b.texto}</p></div>
    default: return <p className="text-lg leading-relaxed">{b.texto}</p>
  }
}

type Props = {
  b: Bloque
  valor: ValorRespuesta | undefined
  onChange: (v: ValorRespuesta) => void
  estado: EstadoPaso
  /** Si es `false`, un error no delata cuál era la buena: todavía puede volver a intentar. */
  revelar?: boolean
}

const marcoOpcion = (elegida: boolean, correcta: boolean, estado: EstadoPaso, revelar: boolean) => {
  if (revelar && correcta) return 'border-success bg-success-subtle'
  if (estado !== 'editando' && elegida && !correcta) return 'border-danger bg-danger-subtle'
  if (elegida) return 'border-ink bg-accent-subtle'
  return 'border-line bg-surface hover:border-ink'
}

/** Los bloques con los que el chico interactúa. Cada tipo es su propio componente
 *  para que los hooks vivan siempre en el mismo lugar. */
export function BloqueInteractivo({ revelar = true, ...rest }: Props) {
  const p = { ...rest, revelar: revelar || rest.estado === 'correcto' }
  switch (p.b.tipo) {
    case 'opciones': case 'chequeo': return <Opciones {...p} />
    case 'varias': return <Varias {...p} />
    case 'numerico': return <Numerico {...p} />
    case 'completar': return <Completar {...p} />
    case 'ordenar': return <Ordenar {...p} />
    case 'emparejar': return <Emparejar {...p} />
    case 'pregunta': return <Abierta {...p} />
    case 'autoreporte': return <Autoreporte {...p} />
    case 'evidencia': return <Evidencia {...p} />
    default: return null
  }
}

function Opciones({ b, valor, onChange, estado, revelar }: Props) {
  const ops = b.opciones ?? []
  return (
    <div className={cn('grid gap-3', ops.length > 3 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
      {ops.map((o, i) => (
        <button key={i} type="button" disabled={estado !== 'editando'} onClick={() => onChange(i)}
          className={cn('flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-base transition-colors disabled:cursor-default', marcoOpcion(valor === i, b.correcta === i, estado, Boolean(revelar)))}>
          <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-current text-xs font-bold opacity-40">{String.fromCharCode(65 + i)}</span>
          <span className="flex-1">{o}</span>
          {revelar && b.correcta === i && <Icon icon={Check} className="text-success" />}
          {estado !== 'editando' && valor === i && b.correcta !== i && <Icon icon={X} className="text-danger" />}
        </button>
      ))}
    </div>
  )
}

function Varias({ b, valor, onChange, estado, revelar }: Props) {
  const elegidas = (valor as number[]) ?? []
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(b.opciones ?? []).map((o, i) => {
        const on = elegidas.includes(i)
        return (
          <button key={i} type="button" disabled={estado !== 'editando'}
            onClick={() => onChange(on ? elegidas.filter((x) => x !== i) : [...elegidas, i])}
            className={cn('flex items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-base transition-colors disabled:cursor-default', marcoOpcion(on, (b.correctas ?? []).includes(i), estado, Boolean(revelar)))}>
            <span className={cn('grid size-6 shrink-0 place-items-center rounded border-2', on ? 'border-ink bg-solid text-on-solid' : 'border-line-strong')}>{on && <Icon icon={Check} size="sm" />}</span>
            <span className="flex-1">{o}</span>
          </button>
        )
      })}
    </div>
  )
}

function Numerico({ b, valor, onChange, estado }: Props) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Input inputMode="decimal" size="lg" disabled={estado !== 'editando'} value={String(valor ?? '')} onChange={(e) => onChange(e.target.value)}
        placeholder="0" aria-label={b.texto}
        className={cn('max-w-40 text-center font-display text-2xl', estado === 'correcto' && 'border-success', estado === 'incorrecto' && 'border-danger')} />
      {b.unidad && <span className="text-lg text-ink-muted">{b.unidad}</span>}
    </div>
  )
}

function Completar({ b, valor, onChange, estado, revelar }: Props) {
  const trozos = partirHuecos(b.texto)
  const dado = (valor as string[]) ?? []
  let n = -1
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-3 text-lg leading-relaxed">
      {trozos.map((t, i) => {
        if (!t.hueco) return <span key={i}>{t.texto}</span>
        n += 1
        const k = n
        const ok = norm(dado[k] ?? '') === norm(b.huecos?.[k] ?? '')
        return (
          <span key={i} className="inline-flex flex-col items-center">
            <input value={dado[k] ?? ''} disabled={estado !== 'editando'} aria-label={`Hueco ${k + 1}`}
              onChange={(e) => { const c = [...dado]; c[k] = e.target.value; onChange(c) }}
              style={{ width: `${Math.max(4, (b.huecos?.[k]?.length ?? 6) + 2)}ch` }}
              className={cn('rounded-md border-2 bg-surface px-2 py-1 text-center outline-none focus:border-ink',
                estado === 'editando' ? 'border-line' : ok ? 'border-success bg-success-subtle' : 'border-danger bg-danger-subtle')} />
            {revelar && !ok && <span className="mt-1 text-xs font-semibold text-success">{b.huecos?.[k]}</span>}
          </span>
        )
      })}
    </p>
  )
}

function Ordenar({ b, valor, onChange, estado, revelar }: Props) {
  const items = b.items ?? []
  // Se mezcla una sola vez y queda guardado: si se rehiciera en cada render, la lista bailaría.
  useEffect(() => {
    if (((valor as string[]) ?? []).length === items.length && items.length > 0) return
    if (!items.length) return
    const mezclado = [...items]
    for (let i = mezclado.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mezclado[i], mezclado[j]] = [mezclado[j], mezclado[i]] }
    if (mezclado.every((x, i) => x === items[i]) && items.length > 1) mezclado.reverse()
    onChange(mezclado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id])
  const orden = ((valor as string[]) ?? []).length ? (valor as string[]) : items
  const mover = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= orden.length) return; const c = [...orden]; [c[i], c[j]] = [c[j], c[i]]; onChange(c) }
  return (
    <ol className="flex flex-col gap-2">
      {orden.map((it, i) => {
        const ok = items[i] === it
        return (
          <li key={it} className={cn('flex items-center gap-3 rounded-xl border-2 px-4 py-3',
            estado === 'editando' ? 'border-line bg-surface' : ok && revelar ? 'border-success bg-success-subtle' : ok ? 'border-line bg-surface' : 'border-danger bg-danger-subtle')}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
            <span className="flex-1">{it}</span>
            {estado === 'editando' && (
              <span className="flex gap-1">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className="rounded-md p-1.5 hover:bg-hover disabled:opacity-30"><Icon icon={ArrowUp} size="sm" /></button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === orden.length - 1} aria-label="Bajar" className="rounded-md p-1.5 hover:bg-hover disabled:opacity-30"><Icon icon={ArrowDown} size="sm" /></button>
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Emparejar({ b, valor, onChange, estado, revelar }: Props) {
  const pares = b.pares ?? []
  const [activo, setActivo] = useState<number | null>(null)
  const derechas = useMemo(() => pares.map((p, i) => ({ ...p, i })).sort((a, z) => a.der.localeCompare(z.der)), [pares])
  const asignado = (valor as number[]) ?? pares.map(() => -1)
  const unir = (der: number) => {
    if (activo === null) return
    const c = asignado.map((x) => (x === der ? -1 : x))
    c[activo] = der
    onChange(c); setActivo(null)
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      <ul className="flex flex-col gap-2">
        {pares.map((p, i) => {
          const ok = asignado[i] === i
          return (
            <li key={p.izq}>
              <button type="button" disabled={estado !== 'editando'} onClick={() => setActivo(activo === i ? null : i)}
                className={cn('flex w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-3 text-left transition-colors',
                  estado !== 'editando' ? (ok ? (revelar ? 'border-success bg-success-subtle' : 'border-line bg-surface') : 'border-danger bg-danger-subtle')
                    : activo === i ? 'border-ink bg-accent-subtle' : asignado[i] >= 0 ? 'border-line-strong bg-muted' : 'border-line bg-surface hover:border-ink')}>
                <span>{p.izq}</span>
                {asignado[i] >= 0 && <Chip size="sm">{pares[asignado[i]]?.der}</Chip>}
              </button>
            </li>
          )
        })}
      </ul>
      <ul className="flex flex-col gap-2">
        {derechas.map((p) => {
          const usada = asignado.includes(p.i)
          return (
            <li key={p.der}>
              <button type="button" disabled={estado !== 'editando' || activo === null} onClick={() => unir(p.i)}
                className={cn('w-full rounded-xl border-2 px-3 py-3 text-left transition-colors',
                  usada ? 'border-line-strong bg-muted text-ink-muted' : activo !== null ? 'border-ink bg-surface hover:bg-accent-subtle' : 'border-line bg-surface')}>
                {p.der}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Abierta({ b, valor, onChange, estado }: Props) {
  return <Textarea autoGrow rows={4} disabled={estado !== 'editando'} value={String(valor ?? '')} onChange={(e) => onChange(e.target.value)} placeholder="Escribí acá…" aria-label={b.texto} className="text-base" />
}

function Autoreporte({ valor, onChange, estado }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" disabled={estado !== 'editando'} onClick={() => onChange(n)}
            className={cn('size-14 rounded-xl border-2 text-lg font-semibold transition-colors', valor === n ? 'border-ink bg-solid text-on-solid' : 'border-line bg-surface hover:border-ink')}>{n}</button>
        ))}
      </div>
      <p className="text-sm text-ink-subtle">Solo lo ves vos y tu guía. Nunca es una nota.</p>
    </div>
  )
}

const ICONO_EVIDENCIA = { foto: Camera, audio: Mic, archivo: Paperclip }

function Evidencia({ b, valor, onChange, estado }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-line-strong bg-muted p-5">
      <span className="flex items-center gap-2 text-sm font-semibold text-accent">
        <Icon icon={ICONO_EVIDENCIA[b.kind ?? 'foto']} size="lg" /> {b.kind === 'audio' ? 'Grabá un audio' : b.kind === 'archivo' ? 'Subí el archivo' : 'Sacá una foto'}
      </span>
      <Textarea autoGrow rows={2} disabled={estado !== 'editando'} value={String(valor ?? '')} onChange={(e) => onChange(e.target.value)}
        placeholder="Mientras no se pueden subir archivos, contá qué mostrarías" aria-label={b.texto} />
    </div>
  )
}
