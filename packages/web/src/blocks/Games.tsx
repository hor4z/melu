import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, Timer, Trophy, X } from 'lucide-react'
import { Button, Chip, Icon, Logomark, Progress, Text, cn } from '@melu/ui'
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
    default: return <Text variant="muted">Este juego todavía no tiene mecánica elegida.</Text>
  }
}

// ---------- Sort: each thing into its box ----------
// Each box's color is a small mark, not the whole background: the system is white and ink.
const MARKS = ['bg-teal-500', 'bg-orange-500', 'bg-purple-500', 'bg-cyan-500']

function SortGame({ b, value, onChange, status, reveal }: Props) {
  const items = useMemo(() => itemsDeClasificar(b), [b])
  const assigned = (value as number[]) ?? items.map(() => -1)
  const [taken, setTaken] = useState<number | null>(null)
  const locked = status !== 'editing'

  const release = (item: number, cat: number) => { const c = [...assigned]; c[item] = cat; onChange(c); setTaken(null) }
  const unassigned = items.map((_, i) => i).filter((i) => assigned[i] < 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-14 flex-wrap items-start gap-2 rounded-xl border border-dashed border-line-strong bg-muted p-3">
        {unassigned.length === 0 && <Text size="sm" variant="muted">Ya clasificaste todo.</Text>}
        {unassigned.map((i) => (
          <button key={i} type="button" disabled={locked} draggable={!locked}
            onDragStart={(e) => { e.dataTransfer.setData('text/item', String(i)); setTaken(i) }}
            onClick={() => setTaken(taken === i ? null : i)}
            className={cn('rounded-md border bg-surface px-3 py-2 text-sm font-medium transition-transform',
              taken === i ? 'border-ink shadow-sm scale-105' : 'border-line hover:border-ink')}>
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
            className={cn('flex min-h-28 flex-col gap-2 rounded-xl border border-line bg-surface p-3 transition-colors',
              taken !== null && !locked && 'ui-glow cursor-pointer border-ink')}>
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className={cn('size-2.5 rounded-full', MARKS[ci % MARKS.length])} aria-hidden="true" />{c.name}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it, i) => assigned[i] === ci && (
                <button key={i} type="button" disabled={locked} onClick={(e) => { e.stopPropagation(); release(i, -1) }}
                  className={cn('ui-reveal rounded-md border bg-muted px-2 py-1 text-xs font-medium',
                    status === 'editing' ? 'border-line' : it.category === ci ? 'border-success bg-success-subtle ui-correct' : 'border-danger bg-danger-subtle')}>
                  {it.text}
                  {reveal && it.category !== ci && <span className="ml-1 font-semibold text-success">→ {b.categories?.[it.category]?.name}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {taken !== null && <Text size="sm" variant="muted" className="ui-nudge">Tocá la caja donde va «{items[taken].text}».</Text>}
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
      <Progress value={found.length} max={pairs.length} label="Parejas encontradas" showValue />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map((c, i) => {
          const matched = found.includes(c.pair)
          const visible = matched || flipped.includes(i) || status !== 'editing'
          return (
            <button key={i} type="button" onClick={() => flip(i)} disabled={status !== 'editing' || matched}
              style={{ perspective: 600 }}
              className={cn('grid min-h-20 place-items-center rounded-md border p-3 text-center text-sm font-medium transition-colors',
                matched ? 'border-success bg-success-subtle ui-correct'
                  : visible ? (failure && flipped.includes(i) ? 'border-danger bg-danger-subtle ui-error' : 'border-ink bg-accent-subtle')
                    : 'border-line bg-muted hover:border-ink')}>
              <span key={visible ? 'cara' : 'dorso'} className="ui-flip">
                {visible ? c.text : <Logomark size={26} className="text-ink-subtle opacity-40" />}
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
      <div className="ui-reveal flex flex-col items-center gap-4 rounded-xl border border-line bg-surface p-8 text-center">
        <Icon icon={Timer} size={40} color="accent" />
        <div><Text weight="semibold">{qs.length} preguntas en {total} segundos</Text><Text size="sm" variant="muted">Una por vez. Si se acaba el tiempo, cuenta lo que hayas respondido.</Text></div>
        <Button size="lg" onClick={() => setRunning(true)}>Empezar</Button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="ui-rise flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-8 text-center">
        <Icon icon={Trophy} size={40} color={accuracy === qs.length ? 'success' : 'muted'} />
        <Text weight="semibold" size="lg">{accuracy} de {qs.length}</Text>
        <div className="flex flex-wrap justify-center gap-2">
          {qs.map((q, k) => (
            <Chip key={k} size="sm" color={die[k] === q.correct ? 'success' : 'danger'} icon={<Icon icon={die[k] === q.correct ? Check : X} size="xs" />}>{k + 1}</Chip>
          ))}
        </div>
        {status === 'editing' && (
          <Button variant="ghost" size="sm" startIcon={<Icon icon={RotateCcw} size="sm" />}
            onClick={() => { onChange([]); setI(0); setRemaining(total); setRunning(false) }}>Volver a jugar</Button>
        )}
      </div>
    )
  }

  const q = qs[i]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon icon={Timer} color={remaining <= 10 ? 'danger' : 'muted'} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', remaining <= 10 ? 'bg-danger' : 'bg-accent')} style={{ width: `${(remaining / total) * 100}%` }} />
        </div>
        <Text size="sm" mono weight="semibold">{remaining}s</Text>
        <Text size="sm" variant="muted">{i + 1}/{qs.length}</Text>
      </div>
      <p key={i} className="ui-reveal font-display text-xl font-semibold tracking-tight">{q.text}</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.options.map((o, k) => (
          <button key={k} type="button" onClick={() => answerIt(k)}
            className={cn('ui-reveal rounded-md border border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-ink', ['', 'ui-delay-1', 'ui-delay-2', 'ui-delay-3'][k] ?? '')}>{o}</button>
        ))}
      </div>
    </div>
  )
}
