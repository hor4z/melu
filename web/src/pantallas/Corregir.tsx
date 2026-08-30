import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Avatar, Button, Chip, Icon, Text } from '@/kit'
import { api, type Asignacion, type Entrega, type Puntaje } from '../lib/api'
import { BloqueInteractivo } from '../bloques/Interactivo'
import { Rotulo } from '../bloques/Chips'
import { ES_INTERACTIVO } from '../lib/composicion'
import { Vacio } from '../bloques/Modal'

// Una entrega a la vez, la rúbrica como botonera. Pensada para el pulgar.
export function Corregir() {
  const { id } = useParams()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['entregas', id], queryFn: () => api.get<{ asignacion: Asignacion; entregas: Entrega[] }>(`/api/asignaciones/${id}/entregas`) })
  const [sel, setSel] = useState<string | null>(null)
  const [puntajes, setPuntajes] = useState<Record<string, number>>({})
  const puntuar = useMutation({
    mutationFn: (e: Entrega) => api.put(`/api/entregas/${e.id}/puntajes`, { puntajes: Object.entries(puntajes).map(([cid, nivel]): Puntaje => ({ id: cid, nivel })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['entregas', id] }); setPuntajes({}); setSel(null) },
  })
  if (!q.data) return null
  const { asignacion: a, entregas } = q.data
  const listas = entregas.filter((e) => e.estado !== 'en_curso')
  const actual = listas.find((e) => e.id === sel) ?? listas.find((e) => e.estado === 'entregada') ?? listas[0]
  const rubrica = a.rubrica ?? []
  const respondidos = (a.documento?.fases ?? []).flatMap((f) => f.bloques.filter((b) => ES_INTERACTIVO(b.tipo)).map((b) => ({ ...b, fase: f.nombre })))

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/grupos/${a.grupoId}`} className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> {a.grupoNombre}</Link>
      <header className="border-b border-line pb-4"><h1 className="text-2xl font-semibold tracking-tight">{a.titulo}</h1><Text variant="muted">{listas.length} de {a.entregasTotales} entregaron · {listas.filter((e) => e.estado === 'corregida').length} corregidas</Text></header>

      {listas.length === 0 && <Vacio titulo="Nadie entregó todavía" texto="Cuando alguien entregue, aparece acá." />}

      {actual && (
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <ul className="flex flex-col gap-1 self-start rounded-lg border border-line bg-surface p-2">
            {listas.map((e) => (
              <li key={e.id}><button type="button" onClick={() => { setSel(e.id); setPuntajes(Object.fromEntries(e.puntajes.map((p) => [p.id, p.nivel]))) }}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${actual.id === e.id ? 'bg-brand-subtle font-medium text-brand-text' : 'hover:bg-hover'}`}>
                <Avatar name={e.aprendiz ?? '?'} size="sm" /><span className="flex-1 truncate">{e.aprendiz}</span>
                <span className={`size-2 rounded-full ${e.estado === 'corregida' ? 'bg-success' : 'bg-warning'}`} aria-label={e.estado} />
              </button></li>
            ))}
          </ul>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">{actual.aprendiz}</h2>
              {respondidos.map((b) => { const p = actual.pasos?.[b.id]; return (
                <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Rotulo>{b.fase}</Rotulo>
                    {p && p.ok !== null && <Chip size="sm" color={p.ok ? 'success' : 'danger'}>{p.ok ? 'Bien' : 'Se trabó'}{p.intentos > 1 && ` · ${p.intentos} intentos`}{p.ms ? ` · ${p.ms}s` : ''}</Chip>}
                  </div>
                  {b.tipo !== 'completar' && <p className="font-medium">{b.texto}</p>}
                  <BloqueInteractivo b={b} valor={actual.respuestas?.[b.id]} onChange={() => {}} estado="revision" revelar />
                </div>
              )})}
            </section>
            {rubrica.length > 0 && (
              <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
                <h3 className="font-semibold">Rúbrica</h3>
                {rubrica.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {c.niveles.map((n, i) => <button key={i} type="button" onClick={() => setPuntajes((p) => ({ ...p, [c.id]: i }))} className={`rounded-md border px-3 py-3 text-sm transition-colors ${puntajes[c.id] === i ? 'border-brand bg-brand-subtle font-medium text-brand-text' : 'border-line hover:bg-hover'}`}>{n}</button>)}
                    </div>
                  </div>
                ))}
                <Button onClick={() => puntuar.mutate(actual)} loading={puntuar.isPending} disabled={Object.keys(puntajes).length < rubrica.length}>{actual.estado === 'corregida' ? 'Guardar cambios' : 'Guardar y siguiente'}</Button>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
