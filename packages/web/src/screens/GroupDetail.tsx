import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, QrCode } from 'lucide-react'
import { Avatar, Button, Card, Eyebrow, Heading, Icon, Tabs, TabsList, TabsTrigger, Text } from '@melu/ui'
import { api, type GroupDetail as GD } from '../lib/api'
import { AddLearners } from '../blocks/AddLearners'
import { CompositionChips } from '../blocks/Chips'
import { Modal, Empty } from '../blocks/Modal'
import { ProfileRow, GroupSummary, ProfileCard } from '../blocks/Profile'
import type { LiveProfile } from '../lib/profile'

export function GroupDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['group', id], queryFn: () => api.get<GD>(`/api/groups/${id}/detail`) })
  const [tab, setTab] = useState('misiones')
  const [adding, setAdding] = useState(false)
  const [isOpen, setIsOpen] = useState<string | null>(null)
  const profiles = useQuery({ queryKey: ['profiles', id], queryFn: () => api.get<LiveProfile[]>(`/api/groups/${id}/profiles`), enabled: tab === 'perfiles' })
  if (!q.data) return null
  const { group: g, assignments, learners } = q.data
  const pending = assignments.reduce((n, a) => n + a.submissions, 0)

  return (
    <div className="flex flex-col gap-6">
      <Link to="/groups" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Mis grupos</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Eyebrow>Grupo</Eyebrow><Heading level={1} size="2xl" className="mt-1">{g.name}</Heading><Text variant="muted">{learners.length} {learners.length === 1 ? 'aprendiz' : 'aprendices'} · {assignments.length} {assignments.length === 1 ? 'misión' : 'misiones'}{pending > 0 && ` · ${pending} entregas para mirar`}</Text></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setAdding(true)} startIcon={<Icon icon={QrCode} />}>Invitar</Button><Button onClick={() => nav('/activities/new')}>Nueva actividad</Button></div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="missions">Misiones ({assignments.length})</TabsTrigger>
          <TabsTrigger value="learners">Aprendices ({learners.length})</TabsTrigger>
          <TabsTrigger value="perfiles">Cómo aprenden</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'misiones' && (assignments.length === 0
        ? <Empty title="Nada asignado todavía" text="Elegí una plantilla o componé una actividad y asignala a este grupo. Los chicos la van a ver en «Hoy»." action={<Button onClick={() => nav('/activities/new')}>Nueva actividad</Button>} />
        : <Card asChild><ul className="divide-y divide-line overflow-hidden">
            {assignments.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal font-bold text-accent">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5"><span className="font-semibold">{a.title}</span><CompositionChips c={a.composition} compact /></div>
                <div className="flex items-center gap-4">
                  <div className="w-32"><div className="mb-1 flex justify-between text-xs text-ink-muted"><span>Entregas</span><span className="tabular-nums">{a.submissions}/{a.submissionsTotal}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${a.submissionsTotal ? (a.submissions / a.submissionsTotal) * 100 : 0}%` }} /></div></div>
                  <Button size="sm" variant={a.submissions > 0 ? 'primary' : 'secondary'} onClick={() => nav(`/review/${a.id}`)}>Corregir</Button>
                </div>
              </li>
            ))}
          </ul></Card>)}

      {tab === 'aprendices' && (learners.length === 0
        ? <Empty title="Todavía nadie se unió" text="Sumalos por email con «Invitar». Entran con Google y ya están adentro." action={<Button onClick={() => setAdding(true)}>Invitar</Button>} />
        : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{learners.map((a) => (
            <li key={a.id}><Card padding="sm" className="flex-row items-center gap-3 py-3"><Avatar name={a.name} size="sm" />{a.name}</Card></li>
          ))}</ul>)}

      {tab === 'perfiles' && (learners.length === 0
        ? <Empty title="Todavía nadie se unió" text="Cuando entren, cada uno hace un recorrido de bienvenida de dos minutos y acá vas a ver con qué le va mejor a cada uno." action={<Button onClick={() => setAdding(true)}>Invitar</Button>} />
        : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Text size="sm" variant="muted" className="max-w-2xl">
                Esto no es un diagnóstico ni una etiqueta. Cada perfil arranca con lo que la persona eligió en su recorrido de bienvenida,
                y se va corrigiendo con cómo le va de verdad en cada tipo de misión. Cambia con el tiempo, y a propósito.
              </Text>
              <Button variant="secondary" size="sm" asChild><a href="/start">Hacer el recorrido</a></Button>
            </div>
            {profiles.data && <GroupSummary profiles={profiles.data} />}
            <ul className="flex flex-col gap-2">
              {(profiles.data ?? []).map((v) => (
                <li key={v.personId}>
                  <Card padding="none" className="overflow-hidden">
                    <button type="button" onClick={() => setIsOpen(isOpen === v.personId ? null : v.personId)}
                      className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-hover">
                      <Avatar name={v.name ?? ''} size="sm" />
                      <span className="min-w-0 flex-1"><span className="font-medium">{v.name}</span><Text size="xs" variant="subtle">{v.missions} {v.missions === 1 ? 'misión' : 'misiones'} con datos</Text></span>
                      <ProfileRow v={v} />
                    </button>
                    {isOpen === v.personId && <div className="border-t border-line p-5"><ProfileCard v={v} title={`Cómo aprende ${v.name?.split(' ')[0] ?? ''}`} /></div>}
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ))}

      <AddDialog isOpen={adding} onClose={() => setAdding(false)} groupId={g.id} groupName={g.name} />
    </div>
  )
}

function AddDialog({ isOpen, onClose, groupId, groupName }: { isOpen: boolean; onClose: () => void; groupId: string; groupName: string }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} boxWidth={560} title="Sumar al grupo"
      description="Escribí los emails. Entran con Google y el grupo ya los espera — no tienen que tipear nada."
      footer={<Button variant="ghost" onClick={onClose}>Listo</Button>}>
      <AddLearners groupId={groupId} groupName={groupName} />
    </Modal>
  )
}
