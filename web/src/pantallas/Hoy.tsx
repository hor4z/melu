// La pantalla del que ejecuta, no del que planifica. Por eso no es un calendario: es una cola
// de trabajo ordenada por urgencia, con lo atrasado arriba porque es lo que le va a doler y lo
// que todavía no abrió al pie porque no se puede empezar.
//
// El orden lo decide el servidor (app/programacion.go: `urgencia`), para que «lo primero» sea
// lo mismo acá, en la tarjeta destacada y en cualquier lista que venga después.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Clock } from 'lucide-react'
import { Button, Card, Chip, DoodleGrupo, EmptyState, Eyebrow, Icon, Input, ProgressRing, Text } from '@/kit'
import { api, type Agenda, type Asignacion, type Grupo, type Yo } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'
import { Portada } from '../bloques/Portada'
import { diaDeIso, formatearApertura, formatearDiaRelativo, formatearVencimiento } from '../lib/fechas'

const ESTADO = { null: ['Empezar', 'primary'], en_curso: ['Continuar', 'primary'], entregada: ['Ver', 'ghost'], corregida: ['Ver devolución', 'secondary'] } as const

const TOPE_ATRASADAS = 2

export function Hoy({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['hoy'], queryFn: () => api.get<Agenda>('/api/hoy') })
  const [verTodasLasAtrasadas, setVerTodas] = useState(false)
  const a = q.data
  if (!a) return null

  const abiertas = a.salas.flatMap((s) => s.misiones)
  const pendientes = abiertas.filter((m) => m.miEstado !== 'entregada' && m.miEstado !== 'corregida')
  const hechas = abiertas.length - pendientes.length
  // El servidor ya ordenó por urgencia, así que la primera pendiente ES la más urgente.
  const proxima = pendientes[0]
  const atrasadas = verTodasLasAtrasadas ? a.atrasadas : a.atrasadas.slice(0, TOPE_ATRASADAS)
  const proximas = agruparSeries(a.proximas)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Eyebrow>Hoy</Eyebrow>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Hola, {yo.persona.Nombre.split(' ')[0]}</h1>
          <Text variant="muted">{resumen(pendientes, a.atrasadas.length)}</Text>
        </div>
        {abiertas.length > 0 && <ProgressRing value={hechas / abiertas.length} size={64}>{hechas}/{abiertas.length}</ProgressRing>}
      </header>

      {/* Nunca se oculta -es lo que le va a doler- pero nunca ocupa la pantalla. Y sin regaños. */}
      {a.atrasadas.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger-subtle p-4">
          <Eyebrow className="text-danger">Se te pasó</Eyebrow>
          <ul className="flex flex-col divide-y divide-danger/15">
            {atrasadas.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{m.titulo}</div>
                  <Text size="xs" variant="muted">{m.grupoNombre} · {formatearVencimiento(m.cierra)}</Text>
                </div>
                <Button size="sm" variant="secondary" onClick={() => nav(`/mision/${m.id}`)}>Entregar igual</Button>
              </li>
            ))}
          </ul>
          {a.atrasadas.length > TOPE_ATRASADAS && !verTodasLasAtrasadas && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setVerTodas(true)}>y {a.atrasadas.length - TOPE_ATRASADAS} más</Button>
          )}
        </section>
      )}

      {proxima && (
        <Card className="grid overflow-hidden sm:grid-cols-[220px_1fr]">
          <Portada titulo={proxima.titulo} className="h-40 sm:h-auto" size={110} />
          <div className="flex flex-col gap-3 p-6">
            <Eyebrow className={proxima.cierra && new Date(proxima.cierra).getTime() - Date.now() < 864e5 ? 'text-danger' : undefined}>
              {formatearVencimiento(proxima.cierra)?.toUpperCase() ?? (proxima.miEstado === 'en_curso' ? 'SEGUÍ DONDE ESTABAS' : 'EMPEZÁ POR ACÁ')}
            </Eyebrow>
            <h2 className="font-display text-2xl font-semibold">{proxima.titulo}</h2>
            <ChipsComposicion c={proxima.composicion} compacto />
            <Text size="sm" variant="muted">{proxima.grupoNombre}. Se guarda solo mientras trabajás: podés parar y volver.</Text>
            <div className="mt-auto pt-2"><Button size="lg" onClick={() => nav(`/mision/${proxima.id}`)} endIcon={<Icon icon={ArrowRight} size="sm" />}>{proxima.miEstado === 'en_curso' ? 'Continuar' : 'Empezar'}</Button></div>
          </div>
        </Card>
      )}

      {a.salas.length === 0 && (
        <EmptyState icon={<DoodleGrupo size={160} className="text-ink" />} title="Todavía no estás en ningún grupo" description="Pedile el código a tu docente y escribilo acá abajo." />
      )}

      {a.salas.map((s) => (
        <section key={s.grupo.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">{s.grupo.nombre}</h2><Text size="xs" variant="muted">{s.grupo.aprendices} en el grupo</Text></div>
          {s.misiones.length === 0 && <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">Todavía no hay misiones en este grupo.</div>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.misiones.map((m) => { const [label, variant] = ESTADO[String(m.miEstado) as keyof typeof ESTADO]; const vence = formatearVencimiento(m.cierra); return (
              <li key={m.id} className="flex overflow-hidden rounded-xl border border-line bg-surface">
                <Portada titulo={m.titulo} className="w-24 shrink-0" size={52} />
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{m.titulo}</span>{m.miEstado === 'corregida' && <Chip color="success" size="sm">Corregida</Chip>}{m.miEstado === 'entregada' && <Chip size="sm">Entregada</Chip>}</div>
                  {vence && <Text size="xs" variant={urge(m) ? 'danger' : 'muted'} className="flex items-center gap-1"><Icon icon={Clock} size="xs" /> {vence}</Text>}
                  <ChipsComposicion c={m.composicion} compacto />
                  <div className="mt-auto pt-1"><Button variant={variant} size="sm" onClick={() => nav(`/mision/${m.id}`)}>{label}</Button></div>
                </div>
              </li>
            )})}
          </ul>
        </section>
      ))}

      {/* Sin botón: lo que no abrió no se puede empezar, y un botón que va a fallar es peor que
          no tener botón. Una serie se muestra una sola vez, con la próxima fecha y cuántas
          quedan: doce veces el mismo título es ruido, no información. */}
      {proximas.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Lo que viene</Eyebrow>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {proximas.map(({ m, repite }) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{formatearDiaRelativo(diaDeIso(m.abre))}</span>
                <span className="min-w-0 flex-1 font-medium leading-snug">
                  {m.titulo}
                  {repite > 1 && <Text as="span" size="xs" variant="subtle"> · y {repite - 1} {repite === 2 ? 'fecha más' : 'fechas más'}</Text>}
                </span>
                <Text size="xs" variant="subtle">{formatearApertura(m.abre)}</Text>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OtroGrupo />
    </div>
  )
}

/** Una serie ocupa una sola fila: la próxima fecha, y cuántas vienen detrás. */
function agruparSeries(as: Asignacion[]): { m: Asignacion; repite: number }[] {
  const cuenta = new Map<string, number>()
  for (const m of as) if (m.serieId) cuenta.set(m.serieId, (cuenta.get(m.serieId) ?? 0) + 1)
  const vistas = new Set<string>()
  const out: { m: Asignacion; repite: number }[] = []
  for (const m of as) {
    if (m.serieId) {
      if (vistas.has(m.serieId)) continue
      vistas.add(m.serieId)
      out.push({ m, repite: cuenta.get(m.serieId) ?? 1 })
    } else {
      out.push({ m, repite: 1 })
    }
    if (out.length >= 5) break
  }
  return out
}

function urge(m: Asignacion): boolean {
  return Boolean(m.cierra) && new Date(m.cierra!).getTime() - Date.now() < 864e5
}

function resumen(pendientes: Asignacion[], atrasadas: number): string {
  if (atrasadas > 0) return `Tenés ${atrasadas} ${atrasadas === 1 ? 'cosa' : 'cosas'} sin entregar de antes.`
  if (pendientes.length === 0) return 'Nada pendiente. Bien hecho.'
  const hoy = pendientes.filter((m) => m.cierra && diaDeIso(m.cierra) === diaDeIso(new Date().toISOString())).length
  if (hoy > 0) return `Tenés ${hoy} ${hoy === 1 ? 'cosa que vence' : 'cosas que vencen'} hoy.`
  return pendientes.length === 1 ? 'Tenés una misión pendiente.' : `Tenés ${pendientes.length} misiones pendientes.`
}

function OtroGrupo() {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [abierto, setAbierto] = useState(false)
  const unirme = useMutation({ mutationFn: () => api.post<Grupo>('/api/unirme', { codigo }), onSuccess: () => { setCodigo(''); setAbierto(false); qc.invalidateQueries({ queryKey: ['hoy'] }) } })
  if (!abierto) return <Button variant="ghost" size="sm" className="self-start" onClick={() => setAbierto(true)}>+ Unirme a otro grupo con un código</Button>
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); unirme.mutate() }}>
      <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123" className="w-40 font-mono uppercase" />
      <Button type="submit" loading={unirme.isPending} disabled={codigo.length < 6}>Unirme</Button>
      <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
      {unirme.isError && <Text size="sm" variant="danger">Ese código no existe.</Text>}
    </form>
  )
}
