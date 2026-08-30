import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { TabList, Tab } from '@astryxdesign/core/TabList'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { api, type GrupoDetalle as GD } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'

export function GrupoDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['grupo', id], queryFn: () => api.get<GD>(`/api/grupos/${id}/detalle`) })
  const [tab, setTab] = useState('misiones')
  if (!q.data) return null
  const { grupo: g, asignaciones, aprendices } = q.data
  const pendientes = asignaciones.reduce((n, a) => n + a.entregas, 0)

  return (
    <div className="flex flex-col gap-6">
      <Link to="/grupos" className="text-sm text-secondary hover:text-primary">← Mis grupos</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{g.nombre}</h1>
          <Text color="secondary">{aprendices.length} {aprendices.length === 1 ? 'aprendiz' : 'aprendices'} · {asignaciones.length} {asignaciones.length === 1 ? 'misión' : 'misiones'}{pendientes > 0 && ` · ${pendientes} entregas para mirar`}</Text>
        </div>
        <Button label="Asignar una actividad" variant="primary" onClick={() => nav('/actividades')} />
      </header>

      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-accent-muted px-5 py-4">
        <div>
          <Text size="sm" color="secondary">Código para unirse</Text>
          <div className="font-mono text-3xl font-semibold tracking-[0.3em]">{g.codigo}</div>
        </div>
        <Text size="sm" color="secondary">Los chicos entran con Google, eligen «Aprendo» y escriben este código. Listo.</Text>
      </div>

      <TabList value={tab} onChange={setTab} hasDivider>
        <Tab value="misiones" label={`Misiones (${asignaciones.length})`} />
        <Tab value="aprendices" label={`Aprendices (${aprendices.length})`} />
      </TabList>

      {tab === 'misiones' && (
        asignaciones.length === 0
          ? <EmptyState title="Nada asignado todavía" description="Elegí una receta o componé una actividad y asignala a este grupo." actions={<Button label="Ir a actividades" variant="primary" onClick={() => nav('/actividades')} />} />
          : <ul className="flex flex-col gap-3">
              {asignaciones.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-card p-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-heading text-lg font-semibold">{a.titulo}</span>
                    <ChipsComposicion c={a.composicion} compacto />
                  </div>
                  <div className="flex items-center gap-3">
                    <Text size="sm" color="secondary" hasTabularNumbers>{a.entregas}/{a.entregasTotales} entregaron</Text>
                    <Button label="Corregir" variant={a.entregas > 0 ? 'primary' : 'secondary'} size="sm" onClick={() => nav(`/corregir/${a.id}`)} />
                  </div>
                </li>
              ))}
            </ul>
      )}

      {tab === 'aprendices' && (
        aprendices.length === 0
          ? <EmptyState title="Todavía nadie se unió" description={`Compartí el código ${g.codigo}.`} />
          : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {aprendices.map((a) => <li key={a.id} className="flex items-center gap-3 rounded-lg border border-default bg-card px-4 py-3"><span className="grid size-8 place-items-center rounded-full bg-muted text-sm font-semibold">{a.nombre[0]}</span>{a.nombre}</li>)}
            </ul>
      )}
    </div>
  )
}
