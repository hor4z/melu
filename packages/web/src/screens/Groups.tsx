import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, Chip, cn, Field, Heading, Icon, Input, Text } from '@melu/ui'
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
              <CardMedia className={cn('h-24 items-end justify-start p-3', TINTS[i % TINTS.length])}>
                <Chip color="default" className="bg-white/80 font-mono tracking-widest">{g.code}</Chip>
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
  const spaceId = space?.id ?? ''
  const create = useMutation({ mutationFn: () => api.post<Group>('/api/groups', { spaceId, name }), onSuccess: () => { setName(''); onReady() } })
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo grupo" description="Vas a recibir un código para que los chicos se unan."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button form="new-group" type="submit" loading={create.isPending}>Crear</Button></>}>
      <form id="new-group" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <Field label="Nombre" description={space ? `Se crea en «${space.name}».` : undefined}>
          <Input placeholder="Robótica de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        {create.isError && <Text size="sm" variant="danger">No se pudo crear el grupo.</Text>}
      </form>
    </Modal>
  )
}
