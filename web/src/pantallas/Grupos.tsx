import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { api, type Espacio, type Grupo, type Yo } from '../lib/api'

export function Grupos({ yo }: { yo: Yo }) {
  const qc = useQueryClient()
  const grupos = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Grupo[]>('/api/grupos') })
  const [nuevo, setNuevo] = useState(false)
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Mis grupos</h1>
          <Text color="secondary">Un grupo es gente que aprende junta: un aula, un taller, una sala de refuerzo.</Text>
        </div>
        <Button label="Nuevo grupo" variant="primary" onClick={() => setNuevo(true)} />
      </header>

      {grupos.data?.length === 0 && (
        <EmptyState title="Todavía no hay grupos" description="Creá el primero. Vas a recibir un código para que los chicos se unan."
          actions={<Button label="Crear grupo" variant="primary" onClick={() => setNuevo(true)} />} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.data?.map((g) => (
          <Link key={g.id} to={`/grupos/${g.id}`} className="group flex flex-col gap-3 rounded-xl border border-default bg-card p-5 transition hover:border-accent-bg hover:shadow-sm focus-visible:outline-2">
            <span className="font-heading text-xl font-semibold">{g.nombre}</span>
            <div className="flex items-center justify-between">
              <Text size="sm" color="secondary">{g.aprendices} {g.aprendices === 1 ? 'aprendiz' : 'aprendices'}</Text>
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs tracking-widest">{g.codigo}</span>
            </div>
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
    <Dialog isOpen={abierto} onOpenChange={(o) => !o && onCerrar()} purpose="form" padding={5}>
      <DialogHeader title="Nuevo grupo" onOpenChange={(o) => !o && onCerrar()} />
      <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
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
        <div className="flex justify-end gap-2">
          <Button label="Cancelar" variant="ghost" onClick={onCerrar} />
          <Button label="Crear" type="submit" variant="primary" isLoading={crear.isPending} />
        </div>
      </form>
    </Dialog>
  )
}
