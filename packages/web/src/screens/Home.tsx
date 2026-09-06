// La mesa de trabajo: qué llegó y qué falta corregir.
//
// Lo que hay que leer despacio (quién se traba, qué les cuesta, cómo aprenden) se mudó a "Cómo
// vienen". Acá quedó solo lo que se mira varias veces por día, y los cuatro números de arriba son
// cuentas de cosas que pasaron y no promedios: "5 sin corregir" se entiende sin referencia, "34.6
// min" no.
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CheckCheck, Hourglass, Inbox, Plus, Users } from 'lucide-react'
import { Avatar, Button, Card, Chip, DoodleBulb, Eyebrow, Heading, Icon, Text } from '@melu/ui'
import { StatTile } from '../blocks/Product'
import { api, type Dashboard } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { ago } from '../lib/time'

export function Home() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const p = q.data
  if (!p) return null
  const recent = p.recentSubmissions ?? []
  const entregadas = p.toReview + p.graded
  const faltan = Math.max(0, p.assigned - entregadas)
  const steps: [string, string, string, string][] = [
    ['group', 'Creá un grupo', 'Un aula, un taller, tres alumnos: gente que aprende junta.', '/groups'],
    ['invite', 'Sumá a los chicos', 'Escribí sus emails. Entran con Google y el grupo ya los espera.', '/groups'],
    ['activity', 'Armá una actividad', 'Empezá desde una receta y editala como un documento.', '/activities/new'],
    ['assign', 'Asignala al grupo', 'Los chicos la ven en "Hoy" y la hacen a su ritmo.', '/activities'],
    ['grade', 'Mirá la primera entrega', 'La rúbrica es una botonera: dos minutos por entrega.', '/groups'],
  ]
  const facts = steps.filter(([k]) => p.checklist[k]).length
  const firstTime = facts < steps.length

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


      {recent.length > 0 && (
        <Card padding="lg">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow>Entregas</Eyebrow>
              <Heading level={2} size="lg" className="mt-1">
                {entregadas} de {p.assigned} {p.assigned === 1 ? 'misión entregada' : 'misiones entregadas'}
              </Heading>
              {/* Lo que falta es el dato que el docente busca acá, y con la resta hecha: si tiene
                  que restar dos números para saber a cuántos chicos esperar, no lo hace. */}
              <Text size="sm" variant="muted">
                {faltan > 0 ? `Faltan ${faltan}.` : 'Están todas.'} {p.toReview > 0 ? `${p.toReview} esperan tu devolución.` : 'Ninguna espera devolución.'}
              </Text>
            </div>
            <Button variant="ghost" size="sm" onClick={() => nav('/submissions')} endIcon={<Icon icon={ArrowRight} size="sm" />}>Ver todas</Button>
          </div>
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
