import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Button, Card, Chip, DoodleGroup, EmptyState, Eyebrow, Heading, Icon, Input, ProgressRing, Text } from '@melu/ui'
import { api, type Assignment, type Group, type Room, type Me } from '../lib/api'
import { CompositionChips } from '../blocks/Chips'
import { Cover } from '../blocks/Cover'

const STATUS = { null: ['Empezar', 'primary'], in_progress: ['Continuar', 'primary'], submitted: ['Ver', 'ghost'], graded: ['Ver devolución', 'secondary'] } as const

export function Today({ me }: { me: Me }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['today'], queryFn: () => api.get<Room[]>('/api/today') })
  const everyOne = q.data?.flatMap((s) => s.missions) ?? []
  const pending = everyOne.filter((m) => m.myStatus !== 'submitted' && m.myStatus !== 'graded')
  const done = everyOne.length - pending.length
  const upcoming: Assignment | undefined = pending.find((m) => m.myStatus === 'in_progress') ?? pending[0]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div><Eyebrow>Hoy</Eyebrow><Heading level={1} size="2xl" className="mt-1">Hola, {me.person.Name.split(' ')[0]}</Heading><Text variant="muted">{pending.length === 0 ? 'Nada pendiente. Bien hecho.' : pending.length === 1 ? 'Tenés una misión pendiente.' : `Tenés ${pending.length} misiones pendientes.`}</Text></div>
        {everyOne.length > 0 && <ProgressRing value={done / everyOne.length} size={64}>{done}/{everyOne.length}</ProgressRing>}
      </header>

      {upcoming && (
        <Card className="grid overflow-hidden sm:grid-cols-[220px_1fr]">
          <Cover title={upcoming.title} className="h-40 sm:h-auto" size={110} />
          <div className="flex flex-col gap-3 p-6">
            <Eyebrow>{upcoming.myStatus === 'in_progress' ? 'Seguí donde estabas' : 'Empezá por acá'}</Eyebrow>
            <Heading level={2} size="xl">{upcoming.title}</Heading>
            <CompositionChips c={upcoming.composition} compact />
            <Text size="sm" variant="muted">{upcoming.groupName}. Se guarda solo mientras trabajás: podés parar y volver.</Text>
            <div className="mt-auto pt-2"><Button size="lg" onClick={() => nav(`/mission/${upcoming.id}`)} endIcon={<Icon icon={ArrowRight} size="sm" />}>{upcoming.myStatus === 'in_progress' ? 'Continuar' : 'Empezar'}</Button></div>
          </div>
        </Card>
      )}

      {q.data?.length === 0 && (
        <EmptyState icon={<DoodleGroup size={160} className="text-ink" />} title="Todavía no estás en ningún grupo" description="Pedile el código a tu docente y escribilo acá abajo." />
      )}

      {q.data?.map((s) => (
        <section key={s.group.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><Heading level={2} size="lg">{s.group.name}</Heading><Text size="xs" variant="muted">{s.group.learners} en el grupo</Text></div>
          {s.missions.length === 0 && <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">Todavía no hay misiones en este grupo.</div>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.missions.map((m) => { const [label, variant] = STATUS[String(m.myStatus) as keyof typeof STATUS]; return (
              <li key={m.id} className="flex overflow-hidden rounded-xl border border-line bg-surface">
                <Cover title={m.title} className="w-24 shrink-0" size={52} />
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{m.title}</span>{m.myStatus === 'graded' && <Chip color="success" size="sm">Corregida</Chip>}{m.myStatus === 'submitted' && <Chip size="sm">Entregada</Chip>}</div>
                  <CompositionChips c={m.composition} compact />
                  <div className="mt-auto pt-1"><Button variant={variant} size="sm" onClick={() => nav(`/mission/${m.id}`)}>{label}</Button></div>
                </div>
              </li>
            )})}
          </ul>
        </section>
      ))}
      <OtherGroup />
    </div>
  )
}

function OtherGroup() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const joinIt = useMutation({ mutationFn: () => api.post<Group>('/api/join', { code }), onSuccess: () => { setCode(''); setIsOpen(false); qc.invalidateQueries({ queryKey: ['today'] }) } })
  if (!isOpen) return <Button variant="ghost" size="sm" className="self-start" onClick={() => setIsOpen(true)}>+ Unirme a otro grupo con un código</Button>
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); joinIt.mutate() }}>
      <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123" className="w-40 font-mono uppercase" />
      <Button type="submit" loading={joinIt.isPending} disabled={code.length < 6}>Unirme</Button>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
      {joinIt.isError && <Text size="sm" variant="danger">Ese código no existe.</Text>}
    </form>
  )
}
