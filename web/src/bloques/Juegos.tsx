import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, Timer, Trophy, X } from 'lucide-react'
import { Button, Chip, Icon, Logomark, Progress, Text, cn } from '@/kit'
import type { Bloque, ValorRespuesta } from '../lib/api'
import type { EstadoPaso } from './Interactivo'

type Props = { b: Bloque; valor: ValorRespuesta | undefined; onChange: (v: ValorRespuesta) => void; estado: EstadoPaso; revelar?: boolean }

/** Aplana las categorías: cada ítem sabe a qué caja pertenece. */
export function itemsDeClasificar(b: Bloque) {
  return (b.categorias ?? []).flatMap((c, ci) => c.items.map((texto) => ({ texto, categoria: ci })))
}

/** Cuántos aciertos lleva el juego y sobre cuántos. Sirve para corregir y para el resumen. */
export function puntajeJuego(b: Bloque, v: ValorRespuesta | undefined): { ok: number; total: number } {
  switch (b.motor) {
    case 'clasificar': {
      const items = itemsDeClasificar(b)
      const dado = (v as number[]) ?? []
      return { ok: items.filter((it, i) => dado[i] === it.categoria).length, total: items.length }
    }
    case 'memoria':
      return { ok: ((v as number[]) ?? []).length, total: (b.pares ?? []).length }
    case 'contrarreloj': {
      const dado = (v as number[]) ?? []
      const qs = b.preguntas ?? []
      return { ok: qs.filter((q, i) => dado[i] === q.correcta).length, total: qs.length }
    }
    default:
      return { ok: 0, total: 0 }
  }
}

export function Juego(p: Props) {
  switch (p.b.motor) {
    case 'clasificar': return <Clasificar {...p} />
    case 'memoria': return <Memoria {...p} />
    case 'contrarreloj': return <Contrarreloj {...p} />
    default: return <Text variant="muted">Este juego todavía no tiene mecánica elegida.</Text>
  }
}

// ---------- Clasificar: cada cosa a su caja ----------
const TINTES = ['bg-teal', 'bg-yellow', 'bg-blue', 'bg-lilac', 'bg-orange', 'bg-cyan', 'bg-green', 'bg-pink']

function Clasificar({ b, valor, onChange, estado, revelar }: Props) {
  const items = useMemo(() => itemsDeClasificar(b), [b])
  const asignado = (valor as number[]) ?? items.map(() => -1)
  const [tomado, setTomado] = useState<number | null>(null)
  const bloqueado = estado !== 'editando'

  const soltar = (item: number, cat: number) => { const c = [...asignado]; c[item] = cat; onChange(c); setTomado(null) }
  const sueltos = items.map((_, i) => i).filter((i) => asignado[i] < 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-14 flex-wrap items-start gap-2 rounded-xl border-2 border-dashed border-line-strong bg-muted p-3">
        {sueltos.length === 0 && <Text size="sm" variant="muted">Ya clasificaste todo.</Text>}
        {sueltos.map((i) => (
          <button key={i} type="button" disabled={bloqueado} draggable={!bloqueado}
            onDragStart={(e) => { e.dataTransfer.setData('text/item', String(i)); setTomado(i) }}
            onClick={() => setTomado(tomado === i ? null : i)}
            className={cn('rounded-lg border-2 bg-surface px-3 py-2 text-sm font-medium transition-colors',
              tomado === i ? 'border-ink bg-accent-subtle' : 'border-line hover:border-ink')}>
            {items[i].texto}
          </button>
        ))}
      </div>

      <div className={cn('grid gap-3', (b.categorias ?? []).length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {(b.categorias ?? []).map((c, ci) => (
          <div key={c.nombre}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const i = Number(e.dataTransfer.getData('text/item')); if (!Number.isNaN(i)) soltar(i, ci) }}
            onClick={() => tomado !== null && soltar(tomado, ci)}
            className={cn('flex min-h-28 flex-col gap-2 rounded-xl p-3 transition-colors', TINTES[ci % TINTES.length],
              tomado !== null && !bloqueado && 'ring-2 ring-ink cursor-pointer')}>
            <span className="text-sm font-bold">{c.nombre}</span>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it, i) => asignado[i] === ci && (
                <button key={i} type="button" disabled={bloqueado} onClick={(e) => { e.stopPropagation(); soltar(i, -1) }}
                  className={cn('rounded-md border-2 bg-white/80 px-2 py-1 text-xs font-medium',
                    estado === 'editando' ? 'border-transparent' : it.categoria === ci ? 'border-success' : 'border-danger')}>
                  {it.texto}
                  {revelar && it.categoria !== ci && <span className="ml-1 text-success">→ {b.categorias?.[it.categoria]?.nombre}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tomado !== null && <Text size="sm" variant="muted">Tocá la caja donde va «{items[tomado].texto}».</Text>}
    </div>
  )
}

// ---------- Memoria: encontrar las parejas ----------
function Memoria({ b, valor, onChange, estado }: Props) {
  const pares = b.pares ?? []
  const cartas = useMemo(() => {
    const todas = pares.flatMap((p, i) => [{ par: i, texto: p.izq }, { par: i, texto: p.der }])
    for (let i = todas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [todas[i], todas[j]] = [todas[j], todas[i]] }
    return todas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id])
  const encontrados = (valor as number[]) ?? []
  const [dadas, setDadas] = useState<number[]>([])
  const [fallo, setFallo] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const dar = (i: number) => {
    if (estado !== 'editando' || dadas.includes(i) || encontrados.includes(cartas[i].par) || dadas.length === 2) return
    const next = [...dadas, i]
    setDadas(next)
    if (next.length < 2) return
    const [a, z] = next
    if (cartas[a].par === cartas[z].par) {
      onChange([...encontrados, cartas[a].par])
      timer.current = window.setTimeout(() => setDadas([]), 350)
    } else {
      setFallo(true)
      timer.current = window.setTimeout(() => { setDadas([]); setFallo(false) }, 800)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Progress value={encontrados.length} max={pares.length} label="Parejas encontradas" showValue />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cartas.map((c, i) => {
          const hallada = encontrados.includes(c.par)
          const visible = hallada || dadas.includes(i) || estado !== 'editando'
          return (
            <button key={i} type="button" onClick={() => dar(i)} disabled={estado !== 'editando' || hallada}
              className={cn('grid min-h-20 place-items-center rounded-xl border-2 p-3 text-center text-sm font-medium transition-colors',
                hallada ? 'border-success bg-success-subtle'
                  : visible ? (fallo && dadas.includes(i) ? 'border-danger bg-danger-subtle' : 'border-ink bg-accent-subtle')
                    : 'border-line bg-muted hover:border-ink')}>
              {visible ? c.texto : <Logomark size={26} className="text-ink-subtle opacity-40" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Contrarreloj: varias preguntas con el reloj corriendo ----------
function Contrarreloj({ b, valor, onChange, estado }: Props) {
  const qs = b.preguntas ?? []
  const total = b.segundos ?? 60
  const dado = (valor as number[]) ?? []
  const [i, setI] = useState(dado.length)
  const [restan, setRestan] = useState(total)
  const [corriendo, setCorriendo] = useState(false)
  const terminado = estado !== 'editando' || i >= qs.length || restan <= 0

  useEffect(() => {
    if (!corriendo || terminado) return
    const t = window.setInterval(() => setRestan((r) => Math.max(0, r - 1)), 1000)
    return () => window.clearInterval(t)
  }, [corriendo, terminado])

  useEffect(() => { if (restan === 0 && dado.length < qs.length) onChange([...dado, ...Array(qs.length - dado.length).fill(-1)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restan])

  const responder = (op: number) => { const c = [...dado]; c[i] = op; onChange(c); setI(i + 1) }
  const aciertos = qs.filter((q, k) => dado[k] === q.correcta).length

  if (!corriendo && i === 0 && estado === 'editando') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-line bg-surface p-8 text-center">
        <Icon icon={Timer} size={40} color="accent" />
        <div><Text weight="semibold">{qs.length} preguntas en {total} segundos</Text><Text size="sm" variant="muted">Una por vez. Si se acaba el tiempo, cuenta lo que hayas respondido.</Text></div>
        <Button size="lg" className="rounded-full" onClick={() => setCorriendo(true)}>Empezar</Button>
      </div>
    )
  }

  if (terminado) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-line bg-surface p-8 text-center">
        <Icon icon={Trophy} size={40} color={aciertos === qs.length ? 'success' : 'muted'} />
        <Text weight="semibold" size="lg">{aciertos} de {qs.length}</Text>
        <div className="flex flex-wrap justify-center gap-2">
          {qs.map((q, k) => (
            <Chip key={k} size="sm" color={dado[k] === q.correcta ? 'success' : 'danger'} icon={<Icon icon={dado[k] === q.correcta ? Check : X} size="xs" />}>{k + 1}</Chip>
          ))}
        </div>
        {estado === 'editando' && (
          <Button variant="ghost" size="sm" startIcon={<Icon icon={RotateCcw} size="sm" />}
            onClick={() => { onChange([]); setI(0); setRestan(total); setCorriendo(false) }}>Volver a jugar</Button>
        )}
      </div>
    )
  }

  const q = qs[i]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon icon={Timer} color={restan <= 10 ? 'danger' : 'muted'} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', restan <= 10 ? 'bg-danger' : 'bg-accent')} style={{ width: `${(restan / total) * 100}%` }} />
        </div>
        <Text size="sm" mono weight="semibold">{restan}s</Text>
        <Text size="sm" variant="muted">{i + 1}/{qs.length}</Text>
      </div>
      <p className="font-display text-xl font-semibold tracking-tight">{q.texto}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.opciones.map((o, k) => (
          <button key={k} type="button" onClick={() => responder(k)}
            className="rounded-xl border-2 border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-ink">{o}</button>
        ))}
      </div>
    </div>
  )
}
