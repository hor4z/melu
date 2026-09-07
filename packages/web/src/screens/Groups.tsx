import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { AvatarGroup, Button, Card, CardContent, CardMedia, cn, Field, Heading, Icon, Input, Text, Textarea } from '@melu/ui'
import { api, type Group } from '../lib/api'
import { useSpace } from '../lib/space'
import { Modal, Empty } from '../blocks/Modal'

const TINTS = ['bg-teal', 'bg-yellow', 'bg-lilac', 'bg-blue']

export function Groups() {
  const qc = useQueryClient()
  const { space } = useSpace()
  const groups = useQuery({ queryKey: ['groups', space?.id], queryFn: () => api.get<Group[]>(`/api/groups?space=${space?.id ?? ''}`) })
  const [nuevo, setFresh] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div><Heading level={1} size="xl">Mis grupos</Heading><Text variant="muted">Gente que aprende junta: un aula, un taller, una sala de refuerzo.</Text></div>
        <Button onClick={() => setFresh(true)} startIcon={<Icon icon={Plus} />}>Nuevo grupo</Button>
      </header>

      {groups.data?.length === 0 && <Empty title="Todavía no hay grupos" text="Creá el primero. Vas a recibir un código para que los chicos se unan." action={<Button onClick={() => setFresh(true)}>Crear grupo</Button>} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.data?.map((g, i) => (
          <Card key={g.id} asChild interactive>
            <Link to={`/groups/${g.id}`}>
              {/* La franja de color estaba vacía. Las caras de quiénes están dicen de un vistazo
                  lo que el número de abajo dice contando. */}
              <CardMedia className={cn('h-24 items-end justify-start p-3', TINTS[i % TINTS.length])}>
                {g.names.length > 0 && <AvatarGroup names={g.names} max={5} />}
              </CardMedia>
              <CardContent className="p-4">
                <div className="font-semibold">{g.name}</div>
                <Text size="sm" variant="muted">{g.learners} {g.learners === 1 ? 'aprendiz' : 'aprendices'}</Text>
              </CardContent>
            </Link>
          </Card>
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
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo grupo" description="Vas a recibir un código para que los chicos se unan."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button form="new-group" type="submit" loading={create.isPending} disabled={!listo}>Crear</Button></>}>
      <form id="new-group" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <Field label="Nombre" required description={space ? `Se crea en "${space.name}".` : undefined}>
          <Input placeholder="Robótica de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        {/* La ayuda y el ejemplo empujan a contar en palabras lo que la pantalla ya cuenta en
            números. Acá va lo que no se puede contar: de qué se trata y con qué acuerdo. */}
        <Field label="Descripción" required description="De qué se trata y con qué acuerdo. Las cantidades ya están en la pantalla: esto es lo que no se puede contar.">
          <Textarea
            placeholder="Contraturno de los sábados, para quien se quiera anotar. Trabajamos en equipo."
            value={description} onChange={(e) => setDescription(e.target.value)} rows={3} autoGrow required
          />
        </Field>
        {create.isError && <Text size="sm" variant="danger">No se pudo crear el grupo.</Text>}
      </form>
    </Modal>
  )
}
