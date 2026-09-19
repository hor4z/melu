import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar, Breadcrumb, Button, Card, Divider, Dropdown, Field, IconButton, PageHeader, Progress,
  Tab, TabList, Tabs, TextField, Textarea,
} from '@milo/ui'
import { api, type Group, type GroupDetail as GD } from '../lib/api'
import { AddLearners } from '../blocks/AddLearners'
import { Cover } from '../blocks/Cover'
import { CompositionChips } from '../blocks/Chips'
import { Modal, Empty } from '../blocks/Modal'
import { Cargando, NoLlego } from '../blocks/Estado'

export function GroupDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['group', id], queryFn: () => api.get<GD>(`/api/groups/${id}/detail`) })
  const [tab, setTab] = useState('missions')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  if (q.isPending) return <Cargando bloques={2} />
  if (!q.data) return <NoLlego que="el grupo" error={q.error} onRetry={() => void q.refetch()} />
  const { group: g, assignments, learners } = q.data

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Grupos', onClick: () => nav('/groups') }, { label: g.name }]} />

      {/* Donde estaban las tres cuentas va lo que el grupo es. Los números decían lo que las
          pestañas de abajo ya dicen; la descripción dice algo que no está en ningún otro lado. */}
      <PageHeader
        title={g.name}
        subtitle={g.description || undefined}
        actions={<>
          <Button size="sm" variant="brand" icon="add" onClick={() => nav('/activities/new')}>Nueva actividad</Button>
          {/* Editar e invitar se hacen de vez en cuando y no compiten con la acción de la
              pantalla: van adentro del menú. */}
          <Dropdown
            align="end"
            width={220}
            label="Más acciones sobre el grupo"
            trigger={({ onClick, ref, 'aria-expanded': expanded }) => (
              <IconButton ref={ref} icon="more_horiz" label="Más acciones sobre el grupo" size="sm" variant="muted" onClick={onClick} aria-expanded={expanded} />
            )}
            items={[
              { label: 'Editar el grupo', icon: 'edit', onSelect: () => setEditing(true) },
              { label: 'Invitar aprendices', icon: 'person_add', onSelect: () => setAdding(true) },
            ]}
          />
        </>}
      />

      {!g.description && (
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Contá de qué se trata este grupo</Button>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabList label="Qué mirar del grupo">
          <Tab value="missions">Misiones ({assignments.length})</Tab>
          <Tab value="learners">Aprendices ({learners.length})</Tab>
        </TabList>
      </Tabs>

      {tab === 'missions' && (assignments.length === 0
        ? (
          <Empty
            icon="checklist" title="Nada asignado todavía"
            text='Elegí una plantilla o componé una actividad y asignala a este grupo. Los chicos la van a ver en "Hoy".'
            action={<Button variant="brand" onClick={() => nav('/activities/new')}>Nueva actividad</Button>}
          />
        )
        : (
          <Card className="flex flex-col p-0">
            {/* En una columna la fila se parte en dos: arriba de qué actividad se trata, abajo
                cuánto llegó y el botón. */}
            {assignments.map((a, i) => (
              <div key={a.id}>
                {i > 0 && <Divider />}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                    {/* La portada de la actividad en vez del cuadradito con el número: el número
                        solo decía en qué orden se asignó, y la portada dice cuál es. */}
                    <Cover title={a.title} size={26} className="size-12 shrink-0 rounded-[var(--radius-md)]" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-body font-semibold">{a.title}</span>
                      {a.description && <span className="line-clamp-1 text-body text-text-muted">{a.description}</span>}
                      <CompositionChips c={a.composition} compact />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:shrink-0">
                    <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
                      <Progress label="Entregas" value={a.submissions} max={a.submissionsTotal || 1} hint={`${a.submissions}/${a.submissionsTotal}`} />
                    </div>
                    <Button size="sm" variant="muted" onClick={() => nav(`/groups/${g.id}/missions/${a.id}`)}>Corregir</Button>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        ))}

      {tab === 'learners' && (learners.length === 0
        ? (
          <Empty
            icon="group_add" title="Todavía nadie se unió"
            text='Sumalos por email con "Invitar aprendices". Entran con Google y ya están adentro.'
            action={<Button variant="brand" onClick={() => setAdding(true)}>Invitar</Button>}
          />
        )
        : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {learners.map((a) => (
              <li key={a.id}>
                <Card className="flex flex-row items-center gap-3 p-3">
                  <Avatar name={a.name} size={32} />
                  <span className="text-body">{a.name}</span>
                </Card>
              </li>
            ))}
          </ul>
        ))}

      <AddDialog isOpen={adding} onClose={() => setAdding(false)} groupId={g.id} groupName={g.name} />
      <EditGroup grupo={g} isOpen={editing} onClose={() => setEditing(false)} />
    </div>
  )
}

function EditGroup({ grupo, isOpen, onClose }: { grupo: Group; isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(grupo.name)
  const [description, setDescription] = useState(grupo.description)
  const listo = name.trim() !== '' && description.trim() !== ''
  const guardar = useMutation({
    mutationFn: () => api.patch<Group>(`/api/groups/${grupo.id}`, { name, description }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['group', grupo.id] }); void qc.invalidateQueries({ queryKey: ['groups'] }); onClose() },
  })
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Editar el grupo"
      description="El nombre lo distingue de los otros; la descripción cuenta de qué se trata."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="brand" form="editar-grupo" type="submit" disabled={!listo || guardar.isPending}>
          {guardar.isPending ? 'Guardando' : 'Guardar'}
        </Button>
      </>}
    >
      <form id="editar-grupo" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate() }}>
        <Field label="Nombre" required><TextField value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Descripción" required hint="De qué se trata y con qué acuerdo. Las cantidades ya están en la pantalla.">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        {guardar.isError && <span className="text-body text-bad-ink">No se pudo guardar. Probá de nuevo.</span>}
      </form>
    </Modal>
  )
}

function AddDialog({ isOpen, onClose, groupId, groupName }: { isOpen: boolean; onClose: () => void; groupId: string; groupName: string }) {
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} boxWidth={560} title="Sumar al grupo"
      description="Escribí los emails. Entran con Google y el grupo ya los espera: no tienen que tipear nada."
      footer={<Button variant="ghost" onClick={onClose}>Listo</Button>}
    >
      <AddLearners groupId={groupId} groupName={groupName} />
    </Modal>
  )
}
