import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Badge } from '@astryxdesign/core/Badge'
import { api, type Espacio, type Grupo, type Yo } from '../lib/api'

export function Grupos({ yo }: { yo: Yo }) {
  const qc = useQueryClient()
  const grupos = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Grupo[]>('/api/grupos') })
  const [nuevo, setNuevo] = useState(false)

  if (yo.espacios.length === 0) return <CrearEspacio />

  const invalidar = () => qc.invalidateQueries({ queryKey: ['grupos'] })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Heading level={1}>Mis grupos</Heading>
          <Text color="secondary">Un grupo es gente que aprende junta: un aula, un taller, una sala de refuerzo.</Text>
        </div>
        <Button label="Nuevo grupo" variant="primary" onClick={() => setNuevo(true)} />
      </div>

      {nuevo && <NuevoGrupo espacios={yo.espacios} onListo={() => { setNuevo(false); invalidar() }} onCancelar={() => setNuevo(false)} />}

      {grupos.data?.length === 0 && !nuevo && (
        <EmptyState title="Todavía no hay grupos" description="Creá el primero. Vas a recibir un código para que los chicos se unan."
          actions={<Button label="Crear grupo" variant="primary" onClick={() => setNuevo(true)} />} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.data?.map((g) => (
          <Link key={g.id} to={`/grupos/${g.id}`} className="block rounded-lg focus-visible:outline-2">
            <Card padding={5}>
              <div className="flex flex-col gap-2">
                <Text weight="bold" size="lg">{g.nombre}</Text>
                <div className="flex items-center gap-2">
                  <Badge label={`${g.aprendices} aprendices`} />
                  <Text size="sm" color="secondary" hasTabularNumbers>código {g.codigo}</Text>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function NuevoGrupo({ espacios, onListo, onCancelar }: { espacios: Espacio[]; onListo: () => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [espacioId, setEspacioId] = useState(espacios[0].id)
  const crear = useMutation({
    mutationFn: () => api.post<Grupo>('/api/grupos', { espacioId, nombre }),
    onSuccess: onListo,
  })
  return (
    <Card padding={5}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
        <Heading level={2}>Nuevo grupo</Heading>
        <TextInput label="Nombre" placeholder="Robótica de los sábados" value={nombre} onChange={setNombre} isRequired hasAutoFocus />
        {espacios.length > 1 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-secondary">Espacio</span>
            <select className="rounded-md border border-default bg-surface px-3 py-2" value={espacioId} onChange={(e) => setEspacioId(e.target.value)}>
              {espacios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
        )}
        {crear.isError && <Text size="sm" className="text-error">No se pudo crear el grupo.</Text>}
        <div className="flex gap-2">
          <Button label="Crear" type="submit" variant="primary" isLoading={crear.isPending} />
          <Button label="Cancelar" variant="ghost" onClick={onCancelar} />
        </div>
      </form>
    </Card>
  )
}

function CrearEspacio() {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('personal')
  const crear = useMutation({
    mutationFn: () => api.post<Espacio>('/api/espacios', { nombre, tipo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['yo'] }),
  })
  return (
    <div className="mx-auto max-w-lg">
      <Card padding={6}>
        <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <div>
            <Heading level={1}>Tu primer espacio</Heading>
            <Text color="secondary">Un espacio es quien organiza: una escuela, un club, un centro de apoyo, o vos.</Text>
          </div>
          <TextInput label="Nombre del espacio" placeholder="Taller de los sábados" value={nombre} onChange={setNombre} isRequired hasAutoFocus />
          <fieldset className="flex flex-wrap gap-2">
            {[['personal', 'Personal'], ['apoyo', 'Apoyo / refuerzo'], ['club', 'Club / taller'], ['escuela', 'Escuela']].map(([v, l]) => (
              <label key={v} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${tipo === v ? 'border-accent-bg bg-accent-muted' : 'border-default'}`}>
                <input type="radio" className="sr-only" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} />{l}
              </label>
            ))}
          </fieldset>
          {crear.isError && <Text size="sm" className="text-error">No se pudo crear el espacio.</Text>}
          <Button label="Crear espacio" type="submit" variant="primary" isLoading={crear.isPending} />
        </form>
      </Card>
    </div>
  )
}
