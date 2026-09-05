import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronLeft, Lightbulb, X } from 'lucide-react'
import { Button, Chip, cn, Eyebrow, Heading, Icon, ProgressRing, Text } from '@melu/ui'
import { api, type Block, type Submission, type PhaseDoc, type Mission, type Steps, type Answers, type AnswerValue } from '../lib/api'
import { SELF_GRADED, IS_INTERACTIVE } from '../lib/composition'
import { InteractiveBlock, ReadingBlock, evaluate, hasValue, type StepState } from '../blocks/Interactive'
import { gameScore } from '../blocks/Games'
import { Cover } from '../blocks/Cover'

/** One screen: either an interactive block, or a stretch of reading. */
type StepView = { phase: number; phaseName: string; reading: Block[]; block?: Block }

/** Groups consecutive reading blocks and gives each interactive block a screen of its own. */
function buildSteps(phases: PhaseDoc[]): StepView[] {
  const out: StepView[] = []
  phases.forEach((f, fi) => {
    let buffer: Block[] = []
    for (const b of f.blocks) {
      if (IS_INTERACTIVE(b.type)) { out.push({ phase: fi, phaseName: f.name, reading: buffer, block: b }); buffer = [] }
      else buffer.push(b)
    }
    if (buffer.length) out.push({ phase: fi, phaseName: f.name, reading: buffer })
  })
  return out
}

export function MissionScreen() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['mission', id], queryFn: () => api.get<Mission>(`/api/missions/${id}`) })
  if (!q.data) return null
  return <Runner key={q.data.submission.id} m={q.data} />
}

function Runner({ m }: { m: Mission }) {
  const qc = useQueryClient()
  const nav = useNavigate()
  const phases = m.assignment.document?.phases ?? []
  const steps = useMemo(() => buildSteps(phases), [phases])
  const [i, setI] = useState(0)
  const [r, setR] = useState<Answers>(m.submission.answers ?? {})
  const [ps, setPs] = useState<Steps>(m.submission.steps ?? {})
  const [status, setStatus] = useState<StepState>('editing')
  const [hintVisible, setHintVisible] = useState(false)
  const [finished, setFinished] = useState(m.submission.status !== 'in_progress')
  const from = useRef(Date.now())
  const saved = useRef<number | undefined>(undefined)

  const save = useMutation({
    mutationFn: (x: { answers: Answers; steps: Steps; submit: boolean }) => api.put<Submission>(`/api/submissions/${m.submission.id}`, x),
    onSuccess: (e) => { if (e.status !== 'in_progress') qc.invalidateQueries({ queryKey: ['today'] }) },
  })
  const saveSoon = (answers: Answers, next: Steps) => {
    window.clearTimeout(saved.current)
    saved.current = window.setTimeout(() => save.mutate({ answers, steps: next, submit: false }), 500)
  }
  useEffect(() => () => window.clearTimeout(saved.current), [])
  useEffect(() => { from.current = Date.now(); setStatus('editing'); setHintVisible(false); window.scrollTo({ top: 0 }) }, [i])

  const current = steps[i]
  const b = current?.block
  const value = b ? r[b.id] : undefined
  const grades = b ? SELF_GRADED(b.type) : false
  const attempts = b ? (ps[b.id]?.attempts ?? 0) : 0

  const setVal = (v: AnswerValue) => { if (!b) return; const next = { ...r, [b.id]: v }; setR(next); saveSoon(next, ps) }

  const register = (ok: boolean | null) => {
    if (!b) return ps
    const next: Steps = { ...ps, [b.id]: { attempts: attempts + 1, ok, ms: Math.round((Date.now() - from.current) / 1000) } }
    setPs(next); saveSoon(r, next)
    return next
  }

  const verify = () => {
    if (!b) return
    const ok = evaluate(b, value)
    register(ok)
    setStatus(ok === null ? 'review' : ok ? 'right' : 'wrong')
  }
  const retryIt = () => setStatus('editing')
  const giveUp = () => { setStatus('review'); if (b) register(false) }

  const advance = () => {
    if (i < steps.length - 1) { setI(i + 1); return }
    setFinished(true)
    window.clearTimeout(saved.current)
    save.mutate({ answers: r, steps: ps, submit: true })
  }

  const answered = Object.values(ps).filter((p) => p.ok !== null)
  const accuracy = answered.filter((p) => p.ok).length
  const rubric = m.assignment.rubric ?? []
  const scores = m.submission.scores ?? []

  // ---- closing screen ----
  if (finished) {
    const graded = m.submission.status === 'graded'
    return (
      <div className="ui-rise mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
        <ProgressRing value={answered.length ? accuracy / answered.length : 1} size={120}>
          {answered.length ? `${accuracy}/${answered.length}` : '✓'}
        </ProgressRing>
        <div>
          <Eyebrow>{graded ? 'Con devolución' : 'Entregada'}</Eyebrow>
          <Heading level={1} size="2xl" className="mt-1">{graded ? 'Ya la miró tu guía' : '¡Listo!'}</Heading>
          <Text variant="muted" className="mt-1">
            {graded ? 'Abajo está lo que te dejó.' : 'Tu guía la va a mirar. Cuando tenga devolución, te aparece acá y en «Mi progreso».'}
          </Text>
        </div>
        {answered.length > 0 && (
          <div className="flex gap-2">
            <Chip color="success" size="lg">{accuracy} bien</Chip>
            {answered.length - accuracy > 0 && <Chip color="warning" size="lg">{answered.length - accuracy} para repasar</Chip>}
          </div>
        )}
        {graded && rubric.length > 0 && (
          <div className="w-full rounded-xl border border-line bg-surface p-5 text-left">
            <Eyebrow>Tu devolución</Eyebrow>
            <ul className="mt-2 flex flex-col gap-2">
              {rubric.map((c) => { const p = scores.find((x) => x.id === c.id); return (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>{c.label}</span><span className="font-semibold">{p ? c.levels[p.level] : '—'}</span></li>
              )})}
            </ul>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => nav('/today')}>Volver a Hoy</Button>
          <Button variant="ghost" onClick={() => { setFinished(false); setI(0) }}>Repasar lo que hice</Button>
        </div>
      </div>
    )
  }

  if (!current) return null
  // A game can only be checked once it has been played through.
  const played = b?.type === 'game' ? (() => { const { ok, total } = gameScore(b, value); return total > 0 && (b.engine === 'memory' ? ok === total : ((value as number[])?.filter((x) => x !== undefined && x >= -1).length ?? 0) >= total) })() : true
  const ready = b?.type === 'game' ? played : b?.type === 'manipulative' ? typeof value === 'number' : grades ? hasValue(value) : true
  const revealed = status !== 'editing'
  // A first mistake does not give away the answer: they still have one try left.
  const reveal = status === 'right' || status === 'review' || (status === 'wrong' && attempts >= 2)
  const explanation = b?.explanation

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <header className="z-10 flex shrink-0 items-center gap-4 bg-canvas px-5 py-4">
        <button type="button" onClick={() => (i === 0 ? nav('/today') : setI(i - 1))} aria-label={i === 0 ? 'Salir' : 'Anterior'}
          className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover"><Icon icon={i === 0 ? X : ChevronLeft} size="lg" /></button>
        <div className="flex flex-1 gap-1.5" aria-label={`Paso ${i + 1} de ${steps.length}`}>
          {phases.map((f, fi) => {
            const total = steps.filter((p) => p.phase === fi).length
            const facts = steps.filter((p, k) => p.phase === fi && k < i).length + (current.phase === fi ? 0.35 : 0)
            return <span key={f.key} className="h-2 flex-1 overflow-hidden rounded-full bg-muted" title={f.name}>
              <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, (facts / Math.max(1, total)) * 100)}%` }} />
            </span>
          })}
        </div>
        <Text size="sm" variant="subtle" mono className="shrink-0">{i + 1}/{steps.length}</Text>
      </header>

      {/* The content scrolls in here, not the page: that way the footer with the main action
          nunca se va abajo del pliegue, que es justo lo que hay que tener a mano. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={i} className="ui-reveal mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pb-10 pt-4">
          {i === 0 && (
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
              <Cover title={m.assignment.title} className="size-16 shrink-0 rounded-xl" size={40} />
              <div><Eyebrow>{m.assignment.groupName}</Eyebrow><Heading level={1} size="lg">{m.assignment.title}</Heading></div>
            </div>
          )}
          {phases.length > 1 && <Eyebrow>{current.phaseName}</Eyebrow>}

          {current.reading.map((lb) => <ReadingBlock key={lb.id} b={lb} />)}

          {b && (
            <div className={cn('flex flex-col gap-5', status === 'wrong' && 'ui-error')}>
              {b.type !== 'fill_in' && <p className="font-display text-2xl font-semibold leading-snug tracking-tight text-balance">{b.text}</p>}
              <InteractiveBlock b={b} value={value} onChange={setVal} status={status} reveal={reveal} />
              {b.hint && !revealed && (
                hintVisible
                  ? <div className="flex items-start gap-2 rounded-xl bg-yellow px-4 py-3"><Icon icon={Lightbulb} className="mt-0.5" /><p className="text-sm">{b.hint}</p></div>
                  : <button type="button" onClick={() => setHintVisible(true)} className="self-start text-sm font-semibold text-accent underline underline-offset-4">Ver una pista</button>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className={cn('shrink-0 border-t transition-colors',
        status === 'right' ? 'border-success/30 bg-success-subtle' : status === 'wrong' ? 'border-danger/30 bg-danger-subtle' : status === 'review' ? 'border-line bg-muted' : 'border-line bg-surface')}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-4">
          {revealed && (status !== 'review' || explanation) && (
            <div className="flex items-start gap-3">
              {status !== 'review' && (
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', status === 'right' ? 'bg-success text-white' : 'bg-danger text-white')}>
                  <Icon icon={status === 'right' ? Check : X} size="lg" />
                </span>
              )}
              <div className="min-w-0">
                {status !== 'review' && <p className={cn('font-display text-lg font-semibold', status === 'right' ? 'text-success' : 'text-danger')}>{status === 'right' ? '¡Bien!' : attempts >= 2 ? 'Todavía no' : 'Casi'}</p>}
                {explanation && <p className="text-sm leading-relaxed text-ink-muted">{explanation}</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            {status === 'wrong' && attempts < 2 && (
              <>
                <Button size="lg" className="flex-1" onClick={retryIt}>Volver a intentar</Button>
                <Button size="lg" variant="ghost" onClick={giveUp}>Ver la respuesta</Button>
              </>
            )}
            {status === 'editing' && (
              <Button size="lg" block disabled={!ready}
                onClick={() => (grades ? verify() : (register(null), advance()))} endIcon={grades ? undefined : <Icon icon={ArrowRight} size="sm" />}>
                {grades ? 'Comprobar' : i === steps.length - 1 ? 'Entregar' : 'Continuar'}
              </Button>
            )}
            {(status === 'right' || status === 'review' || (status === 'wrong' && attempts >= 2)) && (
              <Button size="lg" block onClick={advance} endIcon={<Icon icon={ArrowRight} size="sm" />}>
                {i === steps.length - 1 ? 'Entregar' : 'Continuar'}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
