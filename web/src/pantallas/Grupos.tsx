import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Icon, Input, Select, Text } from '@/ui'
import { api, type Espacio, type Grupo, type Yo } from '../lib/api'
import { Modal, Vacio } from '../bloques/Modal'

const TINTES = ['bg-brand-subtle', 'bg-yellow', 'bg-lilac', 'bg-cream']

export function Grupos({ yo }: { yo: Yo }) {
  const qc = useQueryClient()
  const grupos = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Grupo[]>('/api/grupos') })
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
          <Link key={g.id} to={`/grupos/${g.id}`} className="group overflow-hidden rounded-lg border border-line bg-surface transition hover:border-line-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/30">
            <div className={`flex h-24 items-end p-3 ${TINTES[i % TINTES.length]}`}><span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-xs tracking-widest">{g.codigo}</span></div>
            <div className="p-4"><div className="font-semibold">{g.nombre}</div><Text size="sm" variant="muted">{g.aprendices} {g.aprendices === 1 ? 'aprendiz' : 'aprendices'}</Text></div>
          </Link>
        ))}
      </div>

      <NuevoGrupo abierto={nuevo} espacios={yo.espacios} onCerrar={() => setNuevo(false)} onListo={() => { setNuevo(false); qc.invalidateQueries({ queryKey: ['grupos'] }) }} />
    </div>
  )
}

function NuevoGrupo({ abierto, espacios, onCerrar, onListo }: { abierto: boolean; espacios: Espacio[]; onCerrar: () => void; onListo: () => void }) {
  const [nombre, setNombre] = useState('')
  const [espacioId, setEspacioId] = useState(espacios[0]?.id ?? '')
  const crear = useMutation({ mutationFn: () => api.post<Grupo>('/api/grupos', { espacioId, nombre }), onSuccess: () => { setNombre(''); onListo() } })
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo grupo" descripcion="Vas a recibir un código para que los chicos se unan."
      pie={<><Button variant="ghost" onClick={onCerrar}>Cancelar</Button><Button form="nuevo-grupo" type="submit" loading={crear.isPending}>Crear</Button></>}>
      <form id="nuevo-grupo" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
        <label className="flex flex-col gap-1 text-sm font-medium">Nombre<Input placeholder="Robótica de los sábados" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus /></label>
        {espacios.length > 1 && <label className="flex flex-col gap-1 text-sm font-medium">Espacio<Select value={espacioId} onChange={(e) => setEspacioId(e.target.value)}>{espacios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></label>}
        {crear.isError && <Text size="sm" variant="danger">No se pudo crear el grupo.</Text>}
      </form>
    </Modal>
  )
}
