import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Callout, Card, Chip, Divider, Icon, Progress } from '@milo/ui'
import { api, type Block, type Submission, type PhaseDoc, type Mission, type Steps, type Answers, type AnswerValue } from '../lib/api'
import { SELF_GRADED, IS_INTERACTIVE } from '../lib/composition'
import { InteractiveBlock, ReadingBlock, evaluate, hasValue, type StepState } from '../blocks/Interactive'
import { gameScore } from '../blocks/Games'
import { Cover } from '../blocks/Cover'
import { cn } from '../lib/cn'
import { Cargando, NoLlego } from '../blocks/Estado'

/** Una pantalla: o un bloque interactivo, o un tramo de lectura. */
type StepView = { phase: number; phaseName: string; reading: Block[]; block?: Block }

/** Junta la lectura seguida y le da una pantalla propia a cada bloque interactivo. */
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
  // A pantalla completa no hay riel ni cabecera, así que la silueta va centrada con aire: es
  // toda la pantalla lo que está viniendo.
  if (q.isPending) return <div className="mx-auto w-full max-w-3xl px-5 py-10"><Cargando bloques={2} /></div>
  if (!q.data) return <div className="mx-auto w-full max-w-3xl px-5 py-10"><NoLlego que="la misión" error={q.error} onRetry={() => void q.refetch()} /></div>
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

  // ---- la pantalla de cierre ----
  if (finished) {
    const graded = m.submission.status === 'graded'
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-5 py-12 text-center">
        <span className="mark grid size-24 place-items-center rounded-full">
          <Icon name={graded ? 'star' : 'check'} size={44} />
        </span>
        <div>
          <span className="text-meta text-text-muted">{graded ? 'Con devolución' : 'Entregada'}</span>
          <h1 className="text-heading">{graded ? 'Ya la miró tu guía' : 'Listo'}</h1>
          <p className="text-body text-text-muted">
            {graded ? 'Abajo está lo que te dejó.' : 'Tu guía la va a mirar. Cuando tenga devolución, te aparece acá y en "Mi progreso".'}
          </p>
        </div>
        {answered.length > 0 && (
          <>
            <div className="w-full">
              <Progress label="Bien contestadas" value={accuracy} max={answered.length} hint={`${accuracy}/${answered.length}`} tone={accuracy === answered.length ? 'ok' : 'brand'} />
            </div>
            <div className="flex gap-2">
              <Chip color="ok">{accuracy} bien</Chip>
              {answered.length - accuracy > 0 && <Chip color="warn">{answered.length - accuracy} para repasar</Chip>}
            </div>
          </>
        )}
        {graded && rubric.length > 0 && (
          <Card className="w-full p-5 text-left">
            <span className="text-meta text-text-muted">Tu devolución</span>
            <ul className="mt-2 flex flex-col gap-2">
              {rubric.map((c) => {
                const p = scores.find((x) => x.id === c.id)
                return (
                  <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-body">
                    <span>{c.label}</span>
                    <span className="font-semibold">{p ? c.levels[p.level] : '-'}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
        <div className="flex gap-2">
          <Button variant="brand" onClick={() => nav('/today')}>Volver a Hoy</Button>
          <Button variant="ghost" onClick={() => { setFinished(false); setI(0) }}>Repasar lo que hice</Button>
        </div>
      </div>
    )
  }

  if (!current) return null
  // Un juego solo se puede comprobar cuando se jugó entero.
  const played = b?.type === 'game' ? (() => { const { ok, total } = gameScore(b, value); return total > 0 && (b.engine === 'memory' ? ok === total : ((value as number[])?.filter((x) => x !== undefined && x >= -1).length ?? 0) >= total) })() : true
  const ready = b?.type === 'game' ? played : b?.type === 'manipulative' ? typeof value === 'number' : grades ? hasValue(value) : true
  const revealed = status !== 'editing'
  // Un primer error no regala la respuesta: todavía queda un intento.
  const reveal = status === 'right' || status === 'review' || (status === 'wrong' && attempts >= 2)
  const explanation = b?.explanation

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <header className="z-10 flex shrink-0 items-center gap-4 bg-canvas px-5 py-4">
        <button
          type="button" onClick={() => (i === 0 ? nav('/today') : setI(i - 1))} aria-label={i === 0 ? 'Salir' : 'Anterior'}
          className="touch-target grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-muted"
        >
          <Icon name={i === 0 ? 'close' : 'chevron_left'} size={22} />
        </button>
        <div className="flex flex-1 gap-1.5" aria-label={`Paso ${i + 1} de ${steps.length}`}>
          {phases.map((f, fi) => {
            const total = steps.filter((p) => p.phase === fi).length
            const facts = steps.filter((p, k) => p.phase === fi && k < i).length + (current.phase === fi ? 0.35 : 0)
            return (
              <span key={f.key} className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted" title={f.name}>
                <span className="block h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${Math.min(100, (facts / Math.max(1, total)) * 100)}%` }} />
              </span>
            )
          })}
        </div>
        <span className="tabular shrink-0 text-meta text-text-muted">{i + 1}/{steps.length}</span>
      </header>

      {/* El contenido corre acá adentro y no la página: así el pie con la acción principal nunca
          se va abajo del pliegue, que es justo lo que hay que tener a mano. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={i} className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pb-10 pt-4">
          {i === 0 && (
            <Card className="flex items-center gap-4 p-4">
              <Cover title={m.assignment.title} className="size-16 shrink-0 rounded-[var(--radius-xl)]" size={34} />
              <div>
                <span className="text-meta text-text-muted">{m.assignment.groupName}</span>
                <h1 className="text-title">{m.assignment.title}</h1>
              </div>
            </Card>
          )}
          {phases.length > 1 && <span className="text-meta text-text-muted">{current.phaseName}</span>}

          {current.reading.map((lb) => <ReadingBlock key={lb.id} b={lb} />)}

          {b && (
            <div className="flex flex-col gap-5">
              {b.type !== 'fill_in' && <p className="text-balance text-heading">{b.text}</p>}
              <InteractiveBlock b={b} value={value} onChange={setVal} status={status} reveal={reveal} />
              {b.hint && !revealed && (
                hintVisible
                  ? <Callout icon="lightbulb" color="orange">{b.hint}</Callout>
                  : <button type="button" onClick={() => setHintVisible(true)} className="self-start text-body font-semibold text-brand-ink underline underline-offset-4">Ver una pista</button>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className={cn('shrink-0 border-t transition-colors',
        status === 'right' ? 'border-border bg-ok-subtle' : status === 'wrong' ? 'border-border bg-bad-subtle' : status === 'review' ? 'border-border bg-surface-muted' : 'border-border bg-surface')}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-4">
          {revealed && (status !== 'review' || explanation) && (
            <div className="flex items-start gap-3">
              {status !== 'review' && (
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', status === 'right' ? 'bg-ok text-text' : 'bg-bad text-text-inverted')}>
                  <Icon name={status === 'right' ? 'check' : 'close'} size={22} />
                </span>
              )}
              <div className="min-w-0">
                {status !== 'review' && (
                  <p className={cn('text-title', status === 'right' ? 'text-ok-ink' : 'text-bad-ink')}>
                    {status === 'right' ? 'Bien' : attempts >= 2 ? 'Todavía no' : 'Casi'}
                  </p>
                )}
                {explanation && <p className="text-body text-text-muted">{explanation}</p>}
              </div>
            </div>
          )}
          <Divider />
          <div className="flex items-center gap-2">
            {status === 'wrong' && attempts < 2 && (
              <>
                <Button size="lg" variant="brand" className="flex-1" onClick={retryIt}>Volver a intentar</Button>
                <Button size="lg" variant="ghost" onClick={giveUp}>Ver la respuesta</Button>
              </>
            )}
            {status === 'editing' && (
              <Button
                size="lg" block variant="brand" disabled={!ready}
                iconEnd={grades ? undefined : 'arrow_forward'}
                onClick={() => (grades ? verify() : (register(null), advance()))}
              >
                {grades ? 'Comprobar' : i === steps.length - 1 ? 'Entregar' : 'Continuar'}
              </Button>
            )}
            {(status === 'right' || status === 'review' || (status === 'wrong' && attempts >= 2)) && (
              <Button size="lg" block variant="brand" iconEnd="arrow_forward" onClick={advance}>
                {i === steps.length - 1 ? 'Entregar' : 'Continuar'}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
