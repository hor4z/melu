// Lo que ve el que planifica. Es una lectura cronológica de arriba a abajo, agrupada por semana,
// y no una grilla: las cosas de la escuela no colisionan (la clase es cuando es la clase, una
// tarea no ocupa un horario), así que una grilla gastaría todo su espacio en densidad por hora
// del día, que acá no dice nada. Lo que dice algo es qué día, en qué orden, y si está hecho.
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Repeat, Scissors } from 'lucide-react'
import { Alert, Button, Card, Chip, DoodleMapa, EmptyState, Eyebrow, Icon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Text, cn } from '@/kit'
import { api, type Grupo, type Programacion as Prog, type Programado } from '../lib/api'
import { useEspacio } from '../lib/espacio'
import { Modal } from '../bloques/Modal'
import { Portada } from '../bloques/Portada'
import {
  describirRepeticion, diaDeIso, esPasado, formatearDia, formatearDiaLargo, formatearHora,
  hoyDia, inicioDeSemana, sumarDias, type Dia,
} from '../lib/fechas'

const SEMANAS = 6

export function Programacion() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { espacio } = useEspacio()
  const [params, setParams] = useSearchParams()
  const [grupo, setGrupo] = useState('')
  const [cortar, setCortar] = useState<Programado | null>(null)

  // El ancla vive en la URL: recargar y compartir funcionan sin estado escondido.
  const ancla: Dia = params.get('desde') ?? inicioDeSemana(hoyDia())
  const hasta = sumarDias(ancla, SEMANAS * 7)
  const mover = (n: number) => setParams((p) => { p.set('desde', sumarDias(ancla, n * 7)); return p })

  const grupos = useQuery({ queryKey: ['grupos', espacio?.id], queryFn: () => api.get<Grupo[]>(`/api/grupos?espacio=${espacio?.id ?? ''}`) })
  const q = useQuery({
    queryKey: ['programacion', espacio?.id, ancla],
    queryFn: () => api.get<Prog>(`/api/programacion?espacio=${espacio?.id ?? ''}&desde=${new Date(`${ancla}T00:00:00`).toISOString()}&hasta=${new Date(`${hasta}T23:59:59`).toISOString()}`),
    // Sin esto, cambiar de rango parpadea: la pantalla usa `if (!q.data) return null`.
    placeholderData: (prev) => prev,
  })

  const items = useMemo(() => (q.data?.items ?? []).filter((i) => !grupo || i.grupoId === grupo), [q.data, grupo])
  const semanas = useMemo(() => agruparPorSemana(items), [items])
  // La regla se describe una sola vez, en la primera ocurrencia que se ve: repetir «los martes
  // a las 10, hasta el 15 de septiembre» en cada fila es ruido, no información.
  const describir = useMemo(() => {
    const vistas = new Set<string>()
    const primera = new Set<string>()
    for (const i of items) {
      if (!i.serieId || vistas.has(i.serieId)) continue
      vistas.add(i.serieId)
      primera.add(i.asignacionId)
    }
    return primera
  }, [items])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <Eyebrow>Programación</Eyebrow>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Qué viene</h1>
          <Text variant="muted">Cuándo aparece cada actividad, cuándo se entrega, y qué te quedó sin cerrar.</Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={grupo} onValueChange={setGrupo}>
            <SelectTrigger><SelectValue placeholder="Todos los grupos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los grupos</SelectItem>
              {(grupos.data ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={() => mover(-1)} aria-label="Semana anterior"><Icon icon={ChevronLeft} size="sm" /></Button>
          <Button variant="secondary" size="sm" onClick={() => setParams((p) => { p.delete('desde'); return p })}>Hoy</Button>
          <Button variant="secondary" size="sm" onClick={() => mover(1)} aria-label="Semana siguiente"><Icon icon={ChevronRight} size="sm" /></Button>
          <Button size="sm" onClick={() => nav('/actividades')}>Elegir una actividad</Button>
        </div>
      </header>

      {semanas.length === 0 && (
        <EmptyState icon={<DoodleMapa size={150} className="text-ink" />}
          title="No hay nada programado en estas semanas"
          description="Elegí una actividad de tu biblioteca y ponele fecha. Si se repite todas las semanas, la programás una vez."
          actions={<Button onClick={() => nav('/actividades')}>Ir a mis actividades</Button>} />
      )}

      {semanas.map(([lunes, dias]) => (
        <section key={lunes} className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">
            {lunes === inicioDeSemana(hoyDia()) ? 'Esta semana' : `Semana del ${formatearDia(lunes)}`}
            <span className="ml-2 font-sans text-sm font-normal text-ink-subtle">{formatearDia(lunes)} al {formatearDia(sumarDias(lunes, 6))}</span>
          </h2>
          {dias.map(([dia, del]) => (
            <div key={dia} className="flex flex-col gap-2">
              <div className={cn('text-xs font-bold uppercase tracking-[0.12em]', esPasado(dia) ? 'text-ink-subtle' : 'text-ink-muted')}>
                {formatearDiaLargo(dia)}
              </div>
              <Card asChild><ul className="divide-y divide-line overflow-hidden">
                {del.map((i) => <Fila key={i.asignacionId} i={i} serie={i.serieId && describir.has(i.asignacionId) ? q.data?.series[i.serieId] : undefined} onCortar={() => setCortar(i)} />)}
              </ul></Card>
            </div>
          ))}
        </section>
      ))}

      <CortarSerie item={cortar} onCerrar={() => setCortar(null)} onListo={() => { setCortar(null); qc.invalidateQueries({ queryKey: ['programacion'] }) }} />
    </div>
  )
}

function Fila({ i, serie, onCortar }: { i: Programado; serie?: { dias: number[]; hora: string; plazo: number | null; desde: string; hasta: string }; onCortar: () => void }) {
  const nav = useNavigate()
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3">
      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-ink">{formatearHora(i.abre)}</span>
      <Portada titulo={i.titulo} className="size-10 shrink-0 rounded-lg" size={22} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{i.titulo}</span>
          {i.serieId && <Icon icon={Repeat} size="xs" className="shrink-0 text-ink-subtle" />}
        </div>
        <Text size="xs" variant="muted">
          {i.grupo}
          {i.cierra ? ` · se entrega el ${formatearDia(diaDeIso(i.cierra))}` : ' · sin fecha de entrega'}
        </Text>
        {serie && <Text size="xs" variant="subtle">{describirRepeticion(serie as never)}</Text>}
      </div>
      <div className="flex items-center gap-3">
        {/* «Sin corregir» es la respuesta a «¿me quedó algo sin cerrar?»: la única cifra que se
            busca cuando se mira algo que ya pasó. */}
        <div className="w-28 text-right">
          <Text size="xs" variant="muted" className="tabular-nums">{i.entregas}/{i.totales} entregadas</Text>
          {i.sinCorregir > 0 && <Chip size="sm" color="warning">{i.sinCorregir} sin corregir</Chip>}
        </div>
        {i.sinCorregir > 0
          ? <Button size="sm" onClick={() => nav(`/corregir/${i.asignacionId}`)}>Corregir</Button>
          : <Button size="sm" variant="secondary" onClick={() => nav(`/corregir/${i.asignacionId}`)}>Ver</Button>}
        {i.serieId && <Button size="sm" variant="ghost" onClick={onCortar} startIcon={<Icon icon={Scissors} size="xs" />}>Cortar</Button>}
      </div>
    </li>
  )
}

function CortarSerie({ item, onCerrar, onListo }: { item: Programado | null; onCerrar: () => void; onListo: () => void }) {
  const [r, setR] = useState<{ borradas: number; conservadas: number } | null>(null)
  const cortar = useMutation({
    mutationFn: () => api.del<{ borradas: number; conservadas: number }>(`/api/series/${item!.serieId}?desde=${encodeURIComponent(item!.abre)}`),
    onSuccess: setR,
  })
  if (!item) return null
  return (
    <Modal abierto onCerrar={() => { setR(null); onCerrar() }} titulo="Dejar de repetir"
      descripcion={`Se van a borrar las fechas de «${item.titulo}» desde el ${formatearDia(diaDeIso(item.abre))} en adelante. Las anteriores quedan como están.`}
      pie={r
        ? <Button onClick={() => { setR(null); onListo() }}>Listo</Button>
        : <><Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
            <Button variant="destructive" loading={cortar.isPending} onClick={() => cortar.mutate()}>Cortar desde acá</Button></>}>
      {r
        ? <Alert variant={r.conservadas > 0 ? 'warning' : 'success'}>
            Se borraron {r.borradas} {r.borradas === 1 ? 'fecha' : 'fechas'}.
            {r.conservadas > 0 && ` Se conservaron ${r.conservadas} porque ya tenían trabajo entregado: eso no se borra.`}
          </Alert>
        : <Text size="sm" variant="muted">
            Lo que ya tenga entregas no se borra: es trabajo de los chicos. Te digo cuántas quedaron.
          </Text>}
    </Modal>
  )
}

/** Agrupa en [semana → [día → items]], conservando el orden cronológico que ya trae el servidor. */
function agruparPorSemana(items: Programado[]): [Dia, [Dia, Programado[]][]][] {
  const porDia = new Map<Dia, Programado[]>()
  for (const i of items) {
    const d = diaDeIso(i.abre)
    if (!porDia.has(d)) porDia.set(d, [])
    porDia.get(d)!.push(i)
  }
  const porSemana = new Map<Dia, [Dia, Programado[]][]>()
  for (const [dia, del] of [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const l = inicioDeSemana(dia)
    if (!porSemana.has(l)) porSemana.set(l, [])
    porSemana.get(l)!.push([dia, del])
  }
  return [...porSemana.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}
