import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Avatar, Button, Card, Chip, Eyebrow, Icon, Text, cn } from '@/kit'
import { api, type Assignment, type Submission, type Score } from '../lib/api'
import { InteractiveBlock } from '../blocks/Interactive'
import { Rotulo } from '../blocks/Chips'
import { IS_INTERACTIVE } from '../lib/composition'
import { Empty } from '../blocks/Modal'

// One submission at a time, the rubric as a button bar. Built for the thumb.
export function Review() {
  const { id } = useParams()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['submissions', id], queryFn: () => api.get<{ assignment: Assignment; submissions: Submission[] }>(`/api/assignments/${id}/submissions`) })
  const [sel, setSel] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const gradeIt = useMutation({
    mutationFn: (e: Submission) => api.put(`/api/submissions/${e.id}/scores`, { scores: Object.entries(scores).map(([cid, level]): Score => ({ id: cid, level })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions', id] }); setScores({}); setSel(null) },
  })
  if (!q.data) return null
  const { assignment: a, submissions } = q.data
  const lists = submissions.filter((e) => e.status !== 'in_progress')
  const current = lists.find((e) => e.id === sel) ?? lists.find((e) => e.status === 'submitted') ?? lists[0]
  const rubric = a.rubric ?? []
  const answered = (a.document?.phases ?? []).flatMap((f) => f.blocks.filter((b) => IS_INTERACTIVE(b.type)).map((b) => ({ ...b, phase: f.name })))

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/groups/${a.groupId}`} className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> {a.groupName}</Link>
      <header className="border-b border-line pb-4"><Eyebrow>Corregir</Eyebrow><h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{a.title}</h1><Text variant="muted">{lists.length} de {a.submissionsTotal} entregaron · {lists.filter((e) => e.status === 'graded').length} corregidas</Text></header>

      {lists.length === 0 && <Empty title="Nadie entregó todavía" text="Cuando alguien entregue, aparece acá." />}

      {current && (
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Card asChild padding="none"><ul className="flex flex-col gap-1 self-start p-2">
            {lists.map((e) => (
              <li key={e.id}><button type="button" onClick={() => { setSel(e.id); setScores(Object.fromEntries(e.scores.map((p) => [p.id, p.level]))) }}
                className={cn('flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm', current.id === e.id ? 'bg-teal font-medium text-accent' : 'hover:bg-hover')}>
                <Avatar name={e.learner ?? '?'} size="sm" /><span className="flex-1 truncate">{e.learner}</span>
                <span className={`size-2 rounded-full ${e.status === 'graded' ? 'bg-success' : 'bg-warning'}`} aria-label={e.status === 'graded' ? 'Corregida' : 'Para mirar'} />
              </button></li>
            ))}
          </ul></Card>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">{current.learner}</h2>
              {answered.map((b) => { const p = current.steps?.[b.id]; return (
                <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Rotulo>{b.phase}</Rotulo>
                    {p && p.ok !== null && <Chip size="sm" color={p.ok ? 'success' : 'danger'}>{p.ok ? 'Bien' : 'Se trabó'}{p.attempts > 1 && ` · ${p.attempts} intentos`}{p.ms ? ` · ${p.ms}s` : ''}</Chip>}
                  </div>
                  {b.type !== 'fill_in' && <p className="font-medium">{b.text}</p>}
                  <InteractiveBlock b={b} value={current.answers?.[b.id]} onChange={() => {}} status="review" reveal />
                </div>
              )})}
            </section>
            {rubric.length > 0 && (
              <Card padding="md" className="gap-4">
                <h3 className="font-semibold">Rúbrica</h3>
                {rubric.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {c.levels.map((n, i) => (
                        <button key={i} type="button" onClick={() => setScores((p) => ({ ...p, [c.id]: i }))}
                          className={cn('rounded-md border-2 px-3 py-3 text-sm transition-colors', scores[c.id] === i ? 'border-ink bg-accent-subtle font-medium' : 'border-line hover:border-ink')}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={() => gradeIt.mutate(current)} loading={gradeIt.isPending} disabled={Object.keys(scores).length < rubric.length}>{current.status === 'graded' ? 'Guardar cambios' : 'Guardar y siguiente'}</Button>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
