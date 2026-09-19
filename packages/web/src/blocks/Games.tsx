import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Chip, Icon, Progress } from '@milo/ui'
import { Logomark } from '../brand/logo'
import { cn } from '../lib/cn'
import type { Block, AnswerValue } from '../lib/api'
import type { StepState } from './Interactive'

type Props = { b: Block; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; status: StepState; reveal?: boolean }

/** Flattens the categories: every item knows which box it belongs to. */
export function itemsDeClasificar(b: Block) {
  return (b.categories ?? []).flatMap((c, ci) => c.items.map((text) => ({ text, category: ci })))
}

/** How many hits the game has and out of how many. Used for grading and for the summary. */
export function gameScore(b: Block, v: AnswerValue | undefined): { ok: number; total: number } {
  switch (b.engine) {
    case 'sort': {
      const items = itemsDeClasificar(b)
      const die = (v as number[]) ?? []
      return { ok: items.filter((it, i) => die[i] === it.category).length, total: items.length }
    }
    case 'memory':
      return { ok: ((v as number[]) ?? []).length, total: (b.pairs ?? []).length }
    case 'time_attack': {
      const die = (v as number[]) ?? []
      const qs = b.questions ?? []
      return { ok: qs.filter((q, i) => die[i] === q.correct).length, total: qs.length }
    }
    default:
      return { ok: 0, total: 0 }
  }
}

export function GameBlock(p: Props) {
  switch (p.b.engine) {
    case 'sort': return <SortGame {...p} />
    case 'memory': return <MemoryGame {...p} />
    case 'time_attack': return <TimeAttack {...p} />
    default: return <p className="text-body text-text-muted">Este juego todavía no tiene mecánica elegida.</p>
  }
}

// ---------- Sort: each thing into its box ----------
// El color de cada caja es una marca chica y no el fondo entero: el sistema es monocromo.
const MARKS = ['bg-space-green', 'bg-space-orange', 'bg-space-purple', 'bg-space-blue']

function SortGame({ b, value, onChange, status, reveal }: Props) {
  const items = useMemo(() => itemsDeClasificar(b), [b])
  const assigned = (value as number[]) ?? items.map(() => -1)
  const [taken, setTaken] = useState<number | null>(null)
  const locked = status !== 'editing'

  const release = (item: number, cat: number) => { const c = [...assigned]; c[item] = cat; onChange(c); setTaken(null) }
  const unassigned = items.map((_, i) => i).filter((i) => assigned[i] < 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-14 flex-wrap items-start gap-2 rounded-xl border border-dashed border-border-strong bg-surface-muted p-3">
        {unassigned.length === 0 && <p className="text-body text-text-muted">Ya clasificaste todo.</p>}
        {unassigned.map((i) => (
          <button key={i} type="button" disabled={locked} draggable={!locked}
            onDragStart={(e) => { e.dataTransfer.setData('text/item', String(i)); setTaken(i) }}
            onClick={() => setTaken(taken === i ? null : i)}
            className={cn('rounded-[var(--radius-md)] border bg-surface px-3 py-2 text-body font-semibold transition-transform',
              taken === i ? 'scale-105 border-brand' : 'border-border hover:border-border-strong')}>
            {items[i].text}
          </button>
        ))}
      </div>

      <div className={cn('grid gap-3', (b.categories ?? []).length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {(b.categories ?? []).map((c, ci) => (
          <div key={c.name}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const i = Number(e.dataTransfer.getData('text/item')); if (!Number.isNaN(i)) release(i, ci) }}
            onClick={() => taken !== null && release(taken, ci)}
            className={cn('flex min-h-28 flex-col gap-2 rounded-[var(--radius-xl)] border border-border bg-surface p-3 transition-colors',
              taken !== null && !locked && 'cursor-pointer border-brand')}>
            <span className="flex items-center gap-2 text-body font-semibold">
              <span className={cn('size-2.5 rounded-full', MARKS[ci % MARKS.length])} aria-hidden="true" />{c.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it, i) => assigned[i] === ci && (
                <button key={i} type="button" disabled={locked} onClick={(e) => { e.stopPropagation(); release(i, -1) }}
                  className={cn('rounded-[var(--radius-md)] border bg-surface-muted px-2 py-1 text-meta font-semibold',
                    status === 'editing' ? 'border-border' : it.category === ci ? 'border-ok bg-ok-subtle' : 'border-bad bg-bad-subtle')}>
                  {it.text}
                  {reveal && it.category !== ci && <span className="ml-1 font-semibold text-ok-ink">→ {b.categories?.[it.category]?.name}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {taken !== null && <p className="text-body text-text-muted">Tocá la caja donde va "{items[taken].text}".</p>}
    </div>
  )
}

// ---------- Memory: find the pairs ----------
function MemoryGame({ b, value, onChange, status }: Props) {
  const pairs = b.pairs ?? []
  const cards = useMemo(() => {
    const deck = pairs.flatMap((p, i) => [{ pair: i, text: p.left }, { pair: i, text: p.right }])
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }
    return deck
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id])
  const found = (value as number[]) ?? []
  const [flipped, setFlipped] = useState<number[]>([])
  const [failure, setFailure] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const flip = (i: number) => {
    if (status !== 'editing' || flipped.includes(i) || found.includes(cards[i].pair) || flipped.length === 2) return
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length < 2) return
    const [a, z] = next
    if (cards[a].pair === cards[z].pair) {
      onChange([...found, cards[a].pair])
      timer.current = window.setTimeout(() => setFlipped([]), 350)
    } else {
      setFailure(true)
      timer.current = window.setTimeout(() => { setFlipped([]); setFailure(false) }, 800)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Progress value={found.length} max={pairs.length} label="Parejas encontradas" hint={`${found.length}/${pairs.length}`} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map((c, i) => {
          const matched = found.includes(c.pair)
          const visible = matched || flipped.includes(i) || status !== 'editing'
          return (
            <button key={i} type="button" onClick={() => flip(i)} disabled={status !== 'editing' || matched}
              style={{ perspective: 600 }}
              className={cn('grid min-h-20 place-items-center rounded-[var(--radius-md)] border p-3 text-center text-body font-semibold transition-colors',
                matched ? 'border-ok bg-ok-subtle'
                  : visible ? (failure && flipped.includes(i) ? 'border-bad bg-bad-subtle' : 'border-brand bg-brand-soft')
                    : 'border-border bg-surface-muted hover:border-border-strong')}>
              <span key={visible ? 'cara' : 'dorso'}>
                {visible ? c.text : <Logomark size={26} className="text-text-muted opacity-40" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Time attack: several questions against the clock ----------
function TimeAttack({ b, value, onChange, status }: Props) {
  const qs = b.questions ?? []
  const total = b.seconds ?? 60
  const die = (value as number[]) ?? []
  const [i, setI] = useState(die.length)
  const [remaining, setRemaining] = useState(total)
  const [running, setRunning] = useState(false)
  const finished = status !== 'editing' || i >= qs.length || remaining <= 0

  useEffect(() => {
    if (!running || finished) return
    const t = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => window.clearInterval(t)
  }, [running, finished])

  useEffect(() => { if (remaining === 0 && die.length < qs.length) onChange([...die, ...Array(qs.length - die.length).fill(-1)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  const answerIt = (op: number) => { const c = [...die]; c[i] = op; onChange(c); setI(i + 1) }
  const accuracy = qs.filter((q, k) => die[k] === q.correct).length

  if (!running && i === 0 && status === 'editing') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center">
        <Icon name="timer" size={40} className="icon-muted" />
        <div>
          <p className="text-body font-semibold">{qs.length} preguntas en {total} segundos</p>
          <p className="text-body text-text-muted">Una por vez. Si se acaba el tiempo, cuenta lo que hayas respondido.</p>
        </div>
        <Button size="lg" variant="brand" onClick={() => setRunning(true)}>Empezar</Button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center">
        <Icon name="workspace_premium" size={40} className={accuracy === qs.length ? 'text-ok-ink' : 'icon-muted'} />
        <p className="text-title">{accuracy} de {qs.length}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {qs.map((q, k) => (
            <Chip key={k} size="sm" color={die[k] === q.correct ? 'ok' : 'bad'} icon={die[k] === q.correct ? 'check' : 'close'}>{k + 1}</Chip>
          ))}
        </div>
        {status === 'editing' && (
          <Button variant="ghost" size="sm" icon="history"
            onClick={() => { onChange([]); setI(0); setRemaining(total); setRunning(false) }}>Volver a jugar</Button>
        )}
      </div>
    )
  }

  const q = qs[i]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon name="timer" size={20} className={remaining <= 10 ? 'text-bad-ink' : 'icon-muted'} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
          <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', remaining <= 10 ? 'bg-bad' : 'bg-brand')} style={{ width: `${(remaining / total) * 100}%` }} />
        </div>
        <span className="tabular text-body font-semibold">{remaining}s</span>
        <span className="tabular text-body text-text-muted">{i + 1}/{qs.length}</span>
      </div>
      <p key={i} className="text-title">{q.text}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.options.map((o, k) => (
          <button key={k} type="button" onClick={() => answerIt(k)}
            className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-border-strong">{o}</button>
        ))}
      </div>
    </div>
  )
}
