import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Pencil, UserPlus } from 'lucide-react'
import { Avatar, Button, Card, Eyebrow, Field, Heading, Icon, Input, MoreMenu, Tabs, TabsList, TabsTrigger, Text, Textarea } from '@melu/ui'
import { api, type Group, type GroupDetail as GD } from '../lib/api'
import { AddLearners } from '../blocks/AddLearners'
import { CompositionChips } from '../blocks/Chips'
import { Modal, Empty } from '../blocks/Modal'

export function GroupDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['group', id], queryFn: () => api.get<GD>(`/api/groups/${id}/detail`) })
  const [tab, setTab] = useState('missions')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  if (!q.data) return null
  const { group: g, assignments, learners } = q.data

  return (
    <div className="flex flex-col gap-6">
      <Link to="/groups" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Mis grupos</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        {/* Donde estaban las tres cuentas va lo que el grupo es. Los números decían lo que las
            pestañas de abajo ya dicen; la descripción dice algo que no está en ningún otro lado. */}
        <div className="max-w-2xl">
          <Eyebrow>Grupo</Eyebrow>
          <Heading level={1} size="2xl" className="mt-1">{g.name}</Heading>
          {g.description
            ? <Text variant="muted" className="mt-1">{g.description}</Text>
            : (
              <Button variant="link" className="mt-1 text-sm" onClick={() => setEditing(true)}>
                Contá de qué se trata este grupo
              </Button>
            )}
        </div>
        {/* Editar e invitar se hacen de vez en cuando y no compiten con la acción de la pantalla:
            van adentro del menú. Afuera queda una sola, la que se toca todos los días. */}
        <div className="flex items-center gap-2">
          <Button onClick={() => nav('/activities/new')}>Nueva actividad</Button>
          <MoreMenu
            label="Más acciones sobre el grupo" variant="outline"
            items={[
              { label: 'Editar el grupo', icon: <Icon icon={Pencil} size="sm" />, onSelect: () => setEditing(true) },
              { label: 'Invitar aprendices', icon: <Icon icon={UserPlus} size="sm" />, onSelect: () => setAdding(true) },
            ]}
          />
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="missions">Misiones ({assignments.length})</TabsTrigger>
          <TabsTrigger value="learners">Aprendices ({learners.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'missions' && (assignments.length === 0
        ? <Empty title="Nada asignado todavía" text='Elegí una plantilla o componé una actividad y asignala a este grupo. Los chicos la van a ver en "Hoy".' action={<Button onClick={() => nav('/activities/new')}>Nueva actividad</Button>} />
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

      {tab === 'learners' && (learners.length === 0
        ? <Empty title="Todavía nadie se unió" text='Sumalos por email con "Invitar". Entran con Google y ya están adentro.' action={<Button onClick={() => setAdding(true)}>Invitar</Button>} />
        : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{learners.map((a) => (
            <li key={a.id}><Card padding="sm" className="flex-row items-center gap-3 py-3"><Avatar name={a.name} size="sm" />{a.name}</Card></li>
          ))}</ul>)}

      <AddDialog isOpen={adding} onClose={() => setAdding(false)} groupId={g.id} groupName={g.name} />
      <EditGroup grupo={g} isOpen={editing} onClose={() => setEditing(false)} />
    </div>
  )
}

function EditGroup({ grupo, isOpen, onClose }: { grupo: Group; isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(grupo.name)
  const [description, setDescription] = useState(grupo.description)
  const listo = name.trim().length >= 2 && description.trim().length >= 4
  const guardar = useMutation({
    mutationFn: () => api.patch<Group>(`/api/groups/${grupo.id}`, { name, description }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['group', grupo.id] }); void qc.invalidateQueries({ queryKey: ['groups'] }); onClose() },
  })
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Editar el grupo"
      description="El nombre lo distingue de los otros; la descripción cuenta de qué se trata."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button form="editar-grupo" type="submit" loading={guardar.isPending} disabled={!listo}>Guardar</Button></>}
    >
      <form id="editar-grupo" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
        <Field label="Nombre" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Descripción" required description="Cuándo se juntan, con qué acuerdo, qué están haciendo este mes.">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} autoGrow />
        </Field>
        {guardar.isError && <Text size="sm" className="text-danger">No se pudo guardar. Probá de nuevo.</Text>}
      </form>
    </Modal>
  )
}

function AddDialog({ isOpen, onClose, groupId, groupName }: { isOpen: boolean; onClose: () => void; groupId: string; groupName: string }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} boxWidth={560} title="Sumar al grupo"
      description="Escribí los emails. Entran con Google y el grupo ya los espera: no tienen que tipear nada."
      footer={<Button variant="ghost" onClick={onClose}>Listo</Button>}>
      <AddLearners groupId={groupId} groupName={groupName} />
    </Modal>
  )
}
