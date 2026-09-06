// La mesa de trabajo: qué llegó y qué falta corregir.
//
// Lo que hay que leer despacio (quién se traba, qué les cuesta, cómo aprenden) se mudó a "Cómo
// vienen". Acá quedó solo lo que se mira varias veces por día, y los cuatro números de arriba son
// cuentas de cosas que pasaron y no promedios: "5 sin corregir" se entiende sin referencia, "34.6
// min" no.
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, CheckCheck, Hourglass, Inbox, Plus, Users } from 'lucide-react'
import { Avatar, Button, Card, Chip, DoodleBulb, Eyebrow, Heading, Icon, Text } from '@melu/ui'
import { StatTile } from '../blocks/Product'
import { api, type Dashboard } from '../lib/api'
import { useSpaceId } from '../lib/space'

// Cuánto hace que llegó. En una lista de lo último que pasó, "hace 2 h" ubica mejor que una
// fecha completa, y a partir de la semana la fecha vuelve a ser lo más claro.
function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return `hace ${d} ${d === 1 ? 'día' : 'días'}`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function Home() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const p = q.data
  if (!p) return null
  const recent = p.recentSubmissions ?? []
  const series = p.weekSeries ?? []
  const steps: [string, string, string, string][] = [
    ['group', 'Creá un grupo', 'Un aula, un taller, tres alumnos: gente que aprende junta.', '/groups'],
    ['invite', 'Sumá a los chicos', 'Escribí sus emails. Entran con Google y el grupo ya los espera.', '/groups'],
    ['activity', 'Armá una actividad', 'Empezá desde una receta y editala como un documento.', '/activities/new'],
    ['assign', 'Asignala al grupo', 'Los chicos la ven en "Hoy" y la hacen a su ritmo.', '/activities'],
    ['grade', 'Mirá la primera entrega', 'La rúbrica es una botonera: dos minutos por entrega.', '/groups'],
  ]
  const facts = steps.filter(([k]) => p.checklist[k]).length
  const firstTime = facts < steps.length
  const maxSeries = Math.max(1, ...series.map((d) => d.opened))
  const weekOut = series.reduce((n, d) => n + d.opened, 0)
  const weekBack = series.reduce((n, d) => n + d.submitted, 0)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-end gap-4">
        <Heading level={1} size="2xl" className="sr-only">Inicio</Heading>
        <Button onClick={() => nav('/activities/new')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button>
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
        <StatTile label="Para mirar" value={p.toReview} hint="esperando tu devolución" tint="bg-yellow" icon={<Icon icon={Inbox} size="lg" />} />
        <StatTile label="Sin terminar" value={p.unfinished} hint="las abrieron y no entregaron" tint="bg-blue" icon={<Icon icon={Hourglass} size="lg" />} />
        <StatTile label="Corregidas" value={p.graded} hint="ya tienen tu devolución" tint="bg-lilac" icon={<Icon icon={CheckCheck} size="lg" />} />
        <StatTile label="Aprendices" value={p.learners} hint={`${p.groups} ${p.groups === 1 ? 'grupo' : 'grupos'} · ${p.spaces} ${p.spaces === 1 ? 'espacio' : 'espacios'}`} tint="bg-teal" icon={<Icon icon={Users} size="lg" />} />
      </section>

      <Card padding="lg">
        <Eyebrow>Esta semana</Eyebrow>
        <Heading level={2} size="lg" className="mt-1">
          {weekBack} de {weekOut} {weekOut === 1 ? 'misión ya volvió' : 'misiones ya volvieron'}
        </Heading>
        <Text size="sm" variant="muted">La parte llena de cada día es lo que ya entregaron.</Text>
        <div className="mt-5 flex h-28 items-stretch gap-2">
          {series.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-2"
              title={`${d.submitted} de ${d.opened} entregadas`}>
              <div className="flex w-full flex-1 items-end">
                <div className="flex w-full flex-col justify-end rounded-md bg-muted"
                  style={{ height: `${Math.max(4, (d.opened / maxSeries) * 100)}%` }}>
                  <div className="w-full rounded-md bg-accent"
                    style={{ height: d.opened ? `${(d.submitted / d.opened) * 100}%` : '0%' }} />
                </div>
              </div>
              <span className="text-2xs text-ink-subtle">{['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(d.day + 'T12:00:00').getDay()]}</span>
            </div>
          ))}
        </div>
      </Card>

      {recent.length > 0 && (
        <Card padding="lg">
          <div className="flex items-end justify-between"><div><Eyebrow>Entregas recientes</Eyebrow><Heading level={2} size="lg" className="mt-1">Lo último que llegó</Heading></div></div>
          <ul className="mt-4 divide-y divide-line">
            {recent.map((e) => (
              <li key={e.submissionId} className="flex flex-wrap items-center gap-4 py-3">
                <Avatar name={e.learner ?? '?'} size="sm" />
                <div className="min-w-0 flex-1"><div className="font-medium">{e.learner} <span className="text-ink-muted">· {e.title}</span></div><Text size="xs" variant="muted">{e.group} · {ago(e.when)} · {e.minutes ? `${e.minutes} min` : 'sin tiempo'}{e.accuracy >= 0 && ` · ${Math.round(e.accuracy * 100)}% aciertos`}</Text></div>
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
