import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Field, PageHeader, TextField, Textarea, Folder } from '@milo/ui'
import { api, type Group } from '../lib/api'
import { useSpace } from '../lib/space'
import { Modal, Empty } from '../blocks/Modal'

const COLORS = ['var(--space-green)', 'var(--space-blue)', 'var(--space-purple)', 'var(--space-orange)', 'var(--space-pink)']

export function Groups() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { space } = useSpace()
  const groups = useQuery({ queryKey: ['groups', space?.id], queryFn: () => api.get<Group[]>(`/api/groups?space=${space?.id ?? ''}`) })
  const [nuevo, setFresh] = useState(false)
  return (
    <div className="page-stack">
      <PageHeader
        title="Mis grupos"
        subtitle="Gente que aprende junta: un aula, un taller, una sala de refuerzo."
        actions={<Button size="sm" variant="brand" icon="add" onClick={() => setFresh(true)}>Nuevo grupo</Button>}
      />

      {groups.data?.length === 0 && (
        <Empty
          icon="group" title="Todavía no hay grupos"
          text="Creá el primero y sumá a los chicos por email."
          action={<Button variant="brand" onClick={() => setFresh(true)}>Crear grupo</Button>}
        />
      )}

      {/* Una carpeta por grupo, como en el panel: el mismo objeto se ve igual en las dos
          pantallas, así que no hay que volver a aprender qué es cada cosa. */}
      <div className="flex flex-wrap gap-6">
        {groups.data?.map((g, i) => (
          <Folder
            key={g.id}
            size={128}
            label={g.name}
            meta={g.description || `${g.learners} ${g.learners === 1 ? 'aprendiz' : 'aprendices'}`}
            color={COLORS[i % COLORS.length]}
            avatars={(g.names ?? []).slice(0, 4).map((name) => ({ name }))}
            onClick={() => nav(`/groups/${g.id}`)}
          />
        ))}
      </div>

      <NewGroup isOpen={nuevo} onClose={() => setFresh(false)} onReady={() => { setFresh(false); qc.invalidateQueries({ queryKey: ['groups'] }) }} />
    </div>
  )
}

function NewGroup({ isOpen, onClose, onReady }: { isOpen: boolean; onClose: () => void; onReady: () => void }) {
  const { space } = useSpace()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const spaceId = space?.id ?? ''
  const create = useMutation({
    mutationFn: () => api.post<Group>('/api/groups', { spaceId, name, description }),
    onSuccess: () => { setName(''); setDescription(''); onReady() },
  })
  // Las dos hacen falta: el nombre distingue el grupo y la descripción dice qué es. Que estén,
  // nada más: cuánto escribir lo decide quien escribe.
  const listo = name.trim() !== '' && description.trim() !== ''
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Nuevo grupo"
      description="Después sumás a los chicos por email: entran con Google y el grupo ya los espera."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="brand" form="new-group" type="submit" disabled={!listo || create.isPending}>
          {create.isPending ? 'Creando' : 'Crear'}
        </Button>
      </>}
    >
      <form id="new-group" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <Field label="Nombre" required hint={space ? `Se crea en "${space.name}".` : undefined}>
          <TextField placeholder="Robótica de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        {/* La ayuda y el ejemplo empujan a contar en palabras lo que la pantalla ya cuenta en
            números. Acá va lo que no se puede contar: de qué se trata y con qué acuerdo. */}
        <Field label="Descripción" required hint="De qué se trata y con qué acuerdo. Las cantidades ya están en la pantalla: esto es lo que no se puede contar.">
          <Textarea
            placeholder="Contraturno de los sábados, para quien se quiera anotar. Trabajamos en equipo."
            value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required
          />
        </Field>
        {create.isError && <span className="text-body text-bad-ink">No se pudo crear el grupo.</span>}
      </form>
    </Modal>
  )
}
