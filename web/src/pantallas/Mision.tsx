import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft } from 'lucide-react'
import { Button, Icon, Text } from '@/ui'
import { api, type Entrega, type Mision, type Respuestas } from '../lib/api'
import { BloqueRunner } from '../bloques/Bloque'
import { ChipsComposicion, Rotulo } from '../bloques/Chips'

export function MisionPantalla() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['mision', id], queryFn: () => api.get<Mision>(`/api/misiones/${id}`) })
  if (!q.data) return null
  return <Runner key={q.data.entrega.id} m={q.data} />
}

function Runner({ m }: { m: Mision }) {
  const qc = useQueryClient()
  const nav = useNavigate()
  const fases = m.asignacion.documento?.fases ?? []
  const [fase, setFase] = useState(0)
  const [r, setR] = useState<Respuestas>(m.entrega.respuestas ?? {})
  const [estado, setEstado] = useState(m.entrega.estado)
  const [guardado, setGuardado] = useState(true)
  const timer = useRef<number | undefined>(undefined)
  const cerrada = estado !== 'en_curso'

  const guardar = useMutation({
    mutationFn: (x: { respuestas: Respuestas; entregar: boolean }) => api.put<Entrega>(`/api/entregas/${m.entrega.id}`, x),
    onSuccess: (e) => { setGuardado(true); setEstado(e.estado); if (e.estado !== 'en_curso') qc.invalidateQueries({ queryKey: ['hoy'] }) },
  })
  const onChange = (id: string, v: string | number) => {
    setR((prev) => { const next = { ...prev, [id]: v }; setGuardado(false); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => guardar.mutate({ respuestas: next, entregar: false }), 800); return next })
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const f = fases[fase]
  const ultima = fase === fases.length - 1
  const rubrica = m.asignacion.rubrica ?? []
  const puntajes = m.entrega.puntajes ?? []

  return (
    <div className="flex flex-col gap-6">
      <Link to="/hoy" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Hoy</Link>
      <header className="flex flex-col gap-2 border-b border-line pb-5">
        <Rotulo>{m.asignacion.grupoNombre}</Rotulo>
        <h1 className="text-2xl font-semibold tracking-tight">{m.asignacion.titulo}</h1>
        <ChipsComposicion c={m.asignacion.composicion} compacto />
      </header>

      {estado === 'corregida' && rubrica.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success-subtle p-5">
          <h2 className="font-semibold">Tu devolución</h2>
          {rubrica.map((c) => { const p = puntajes.find((x) => x.id === c.id); return <div key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>{c.label}</span><span className="font-semibold">{p ? c.niveles[p.nivel] : '—'}</span></div> })}
        </section>
      )}

      {fases.length > 1 && (
        <ol className="flex flex-wrap gap-2" aria-label="Fases">
          {fases.map((ff, i) => (
            <li key={ff.clave}><button type="button" onClick={() => setFase(i)} className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${i === fase ? 'border-brand bg-brand-subtle font-medium text-brand-text' : 'border-line text-ink-muted hover:bg-hover'}`}>
              <span className={`grid size-5 place-items-center rounded text-xs font-semibold ${i === fase ? 'bg-brand text-on-brand' : 'bg-muted'}`}>{i < fase ? <Icon icon={Check} size="xs" /> : i + 1}</span>{ff.nombre}
            </button></li>
          ))}
        </ol>
      )}

      {f && (
        <section className="flex flex-col gap-4">
          {fases.length > 1 && <div><Rotulo>Fase {fase + 1} de {fases.length}</Rotulo><h2 className="text-xl font-semibold">{f.nombre}</h2></div>}
          {f.bloques.map((b) => <BloqueRunner key={b.id} b={b} r={r} onChange={onChange} soloLectura={cerrada} />)}
          {f.bloques.length === 0 && <Text variant="muted">Esta fase está vacía.</Text>}
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Text size="xs" variant="muted">{cerrada ? (estado === 'corregida' ? 'Corregida' : 'Entregada') : guardado ? 'Guardado' : 'Guardando…'}</Text>
        <div className="flex gap-2">
          {fase > 0 && <Button variant="ghost" onClick={() => setFase(fase - 1)}>Anterior</Button>}
          {!ultima && <Button onClick={() => setFase(fase + 1)}>Siguiente</Button>}
          {ultima && !cerrada && <Button onClick={() => guardar.mutate({ respuestas: r, entregar: true })} loading={guardar.isPending}>Entregar</Button>}
          {ultima && cerrada && <Button variant="secondary" onClick={() => nav('/hoy')}>Volver a Hoy</Button>}
        </div>
      </footer>
    </div>
  )
}
