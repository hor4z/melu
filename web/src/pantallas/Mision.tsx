import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronLeft, Lightbulb, X } from 'lucide-react'
import { Button, Chip, Eyebrow, Icon, ProgressRing, Text, cn } from '@/kit'
import { api, type Bloque, type Entrega, type FaseDoc, type Mision, type Pasos, type Respuestas, type ValorRespuesta } from '../lib/api'
import { CORRIGE_SOLO, ES_INTERACTIVO } from '../lib/composicion'
import { BloqueInteractivo, BloqueLectura, evaluar, tieneValor, type EstadoPaso } from '../bloques/Interactivo'
import { puntajeJuego } from '../bloques/Juegos'
import { Portada } from '../bloques/Portada'

/** Una pantalla: o un bloque interactivo, o un tramo de lectura. */
type Paso = { fase: number; faseNombre: string; lectura: Bloque[]; bloque?: Bloque }

/** Agrupa los bloques de lectura seguidos y le da pantalla propia a cada bloque interactivo. */
function armarPasos(fases: FaseDoc[]): Paso[] {
  const out: Paso[] = []
  fases.forEach((f, fi) => {
    let buffer: Bloque[] = []
    for (const b of f.bloques) {
      if (ES_INTERACTIVO(b.tipo)) { out.push({ fase: fi, faseNombre: f.nombre, lectura: buffer, bloque: b }); buffer = [] }
      else buffer.push(b)
    }
    if (buffer.length) out.push({ fase: fi, faseNombre: f.nombre, lectura: buffer })
  })
  return out
}

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
  const pasos = useMemo(() => armarPasos(fases), [fases])
  const [i, setI] = useState(0)
  const [r, setR] = useState<Respuestas>(m.entrega.respuestas ?? {})
  const [ps, setPs] = useState<Pasos>(m.entrega.pasos ?? {})
  const [estado, setEstado] = useState<EstadoPaso>('editando')
  const [pistaVisible, setPistaVisible] = useState(false)
  const [terminado, setTerminado] = useState(m.entrega.estado !== 'en_curso')
  const desde = useRef(Date.now())
  const guardado = useRef<number | undefined>(undefined)

  const guardar = useMutation({
    mutationFn: (x: { respuestas: Respuestas; pasos: Pasos; entregar: boolean }) => api.put<Entrega>(`/api/entregas/${m.entrega.id}`, x),
    onSuccess: (e) => { if (e.estado !== 'en_curso') qc.invalidateQueries({ queryKey: ['hoy'] }) },
  })
  const guardarPronto = (respuestas: Respuestas, next: Pasos) => {
    window.clearTimeout(guardado.current)
    guardado.current = window.setTimeout(() => guardar.mutate({ respuestas, pasos: next, entregar: false }), 500)
  }
  useEffect(() => () => window.clearTimeout(guardado.current), [])
  useEffect(() => { desde.current = Date.now(); setEstado('editando'); setPistaVisible(false); window.scrollTo({ top: 0 }) }, [i])

  const paso = pasos[i]
  const b = paso?.bloque
  const valor = b ? r[b.id] : undefined
  const corrige = b ? CORRIGE_SOLO(b.tipo) : false
  const intentos = b ? (ps[b.id]?.intentos ?? 0) : 0

  const setValor = (v: ValorRespuesta) => { if (!b) return; const next = { ...r, [b.id]: v }; setR(next); guardarPronto(next, ps) }

  const registrar = (ok: boolean | null) => {
    if (!b) return ps
    const next: Pasos = { ...ps, [b.id]: { intentos: intentos + 1, ok, ms: Math.round((Date.now() - desde.current) / 1000) } }
    setPs(next); guardarPronto(r, next)
    return next
  }

  const comprobar = () => {
    if (!b) return
    const ok = evaluar(b, valor)
    registrar(ok)
    setEstado(ok === null ? 'revision' : ok ? 'correcto' : 'incorrecto')
  }
  const reintentar = () => setEstado('editando')
  const rendirse = () => { setEstado('revision'); if (b) registrar(false) }

  const avanzar = () => {
    if (i < pasos.length - 1) { setI(i + 1); return }
    setTerminado(true)
    window.clearTimeout(guardado.current)
    guardar.mutate({ respuestas: r, pasos: ps, entregar: true })
  }

  const respondidos = Object.values(ps).filter((p) => p.ok !== null)
  const aciertos = respondidos.filter((p) => p.ok).length
  const rubrica = m.asignacion.rubrica ?? []
  const puntajes = m.entrega.puntajes ?? []

  // ---- pantalla de cierre ----
  if (terminado) {
    const corregida = m.entrega.estado === 'corregida'
    return (
      <div className="kit-rise mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
        <ProgressRing value={respondidos.length ? aciertos / respondidos.length : 1} size={120}>
          {respondidos.length ? `${aciertos}/${respondidos.length}` : '✓'}
        </ProgressRing>
        <div>
          <Eyebrow>{corregida ? 'Con devolución' : 'Entregada'}</Eyebrow>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{corregida ? 'Ya la miró tu guía' : '¡Listo!'}</h1>
          <Text variant="muted" className="mt-1">
            {corregida ? 'Abajo está lo que te dejó.' : 'Tu guía la va a mirar. Cuando tenga devolución, te aparece acá y en «Mi progreso».'}
          </Text>
        </div>
        {respondidos.length > 0 && (
          <div className="flex gap-2">
            <Chip color="success" size="lg">{aciertos} bien</Chip>
            {respondidos.length - aciertos > 0 && <Chip color="warning" size="lg">{respondidos.length - aciertos} para repasar</Chip>}
          </div>
        )}
        {corregida && rubrica.length > 0 && (
          <div className="w-full rounded-xl border border-line bg-surface p-5 text-left">
            <Eyebrow>Tu devolución</Eyebrow>
            <ul className="mt-2 flex flex-col gap-2">
              {rubrica.map((c) => { const p = puntajes.find((x) => x.id === c.id); return (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>{c.label}</span><span className="font-semibold">{p ? c.niveles[p.nivel] : '—'}</span></li>
              )})}
            </ul>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => nav('/hoy')}>Volver a Hoy</Button>
          <Button variant="ghost" onClick={() => { setTerminado(false); setI(0) }}>Repasar lo que hice</Button>
        </div>
      </div>
    )
  }

  if (!paso) return null
  // Un juego se puede comprobar recién cuando se terminó de jugar.
  const jugado = b?.tipo === 'juego' ? (() => { const { ok, total } = puntajeJuego(b, valor); return total > 0 && (b.motor === 'memoria' ? ok === total : ((valor as number[])?.filter((x) => x !== undefined && x >= -1).length ?? 0) >= total) })() : true
  const listo = b?.tipo === 'juego' ? jugado : corrige ? tieneValor(valor) : true
  const revelado = estado !== 'editando'
  // Un primer error no delata la respuesta: todavía le queda un intento.
  const revelar = estado === 'correcto' || estado === 'revision' || (estado === 'incorrecto' && intentos >= 2)
  const explicacion = b?.explicacion

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-canvas px-5 py-4">
        <button type="button" onClick={() => (i === 0 ? nav('/hoy') : setI(i - 1))} aria-label={i === 0 ? 'Salir' : 'Anterior'}
          className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover"><Icon icon={i === 0 ? X : ChevronLeft} size="lg" /></button>
        <div className="flex flex-1 gap-1.5" aria-label={`Paso ${i + 1} de ${pasos.length}`}>
          {fases.map((f, fi) => {
            const total = pasos.filter((p) => p.fase === fi).length
            const hechos = pasos.filter((p, k) => p.fase === fi && k < i).length + (paso.fase === fi ? 0.35 : 0)
            return <span key={f.clave} className="h-2 flex-1 overflow-hidden rounded-full bg-muted" title={f.nombre}>
              <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, (hechos / Math.max(1, total)) * 100)}%` }} />
            </span>
          })}
        </div>
        <Text size="sm" variant="subtle" mono className="shrink-0">{i + 1}/{pasos.length}</Text>
      </header>

      <div className="min-h-0 flex-1">
        <div key={i} className="kit-reveal mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pb-40 pt-4">
          {i === 0 && (
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
              <Portada titulo={m.asignacion.titulo} className="size-16 shrink-0 rounded-xl" size={40} />
              <div><Eyebrow>{m.asignacion.grupoNombre}</Eyebrow><h1 className="font-display text-xl font-semibold tracking-tight">{m.asignacion.titulo}</h1></div>
            </div>
          )}
          {fases.length > 1 && <Eyebrow>{paso.faseNombre}</Eyebrow>}

          {paso.lectura.map((lb) => <BloqueLectura key={lb.id} b={lb} />)}

          {b && (
            <div className={cn('flex flex-col gap-5', estado === 'incorrecto' && 'kit-error')}>
              {b.tipo !== 'completar' && <p className="font-display text-2xl font-semibold leading-snug tracking-tight text-balance">{b.texto}</p>}
              <BloqueInteractivo b={b} valor={valor} onChange={setValor} estado={estado} revelar={revelar} />
              {b.pista && !revelado && (
                pistaVisible
                  ? <div className="flex items-start gap-2 rounded-xl bg-yellow px-4 py-3"><Icon icon={Lightbulb} className="mt-0.5" /><p className="text-sm">{b.pista}</p></div>
                  : <button type="button" onClick={() => setPistaVisible(true)} className="self-start text-sm font-semibold text-accent underline underline-offset-4">Ver una pista</button>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className={cn('shrink-0 border-t transition-colors',
        estado === 'correcto' ? 'border-success/30 bg-success-subtle' : estado === 'incorrecto' ? 'border-danger/30 bg-danger-subtle' : estado === 'revision' ? 'border-line bg-muted' : 'border-line bg-surface')}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-4">
          {revelado && (estado !== 'revision' || explicacion) && (
            <div className="flex items-start gap-3">
              {estado !== 'revision' && (
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', estado === 'correcto' ? 'bg-success text-white' : 'bg-danger text-white')}>
                  <Icon icon={estado === 'correcto' ? Check : X} size="lg" />
                </span>
              )}
              <div className="min-w-0">
                {estado !== 'revision' && <p className={cn('font-display text-lg font-semibold', estado === 'correcto' ? 'text-success' : 'text-danger')}>{estado === 'correcto' ? '¡Bien!' : intentos >= 2 ? 'Todavía no' : 'Casi'}</p>}
                {explicacion && <p className="text-sm leading-relaxed text-ink-muted">{explicacion}</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            {estado === 'incorrecto' && intentos < 2 && (
              <>
                <Button size="lg" className="flex-1" onClick={reintentar}>Volver a intentar</Button>
                <Button size="lg" variant="ghost" onClick={rendirse}>Ver la respuesta</Button>
              </>
            )}
            {estado === 'editando' && (
              <Button size="lg" block disabled={!listo}
                onClick={() => (corrige ? comprobar() : (registrar(null), avanzar()))} endIcon={corrige ? undefined : <Icon icon={ArrowRight} size="sm" />}>
                {corrige ? 'Comprobar' : i === pasos.length - 1 ? 'Entregar' : 'Continuar'}
              </Button>
            )}
            {(estado === 'correcto' || estado === 'revision' || (estado === 'incorrecto' && intentos >= 2)) && (
              <Button size="lg" block onClick={avanzar} endIcon={<Icon icon={ArrowRight} size="sm" />}>
                {i === pasos.length - 1 ? 'Entregar' : 'Continuar'}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
