import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCircle, Clock, Inbox, Plus, TrendingDown, UserPlus, Users, Zap } from 'lucide-react'
import { Avatar, Button, Card, Chip, DoodleBulb, Eyebrow, Heading, Icon, Text } from '@melu/ui'
import { api, type Dashboard } from '../lib/api'
import { StatTile } from '../blocks/Product'
import { SignalAction } from '../blocks/SignalAction'
import { useSpaceId } from '../lib/space'

// El color va en el trazo del ícono, no en un mosaico detrás: la señal se distingue igual y la
// tarjeta deja de tener dos cajas anidadas.
const KIND = {
  dropout: { icon: Clock, ink: 'text-warning', label: 'Sin terminar' },
  misses: { icon: AlertTriangle, ink: 'text-danger', label: 'Se traba' },
  slow: { icon: TrendingDown, ink: 'text-ink-muted', label: 'Le lleva más' },
  shines: { icon: Zap, ink: 'text-success', label: 'Vuela' },
} as const

export function Home() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const p = q.data
  if (!p) return null
  const signals = p.signals ?? []
  const recent = p.recentSubmissions ?? []
  const series = p.weekSeries ?? []
  const maxSeries = Math.max(1, ...series.map((d) => d.opened))
  const weekOut = series.reduce((n, d) => n + d.opened, 0)
  const weekBack = series.reduce((n, d) => n + d.submitted, 0)
  const steps: [string, string, string, string][] = [
    ['group', 'Creá un grupo', 'Un aula, un taller, tres alumnos: gente que aprende junta.', '/groups'],
    ['invite', 'Sumá a los chicos', 'Escribí sus emails. Entran con Google y el grupo ya los espera.', '/groups'],
    ['activity', 'Armá una actividad', 'Empezá desde una receta y editala como un documento.', '/activities/new'],
    ['assign', 'Asignala al grupo', 'Los chicos la ven en «Hoy» y la hacen a su ritmo.', '/activities'],
    ['grade', 'Mirá la primera entrega', 'La rúbrica es una botonera: dos minutos por entrega.', '/groups'],
  ]
  const facts = steps.filter(([k]) => p.checklist[k]).length
  const firstTime = facts < steps.length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-end gap-4">
        <Heading level={1} size="2xl" className="sr-only">Inicio</Heading>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => nav('/groups')} startIcon={<Icon icon={UserPlus} />}>Invitar al grupo</Button><Button onClick={() => nav('/activities/new')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button></div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Para mirar" value={p.toReview} hint="entregas esperando tu devolución" tint="bg-yellow"
          icon={<Icon icon={Inbox} size="lg" />} />
        <StatTile label="Sin terminar" value={p.unfinished} hint="las abrieron y no las entregaron" tint="bg-orange"
          icon={<Icon icon={Clock} size="lg" />} />
        <StatTile label="Corregidas" value={p.graded} hint="ya tienen tu devolución" tint="bg-teal"
          icon={<Icon icon={CheckCircle} size="lg" />} />
        <StatTile label="Aprendices" value={p.learners} hint={`${p.groups} ${p.groups === 1 ? 'grupo' : 'grupos'} · ${p.spaces} ${p.spaces === 1 ? 'espacio' : 'espacios'}`}
          tint="bg-lilac" icon={<Icon icon={Users} size="lg" />} />
      </section>

      {firstTime && (
        <Card padding="lg" className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <Eyebrow>Primeros pasos · {facts} de {steps.length}</Eyebrow>
            <Heading level={2} size="lg" className="mt-1">Así funciona melu, en cinco pasos</Heading>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map(([k, t, d, to], i) => { const ok = p.checklist[k]; return (
                <li key={k}><Link to={to} className={`flex h-full flex-col gap-2 rounded-xl border p-3 transition ${ok ? 'border-line bg-canvas' : 'border-line hover:border-ink'}`}>
                  <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${ok ? 'bg-accent text-white' : 'bg-ink text-white'}`}>{ok ? <Icon icon={Check} size="xs" /> : i + 1}</span>
                  <span className={`text-sm font-semibold ${ok ? 'text-ink-muted line-through' : ''}`}>{t}</span>
                  <span className="text-xs text-ink-muted">{d}</span>
                </Link></li>
              )})}
            </ol>
          </div>
          <DoodleBulb size={120} className="hidden self-center text-ink lg:block" />
        </Card>
      )}

        <Card padding="lg">
          <Eyebrow>Esta semana</Eyebrow>
          <Heading level={2} size="lg" className="mt-1">
            {weekBack} de {weekOut} {weekOut === 1 ? 'misión ya volvió' : 'misiones ya volvieron'}
          </Heading>
          <Text size="sm" variant="muted">La parte llena de cada día es lo que ya entregaron.</Text>
          <div className="mt-5 flex h-28 items-stretch gap-2">
            {series.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2" title={`${d.submitted} de ${d.opened} entregadas`}>
                <div className="flex w-full flex-1 items-end">
                  <div className="flex w-full flex-col justify-end rounded-md bg-muted" style={{ height: `${Math.max(4, (d.opened / maxSeries) * 100)}%` }}>
                    <div className="w-full rounded-md bg-accent" style={{ height: d.opened ? `${(d.submitted / d.opened) * 100}%` : '0%' }} />
                  </div>
                </div>
                <span className="text-2xs text-ink-subtle">{['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(d.day + 'T12:00:00').getDay()]}</span>
              </div>
            ))}
          </div>
        </Card>

        <section className="flex flex-col gap-4">
          <div><Eyebrow>Necesitan una mano</Eyebrow><Heading level={2} size="lg" className="mt-1">Señales y sugerencias</Heading></div>
          {signals.length === 0 && <div className="rounded-xl bg-canvas p-6 text-center text-sm text-ink-muted">Sin señales por ahora. Aparecen cuando alguien se traba, tarda mucho, abandona… o vuela.</div>}
          <ul className="flex flex-col gap-3">
            {signals.map((s) => { const t = KIND[s.kind]; return (
              <li key={s.learnerId + s.kind} className="flex gap-4 rounded-xl border border-line p-4">
                <span className={`mt-0.5 shrink-0 ${t.ink}`}><Icon icon={t.icon} size="lg" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{s.learner}</span><Chip size="sm">{t.label}</Chip><Text size="xs" variant="muted">{s.group}</Text></div>
                  <p className="mt-1 text-sm text-ink-muted">{s.detail}</p>
                  <div className="mt-2 rounded-lg bg-teal px-3 py-2 text-sm">
                    <span className="font-semibold text-accent">Sugerencia · </span>{s.suggestion}
                    {s.recipeId && <SignalAction recipeId={s.recipeId} recipeTitle={s.recipeTitle} groupId={s.groupId} groupName={s.group} />}
                  </div>
                </div>
              </li>
            )})}
          </ul>
        </section>

      {recent.length > 0 && (
        <Card padding="lg">
          <div className="flex items-end justify-between"><div><Eyebrow>Entregas recientes</Eyebrow><Heading level={2} size="lg" className="mt-1">Lo último que llegó</Heading></div></div>
          <ul className="mt-4 divide-y divide-line">
            {recent.map((e) => (
              <li key={e.submissionId} className="flex flex-wrap items-center gap-4 py-3">
                <Avatar name={e.learner ?? '?'} size="sm" />
                <div className="min-w-0 flex-1"><div className="font-medium">{e.learner} <span className="text-ink-muted">· {e.title}</span></div><Text size="xs" variant="muted">{e.group} · {e.minutes ? `${e.minutes} min` : 'sin tiempo'}{e.accuracy >= 0 && ` · ${Math.round(e.accuracy * 100)}% aciertos`}</Text></div>
                <Chip size="sm" color={e.status === 'graded' ? 'success' : 'warning'}>{e.status === 'graded' ? 'Corregida' : 'Para mirar'}</Chip>
                <Button size="sm" variant={e.status === 'graded' ? 'ghost' : 'primary'} onClick={() => nav(`/review/${e.assignmentId}`)}>{e.status === 'graded' ? 'Ver' : 'Corregir'}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
