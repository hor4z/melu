import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Clock, Inbox, Layers, Sparkles, Target, TrendingDown, UserPlus, Users, Zap } from 'lucide-react'
import { Avatar, Button, Card, Chip, DoodleBulb, Eyebrow, Heading, Icon, Text } from '@melu/ui'
import { StatTile } from '../blocks/Product'
import { api, type Dashboard, type Me } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { EXPERIENCES } from '../lib/composition'

const KIND = {
  dropout: { icon: Clock, tint: 'bg-yellow', label: 'Sin terminar' },
  misses: { icon: AlertTriangle, tint: 'bg-orange', label: 'Se traba' },
  slow: { icon: TrendingDown, tint: 'bg-blue', label: 'Le lleva más' },
  shines: { icon: Zap, tint: 'bg-green', label: 'Vuela' },
} as const

export function Home({ me }: { me: Me }) {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const p = q.data
  if (!p) return null
  const signals = p.signals ?? []
  const byKind = p.byKind ?? []
  const recent = p.recentSubmissions ?? []
  const series = p.weekSeries ?? []
  const steps: [string, string, string, string][] = [
    ['group', 'Creá un grupo', 'Un aula, un taller, tres alumnos: gente que aprende junta.', '/groups'],
    ['invite', 'Invitá a los chicos', 'Compartí el código o el QR del grupo. Entran con Google.', '/groups'],
    ['activity', 'Armá una actividad', 'Empezá desde una receta y editala como un documento.', '/activities/new'],
    ['assign', 'Asignala al grupo', 'Los chicos la ven en «Hoy» y la hacen a su ritmo.', '/activities'],
    ['grade', 'Mirá la primera entrega', 'La rúbrica es una botonera: dos minutos por entrega.', '/groups'],
  ]
  const facts = steps.filter(([k]) => p.checklist[k]).length
  const firstTime = facts < steps.length
  const maxSeries = Math.max(1, ...series.map((d) => Math.max(d.opened, d.submitted)))
  const submittedSeries = series.map((d) => d.submitted)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Inicio</Eyebrow>
          <Heading level={1} size="2xl" className="mt-1">Hola, {me.person.Name.split(' ')[0]} 👋</Heading>
          <Text variant="muted">{p.toReview > 0 ? `Tenés ${p.toReview} ${p.toReview === 1 ? 'entrega' : 'entregas'} para mirar.` : 'Nada pendiente para corregir. Buen momento para armar algo nuevo.'}</Text>
        </div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => nav('/groups')} startIcon={<Icon icon={UserPlus} />}>Invitar al grupo</Button><Button onClick={() => nav('/activities/new')} startIcon={<Icon icon={Sparkles} />}>Nueva actividad</Button></div>
      </header>

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Aprendices" value={p.learners} hint={`${p.groups} ${p.groups === 1 ? 'grupo' : 'grupos'} · ${p.spaces} ${p.spaces === 1 ? 'espacio' : 'espacios'}`} tint="bg-teal" icon={<Icon icon={Users} size="lg" />} />
        <StatTile label="Para mirar" value={p.toReview} hint="entregas sin corregir" tint="bg-yellow" icon={<Icon icon={Inbox} size="lg" />} series={submittedSeries} />
        <StatTile label="Tiempo por misión" value={p.avgMinutes || '—'} unit={p.avgMinutes ? 'min' : undefined} hint="promedio desde que abren hasta que entregan" tint="bg-blue" icon={<Icon icon={Clock} size="lg" />} />
        <StatTile label="Aciertos en chequeos" value={p.accuracy >= 0 ? Math.round(p.accuracy * 100) : '—'} unit={p.accuracy >= 0 ? '%' : undefined} hint="sobre los bloques con opción correcta" tint="bg-lilac" icon={<Icon icon={Target} size="lg" />} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card padding="lg" className="gap-4">
          <div className="flex items-start justify-between"><div><Eyebrow>Necesitan una mano</Eyebrow><Heading level={2} size="lg" className="mt-1">Señales y sugerencias</Heading></div><Text size="xs" variant="muted">Reglas simples sobre lo que pasó. Nada inferido.</Text></div>
          {signals.length === 0 && <div className="rounded-xl bg-canvas p-6 text-center text-sm text-ink-muted">Sin señales por ahora. Aparecen cuando alguien se traba, tarda mucho, abandona… o vuela.</div>}
          <ul className="flex flex-col gap-3">
            {signals.map((s) => { const t = KIND[s.kind]; return (
              <li key={s.learnerId + s.kind} className="flex gap-4 rounded-xl border border-line p-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${t.tint}`}><Icon icon={t.icon} size="lg" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{s.learner}</span><Chip size="sm">{t.label}</Chip><Text size="xs" variant="muted">{s.group}</Text></div>
                  <p className="mt-1 text-sm text-ink-muted">{s.detail}</p>
                  <div className="mt-2 rounded-lg bg-teal px-3 py-2 text-sm"><span className="font-semibold text-accent">Sugerencia · </span>{s.suggestion}{s.recipeId && <> <Link to="/activities" className="font-semibold underline">{s.recipeTitle}</Link></>}</div>
                </div>
              </li>
            )})}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card padding="lg">
            <Eyebrow>Esta semana</Eyebrow>
            <Heading level={2} size="lg" className="mt-1">Misiones abiertas y entregadas</Heading>
            <div className="mt-5 flex h-36 items-end gap-2">
              {series.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.opened} abiertas · ${d.submitted} entregadas`}>
                  <div className="flex h-28 w-full items-end justify-center gap-1">
                    <div className="w-2.5 rounded-t-sm bg-line" style={{ height: `${(d.opened / maxSeries) * 100}%` }} />
                    <div className="w-2.5 rounded-t-sm bg-accent" style={{ height: `${(d.submitted / maxSeries) * 100}%` }} />
                  </div>
                  <span className="text-2xs text-ink-subtle">{['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(d.day + 'T12:00:00').getDay()]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-ink-muted"><span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-line" /> abiertas</span><span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-accent" /> entregadas</span></div>
          </Card>

          <Card padding="lg">
            <Eyebrow>Por tipo de actividad</Eyebrow>
            <Heading level={2} size="lg" className="mt-1">Qué les cuesta más</Heading>
            {byKind.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Cuando haya entregas, acá ves tiempo y aciertos por experiencia.</p> : (
              <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-ink-subtle"><th className="pb-2 font-medium">Experiencia</th><th className="pb-2 font-medium text-right">Entregas</th><th className="pb-2 font-medium text-right">Min</th><th className="pb-2 font-medium text-right">Aciertos</th></tr></thead>
                <tbody>{byKind.map((t) => <tr key={t.experience} className="border-t border-line"><td className="py-2 font-medium"><span className="flex items-center gap-2"><Icon icon={Layers} size="sm" color="subtle" />{EXPERIENCES[t.experience] ?? t.experience ?? '—'}</span></td><td className="py-2 text-right tabular-nums">{t.submissions}</td><td className="py-2 text-right tabular-nums">{t.avgMinutes || '—'}</td><td className={`py-2 text-right tabular-nums ${t.accuracy >= 0 && t.accuracy < 0.6 ? 'font-semibold text-danger' : ''}`}>{t.accuracy >= 0 ? `${Math.round(t.accuracy * 100)}%` : '—'}</td></tr>)}</tbody></table>
            )}
          </Card>
        </div>
      </div>

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
