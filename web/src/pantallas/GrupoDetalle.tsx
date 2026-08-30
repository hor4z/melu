import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Avatar, Button, Icon, Tabs, Text } from '@/ui'
import { api, type GrupoDetalle as GD } from '../lib/api'
import { ChipsComposicion, Rotulo } from '../bloques/Chips'
import { Vacio } from '../bloques/Modal'

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
      <Link to="/grupos" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Mis grupos</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">{g.nombre}</h1><Text variant="muted">{aprendices.length} {aprendices.length === 1 ? 'aprendiz' : 'aprendices'} · {asignaciones.length} {asignaciones.length === 1 ? 'misión' : 'misiones'}{pendientes > 0 && ` · ${pendientes} entregas para mirar`}</Text></div>
        <Button onClick={() => nav('/actividades')}>Asignar una actividad</Button>
      </header>

      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-lilac px-5 py-4">
        <div><Rotulo>Código para unirse</Rotulo><div className="font-mono text-3xl font-semibold tracking-[0.3em]">{g.codigo}</div></div>
        <Text size="sm" variant="muted">Los chicos entran con Google, eligen «Aprendo» y escriben este código.</Text>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <Tabs.List>
          <Tabs.Trigger value="misiones">Misiones ({asignaciones.length})</Tabs.Trigger>
          <Tabs.Trigger value="aprendices">Aprendices ({aprendices.length})</Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      {tab === 'misiones' && (asignaciones.length === 0
        ? <Vacio titulo="Nada asignado todavía" texto="Elegí una receta o componé una actividad y asignala a este grupo." accion={<Button onClick={() => nav('/actividades')}>Ir a actividades</Button>} />
        : <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {asignaciones.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-subtle font-semibold text-brand-text">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5"><span className="font-medium">{a.titulo}</span><ChipsComposicion c={a.composicion} compacto /></div>
                <div className="flex items-center gap-3">
                  <div className="w-28"><div className="mb-1 flex justify-between text-xs text-ink-muted"><span>Entregas</span><span className="tabular-nums">{a.entregas}/{a.entregasTotales}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${a.entregasTotales ? (a.entregas / a.entregasTotales) * 100 : 0}%` }} /></div></div>
                  <Button size="sm" variant={a.entregas > 0 ? 'primary' : 'secondary'} onClick={() => nav(`/corregir/${a.id}`)}>Corregir</Button>
                </div>
              </li>
            ))}
          </ul>)}

      {tab === 'aprendices' && (aprendices.length === 0
        ? <Vacio titulo="Todavía nadie se unió" texto={`Compartí el código ${g.codigo}.`} />
        : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{aprendices.map((a) => <li key={a.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3"><Avatar name={a.nombre} size="sm" />{a.nombre}</li>)}</ul>)}
    </div>
  )
}
