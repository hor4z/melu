import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Clock, Flame, Target, Trophy } from 'lucide-react'
import { Button, Card, Chip, DoodleSprout, Eyebrow, Icon, ProgressRing, StatTile, Text } from '@/kit'
import { api, type Progress as P } from '../lib/api'
import { EXPERIENCES } from '../lib/composition'
import { ProfileCard } from '../blocks/Profile'
import type { LiveProfile } from '../lib/profile'

export function Progress() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['progress'], queryFn: () => api.get<P>('/api/my-progress') })
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<LiveProfile>('/api/profile') })
  const p = q.data
  if (!p) return null
  const total = p.done + p.inProgress
  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-5">
        <ProgressRing value={total ? p.done / total : 0} size={84}>{p.done}/{total || 0}</ProgressRing>
        <div><Eyebrow>Mi progreso</Eyebrow><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Lo que hiciste hasta ahora</h1><Text variant="muted">Solo vos y tu docente ven esto. No se compara con nadie.</Text></div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Misiones hechas" value={p.done} tint="bg-orange" icon={<Icon icon={Trophy} size="lg" />} />
        <StatTile label="Racha" value={p.streak} unit={p.streak === 1 ? 'día' : 'días'} hint="días seguidos entregando" tint="bg-yellow" icon={<Icon icon={Flame} size="lg" />} />
        <StatTile label="Tiempo" value={p.minutes} unit="min" hint="en total, trabajando" tint="bg-blue" icon={<Icon icon={Clock} size="lg" />} />
        <StatTile label="Aciertos" value={p.accuracy >= 0 ? Math.round(p.accuracy * 100) : '—'} unit={p.accuracy >= 0 ? '%' : undefined} hint="en los chequeos" tint="bg-lilac" icon={<Icon icon={Target} size="lg" />} />
      </section>
      {profile.data && (
        <div className="flex flex-col gap-2">
          <ProfileCard v={profile.data} title="Cómo aprendés, hoy" voice="you" />
          <div className="self-end">
            <Button variant="ghost" size="sm" asChild><a href="/start">Volver a hacer el recorrido</a></Button>
          </div>
        </div>
      )}
      {Object.keys(p.experiences).length > 0 && (
        <Card padding="lg"><Eyebrow>Qué tipo de cosas hiciste</Eyebrow><div className="mt-3 flex flex-wrap gap-2">{Object.entries(p.experiences).map(([k, n]) => <Chip key={k}>{EXPERIENCES[k] ?? k} · {n}</Chip>)}</div></Card>
      )}
      <Card padding="lg">
        <Eyebrow>Misiones</Eyebrow>
        {p.missions.length === 0 ? <div className="flex flex-col items-center gap-3 py-8 text-center"><DoodleSprout size={90} className="text-ink" /><Text variant="muted">Todavía no hiciste ninguna. Cuando empieces, acá queda tu historia.</Text></div> : (
          <ul className="mt-3 divide-y divide-line">
            {p.missions.map((m) => (
              <li key={m.submissionId} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><div className="font-medium">{m.title}</div><Text size="xs" variant="muted">{m.group}{m.minutes ? ` · ${m.minutes} min` : ''}{m.accuracy >= 0 ? ` · ${Math.round(m.accuracy * 100)}% aciertos` : ''}</Text></div>
                <Chip size="sm" color={m.status === 'graded' ? 'success' : m.status === 'submitted' ? 'default' : 'warning'}>{m.status === 'graded' ? 'Con devolución' : m.status === 'submitted' ? 'Entregada' : 'En curso'}</Chip>
                <Button size="sm" variant="ghost" onClick={() => nav(`/mission/${m.assignmentId}`)}>Abrir</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
