import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Chip, Divider, PageHeader, Progress as Bar, count } from '@milo/ui'
import { Stat } from '../blocks/Product'
import { api, type Progress as P } from '../lib/api'
import { EXPERIENCES } from '../lib/composition'
import { Cargando, NoLlego } from '../blocks/Estado'
import { Empty } from '../blocks/Modal'

export function Progress() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['progress'], queryFn: () => api.get<P>('/api/my-progress') })
  const p = q.data
  if (q.isPending) return <Cargando bloques={2} />
  if (!p) return <NoLlego que="tu progreso" error={q.error} onRetry={() => void q.refetch()} />
  const total = p.done + p.inProgress
  return (
    <div className="page-stack">
      <PageHeader title="Lo que hiciste hasta ahora" subtitle="Solo vos y tu docente ven esto. No se compara con nadie." />

      {total > 0 && <Bar label="Misiones terminadas" value={p.done} max={total} hint={`${p.done}/${total}`} tone={p.done === total ? 'ok' : 'brand'} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Misiones hechas" value={count(p.done)} icon="workspace_premium" />
        <Stat label="Racha" value={`${p.streak} ${p.streak === 1 ? 'día' : 'días'}`} icon="bolt" />
        <Stat label="Tiempo" value={`${count(p.minutes)} min`} icon="schedule" />
        <Stat label="Aciertos" value={p.accuracy >= 0 ? `${Math.round(p.accuracy * 100)}%` : '-'} icon="target" />
      </div>

      {Object.keys(p.experiences).length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-title">Qué tipo de cosas hiciste</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(p.experiences).map(([k, n]) => (
              <Chip key={k}>{EXPERIENCES[k] ?? k} <span className="tabular font-semibold">{n}</span></Chip>
            ))}
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-title">Misiones</h2>
        {p.missions.length === 0
          ? <Empty icon="rocket_launch" title="Todavía no hiciste ninguna" text="Cuando empieces, acá queda tu historia." />
          : (
            <ul className="flex flex-col">
              {p.missions.map((m, i) => (
                <li key={m.submissionId}>
                  {i > 0 && <Divider />}
                  <div className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-body font-semibold">{m.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 text-meta text-text-muted">
                        <span>{m.group}</span>
                        {m.minutes > 0 && <span>{m.minutes} min</span>}
                        {m.accuracy >= 0 && <span>{Math.round(m.accuracy * 100)}% aciertos</span>}
                      </div>
                    </div>
                    <Chip size="sm" color={m.status === 'graded' ? 'ok' : m.status === 'submitted' ? undefined : 'warn'}>
                      {m.status === 'graded' ? 'Con devolución' : m.status === 'submitted' ? 'Entregada' : 'En curso'}
                    </Chip>
                    <Button size="sm" variant="ghost" onClick={() => nav(`/missions/${m.assignmentId}`)}>Abrir</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  )
}
