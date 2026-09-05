import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, Chip, Field, Icon, Input, Text, cn } from '@/kit'
import { api, type Grupo } from '../lib/api'
import { useEspacio } from '../lib/espacio'
import { Modal, Vacio } from '../bloques/Modal'

const TINTES = ['bg-teal', 'bg-yellow', 'bg-lilac', 'bg-blue']

export function Grupos() {
  const qc = useQueryClient()
  const { espacio } = useEspacio()
  const grupos = useQuery({ queryKey: ['grupos', espacio?.id], queryFn: () => api.get<Grupo[]>(`/api/grupos?espacio=${espacio?.id ?? ''}`) })
  const [nuevo, setNuevo] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Mis grupos</h1><Text variant="muted">Gente que aprende junta: un aula, un taller, una sala de refuerzo.</Text></div>
        <Button onClick={() => setNuevo(true)} startIcon={<Icon icon={Plus} />}>Nuevo grupo</Button>
      </header>

      {grupos.data?.length === 0 && <Vacio titulo="Todavía no hay grupos" texto="Creá el primero. Vas a recibir un código para que los chicos se unan." accion={<Button onClick={() => setNuevo(true)}>Crear grupo</Button>} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {grupos.data?.map((g, i) => (
          <Card key={g.id} asChild interactive>
            <Link to={`/grupos/${g.id}`}>
              <CardMedia className={cn('h-24 items-end justify-start p-3', TINTES[i % TINTES.length])}>
                <Chip color="default" className="bg-white/80 font-mono tracking-widest">{g.codigo}</Chip>
              </CardMedia>
              <CardContent className="p-4">
                <div className="font-semibold">{g.nombre}</div>
                <Text size="sm" variant="muted">{g.aprendices} {g.aprendices === 1 ? 'aprendiz' : 'aprendices'}</Text>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <NuevoGrupo abierto={nuevo} onCerrar={() => setNuevo(false)} onListo={() => { setNuevo(false); qc.invalidateQueries({ queryKey: ['grupos'] }) }} />
    </div>
  )
}

function NuevoGrupo({ abierto, onCerrar, onListo }: { abierto: boolean; onCerrar: () => void; onListo: () => void }) {
  const { espacio } = useEspacio()
  const [nombre, setNombre] = useState('')
  const espacioId = espacio?.id ?? ''
  const crear = useMutation({ mutationFn: () => api.post<Grupo>('/api/grupos', { espacioId, nombre }), onSuccess: () => { setNombre(''); onListo() } })
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo grupo" descripcion="Vas a recibir un código para que los chicos se unan."
      pie={<><Button variant="ghost" onClick={onCerrar}>Cancelar</Button><Button form="nuevo-grupo" type="submit" loading={crear.isPending}>Crear</Button></>}>
      <form id="nuevo-grupo" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
        <Field label="Nombre" description={espacio ? `Se crea en «${espacio.nombre}».` : undefined}>
          <Input placeholder="Robótica de los sábados" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        </Field>
        {crear.isError && <Text size="sm" variant="danger">No se pudo crear el grupo.</Text>}
      </form>
    </Modal>
  )
}
