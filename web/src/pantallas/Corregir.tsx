import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { api, type Asignacion, type Entrega, type Puntaje } from '../lib/api'
import { BloqueRunner } from '../bloques/Bloque'

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
  const bloques = (a.documento?.fases ?? []).flatMap((f) => f.bloques.map((b) => ({ ...b, fase: f.nombre })))
  const respondidos = bloques.filter((b) => ['pregunta', 'chequeo', 'evidencia', 'autoreporte'].includes(b.tipo))

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/grupos/${a.grupoId}`} className="text-sm text-secondary hover:text-primary">← {a.grupoNombre}</Link>
      <header>
        <h1 className="font-heading text-3xl font-semibold">{a.titulo}</h1>
        <Text color="secondary">{listas.length} de {a.entregasTotales} entregaron · {listas.filter((e) => e.estado === 'corregida').length} corregidas</Text>
      </header>

      {listas.length === 0 && <EmptyState title="Nadie entregó todavía" description="Cuando alguien entregue, aparece acá." />}

      {actual && (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <ul className="flex flex-col gap-1">
            {listas.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => { setSel(e.id); setPuntajes(Object.fromEntries(e.puntajes.map((p) => [p.id, p.nivel]))) }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${actual.id === e.id ? 'bg-accent-muted font-medium' : 'hover:bg-muted'}`}>
                  <span>{e.aprendiz}</span>
                  <span className={`size-2 rounded-full ${e.estado === 'corregida' ? 'bg-success' : 'bg-warning'}`} aria-label={e.estado} />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h2 className="font-heading text-xl font-semibold">{actual.aprendiz}</h2>
              {respondidos.map((b) => (
                <div key={b.id} className="flex flex-col gap-1">
                  <Text size="sm" color="secondary">{b.fase}</Text>
                  <BloqueRunner b={b} r={actual.respuestas} onChange={() => {}} soloLectura />
                </div>
              ))}
            </section>

            {rubrica.length > 0 && (
              <section className="flex flex-col gap-4 rounded-xl border border-default bg-card p-5">
                <h3 className="font-heading text-lg font-semibold">Rúbrica</h3>
                {rubrica.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {c.niveles.map((n, i) => (
                        <button key={i} type="button" onClick={() => setPuntajes((p) => ({ ...p, [c.id]: i }))}
                          className={`rounded-lg border px-3 py-3 text-sm transition ${puntajes[c.id] === i ? 'border-accent-bg bg-accent-muted font-medium' : 'border-default hover:bg-muted'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button label={actual.estado === 'corregida' ? 'Guardar cambios' : 'Guardar y siguiente'} variant="primary" onClick={() => puntuar.mutate(actual)} isLoading={puntuar.isPending} isDisabled={Object.keys(puntajes).length < rubrica.length} />
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
