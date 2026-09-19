import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Chip, PageHeader, Progress, SectionLabel } from '@milo/ui'
import { api, type Assignment, type Room, type Me } from '../lib/api'
import { CompositionChips } from '../blocks/Chips'
import { Cover } from '../blocks/Cover'
import { Empty } from '../blocks/Modal'

const STATUS = {
  null: ['Empezar', 'brand'],
  in_progress: ['Continuar', 'brand'],
  submitted: ['Ver', 'ghost'],
  graded: ['Ver devolución', 'muted'],
} as const

export function Today({ me }: { me: Me }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['today'], queryFn: () => api.get<Room[]>('/api/today') })
  const everyOne = q.data?.flatMap((s) => s.missions) ?? []
  const pending = everyOne.filter((m) => m.myStatus !== 'submitted' && m.myStatus !== 'graded')
  const done = everyOne.length - pending.length
  const upcoming: Assignment | undefined = pending.find((m) => m.myStatus === 'in_progress') ?? pending[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hola, ${me.person.name.split(' ')[0]}`}
        subtitle={pending.length === 0 ? 'Nada pendiente. Bien hecho.' : pending.length === 1 ? 'Tenés una misión pendiente.' : `Tenés ${pending.length} misiones pendientes.`}
      />

      {everyOne.length > 0 && (
        <Progress label="Hechas de hoy" value={done} max={everyOne.length} hint={`${done}/${everyOne.length}`} tone={done === everyOne.length ? 'ok' : 'brand'} />
      )}

      {upcoming && (
        <Card className="grid gap-4 p-5 sm:grid-cols-[132px_1fr]">
          <Cover title={upcoming.title} className="h-32 w-full rounded-[var(--radius-xl)]" size={64} />
          <div className="flex flex-col gap-3">
            <span className="text-meta text-text-muted">{upcoming.myStatus === 'in_progress' ? 'Seguí donde estabas' : 'Empezá por acá'}</span>
            <h2 className="text-heading">{upcoming.title}</h2>
            <CompositionChips c={upcoming.composition} compact />
            <p className="text-body text-text-muted">{upcoming.groupName}. Se guarda solo mientras trabajás: podés parar y volver.</p>
            <div className="mt-auto pt-2">
              <Button size="lg" variant="brand" iconEnd="arrow_forward" onClick={() => nav(`/missions/${upcoming.id}`)}>
                {upcoming.myStatus === 'in_progress' ? 'Continuar' : 'Empezar'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {q.data?.length === 0 && (
        <Empty icon="group_add" title="Todavía no estás en ningún grupo" text="Pedile a tu docente que te sume con tu email. Cuando lo haga, tus misiones aparecen acá." />
      )}

      {q.data?.map((s) => (
        <section key={s.group.id} className="flex flex-col gap-3">
          <SectionLabel count={s.group.learners}>{s.group.name}</SectionLabel>
          {s.missions.length === 0 && <p className="text-body text-text-muted">Todavía no hay misiones en este grupo.</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.missions.map((m) => {
              const [label, variant] = STATUS[String(m.myStatus) as keyof typeof STATUS]
              return (
                <li key={m.id}>
                  <Card className="flex h-full gap-3 p-3">
                    <Cover title={m.title} className="size-16 shrink-0 rounded-[var(--radius-lg)]" size={34} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-body font-semibold">{m.title}</span>
                        {m.myStatus === 'graded' && <Chip color="ok" size="sm">Corregida</Chip>}
                        {m.myStatus === 'submitted' && <Chip size="sm">Entregada</Chip>}
                      </div>
                      <CompositionChips c={m.composition} compact />
                      <div className="mt-auto pt-1">
                        <Button variant={variant} size="sm" onClick={() => nav(`/missions/${m.id}`)}>{label}</Button>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
