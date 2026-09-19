import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Alert, AlertActions, AlertBody, AlertTitle, Avatar, Button, Card, Chip, Divider, Filter,
  FilterBar, FilterReset, Icon, PageHeader, Pagination, PaginationNext, PaginationPrev,
  PaginationStatus, Search, Skeleton, Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableRow, facets, timeAgo, type ChipColor,
} from '@milo/ui'
import { Empty } from '../blocks/Modal'
import { api, type SubmissionSummary } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { useDevice } from '../lib/device'

const ESTADOS: Record<string, { label: string; color?: ChipColor }> = {
  submitted: { label: 'Para mirar', color: 'warn' },
  graded: { label: 'Corregida', color: 'ok' },
  in_progress: { label: 'Sin terminar' },
}

type Por = 'learner' | 'when'

// El orden de entrada, y el que se recupera cuando no hay cabecera que explique otro.
const ULTIMO = { por: 'when' as Por, dir: 'desc' as const }

// Cuántas filas entran en un tramo. Es aproximadamente una pantalla.
const TRAMO = 15

export function Submissions() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  // La tabla es de la pantalla ancha y de ninguna otra. Con el riel puesto, una tablet deja
  // menos de 500 px para las filas: ahí la tabla ya se arrastra de costado, y una tabla que se
  // arrastra de costado no la mira nadie. Abajo de eso, las mismas filas se rinden como lista.
  const device = useDevice()
  const conTabla = device === 'desktop'
  const q = useQuery({ queryKey: ['submissions', spaceId], queryFn: () => api.get<SubmissionSummary[]>(`/api/submissions?space=${spaceId}`) })

  const [texto, setTexto] = useState('')
  // Un solo objeto: la clave que está es el filtro que está puesto, y su arreglo es lo que tiene
  // elegido. Que un filtro esté puesto y vacío es un estado válido.
  const [filtros, setFiltros] = useState<Record<string, string[]>>({})
  const [orden, setOrden] = useState<{ por: Por; dir: 'asc' | 'desc' }>(ULTIMO)
  const [pagina, setPagina] = useState(0)
  // Cambiar lo que se está mirando devuelve a la primera página. Sin esto, buscar desde la
  // página tres saltaba directo al resultado 31 de una lista nueva.
  const filtrar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(0) }
  const ponerFiltro = (clave: string) => (v: string[]) => { setFiltros((f) => ({ ...f, [clave]: v })); setPagina(0) }

  // Cambiar de espacio no desmonta la pantalla, así que lo que había filtrado se quedaba puesto
  // sobre datos de otro lado. Se reacomoda durante el render, que es como React pide hacer esto.
  const [espacioPrevio, setEspacioPrevio] = useState(spaceId)
  if (espacioPrevio !== spaceId) {
    setEspacioPrevio(spaceId)
    setTexto('')
    setFiltros({})
    setOrden(ULTIMO)
    setPagina(0)
  }

  const todas = useMemo(() => q.data ?? [], [q.data])

  // `salvo` deja afuera un filtro para contar las opciones de ese mismo filtro. Así el número
  // que muestra cada opción es el que va a quedar si la tocás, y no el de la tabla entera.
  const puesto = (clave: string) => filtros[clave] ?? []
  const deja = (clave: string, valor: string, salvo?: string) =>
    salvo === clave || puesto(clave).length === 0 || puesto(clave).includes(valor)
  const pasa = (e: SubmissionSummary, salvo?: 'texto' | 'estado' | 'grupo' | 'persona') => {
    const t = texto.trim().toLowerCase()
    if (salvo !== 'texto' && t && !`${e.learner ?? ''} ${e.title} ${e.group}`.toLowerCase().includes(t)) return false
    return deja('estado', e.status, salvo) && deja('grupo', e.group, salvo) && deja('persona', e.learner ?? '', salvo)
  }

  const porEstado = facets(todas.filter((e) => pasa(e, 'estado')), (e) => e.status)
  const porGrupo = facets(todas.filter((e) => pasa(e, 'grupo')), (e) => e.group)
  const porPersona = facets(todas.filter((e) => pasa(e, 'persona')), (e) => e.learner)

  const alfabetico = (a: string, b: string) => a.localeCompare(b, 'es')
  const grupos = [...new Set(todas.map((e) => e.group))].sort(alfabetico)
  const personas = [...new Set(todas.map((e) => e.learner).filter((n): n is string => !!n))].sort(alfabetico)

  // El orden se lee de una cabecera: en el celular no hay cabecera, así que la lista va como
  // promete el título, con lo último arriba. Se guarda igual, así que volver a la tabla lo devuelve.
  const orden_ = conTabla ? orden : ULTIMO

  const valor = (e: SubmissionSummary) => (orden_.por === 'learner' ? (e.learner ?? '') : e.when)
  const lista = todas.filter((e) => pasa(e))
    .sort((a, b) => (orden_.dir === 'asc' ? 1 : -1) * valor(a).localeCompare(valor(b), 'es'))

  // La página se acomoda si el filtro dejó menos de las que hacían falta para llegar hasta acá:
  // sin esto, filtrar estando en la tres dejaba una tabla vacía y sin nada que tocar.
  const ultima = Math.max(0, Math.ceil(lista.length / TRAMO) - 1)
  if (pagina > ultima) setPagina(ultima)
  const desde = Math.min(pagina, ultima) * TRAMO
  const alaVista = lista.slice(desde, desde + TRAMO)
  const hayMas = desde + TRAMO < lista.length

  const filtrando = texto.trim() !== '' || Object.values(filtros).some((v) => v.length > 0)
  const limpiar = () => { setTexto(''); setFiltros({}); setPagina(0) }

  // Desde `orden_` y no desde `orden`: si la columna que ordenaba se escondió, la cabecera que
  // se ve activa es otra, y el primer clic tiene que darla vuelta y no repetir lo que ya está.
  const ordenarPor = (por: Por) => {
    setPagina(0)
    setOrden(orden_.por === por
      ? { por, dir: orden_.dir === 'asc' ? 'desc' : 'asc' }
      : { por, dir: por === 'learner' ? 'asc' : 'desc' })
  }

  /** La cabecera que ordena: dice por qué columna está ordenada y en qué sentido. */
  const ordenar = (por: Por, label: string) => (
    <button type="button" onClick={() => ordenarPor(por)} className="inline-flex items-center gap-1">
      {label}
      {orden_.por === por && <Icon name={orden_.dir === 'asc' ? 'arrow_upward' : 'arrow_downward'} size={14} className="icon-muted" />}
    </button>
  )

  // La fila que se toca es la que se abre: la dirección lleva la entrega y no solo la misión.
  const abrir = (e: SubmissionSummary) => nav(`/groups/${e.groupId}/missions/${e.assignmentId}/submissions/${e.submissionId}`)
  const accion = (e: SubmissionSummary) => (
    <Button size="sm" variant={e.status === 'submitted' ? 'brand' : 'ghost'} onClick={() => abrir(e)}>
      {e.status === 'submitted' ? 'Corregir' : 'Ver'}
    </Button>
  )
  const vacio = (
    <Empty
      icon="inbox"
      title="Nada acá"
      text={filtrando ? 'Con estos filtros no queda ninguna entrega.' : 'Todavía no llegó ninguna entrega.'}
      action={filtrando ? <Button variant="muted" onClick={limpiar}>Limpiar los filtros</Button> : undefined}
    />
  )

  // La cabecera y la barra se rinden siempre. Devolver `null` mientras carga deja la pantalla en
  // blanco y hace saltar todo cuando llegan los datos; y como `!q.data` también es cierto cuando
  // falla, un error se veía igual que una demora: nada, para siempre.
  if (q.isError) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader title="Entregas" subtitle="Todo lo que llegó, de todos tus grupos, con lo último arriba." />
        <Alert tone="bad">
          <AlertTitle>No se pudieron traer las entregas</AlertTitle>
          <AlertBody>Puede ser la conexión. Lo que ya estaba corregido sigue estando.</AlertBody>
          <AlertActions>
            <Button size="sm" variant="muted" disabled={q.isFetching} onClick={() => void q.refetch()}>Reintentar</Button>
          </AlertActions>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader title="Entregas" subtitle="Todo lo que llegó, de todos tus grupos, con lo último arriba." />

      <FilterBar>
        <Search value={texto} onValueChange={filtrar(setTexto)} placeholder="Buscar por nombre o actividad" size="sm" />
        <Filter
          label="Estado" value={puesto('estado')} onValueChange={ponerFiltro('estado')}
          options={Object.keys(ESTADOS).map((k) => ({ value: k, label: ESTADOS[k].label, count: porEstado[k] ?? 0 }))}
        />
        {grupos.length > 1 && (
          <Filter
            label="Grupo" value={puesto('grupo')} onValueChange={ponerFiltro('grupo')}
            options={grupos.map((g) => ({ value: g, label: g, count: porGrupo[g] ?? 0 }))}
          />
        )}
        {personas.length > 1 && (
          <Filter
            label="Aprendiz" value={puesto('persona')} onValueChange={ponerFiltro('persona')}
            options={personas.map((n) => ({ value: n, label: n, count: porPersona[n] ?? 0, person: { name: n } }))}
          />
        )}
        {filtrando && <FilterReset onClick={limpiar} />}
      </FilterBar>

      {q.isPending
        ? (
          <Card className="flex flex-col gap-3 p-4">
            <span role="status" className="sr-only">Cargando las entregas</span>
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="block h-10 rounded-[var(--radius-md)]" />)}
          </Card>
        )
        : !conTabla
          ? (lista.length === 0
            ? vacio
            : (
              <Card className="flex flex-col p-0">
                {alaVista.map((e, i) => {
                  const st = ESTADOS[e.status]
                  return (
                    <div key={e.submissionId}>
                      {i > 0 && <Divider />}
                      <div className="flex items-center gap-3 p-3">
                        <Avatar name={e.learner ?? '?'} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-body font-semibold">{e.learner}</span>
                            <Chip size="sm" color={st.color}>{st.label}</Chip>
                          </div>
                          <div className="truncate text-body text-text-muted">{e.title}</div>
                          <div className="flex flex-wrap gap-x-3 text-meta text-text-muted">
                            <span>{e.group}</span>
                            <span>{timeAgo(e.when)}</span>
                          </div>
                        </div>
                        {accion(e)}
                      </div>
                    </div>
                  )
                })}
              </Card>
            ))
          : (
            <Table label="Entregas" minWidth={860}>
              <TableHeader>
                <TableRow>
                  <TableHead>{ordenar('learner', 'Aprendiz')}</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>{ordenar('when', 'Cuándo')}</TableHead>
                  <TableHead align="right"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0
                  ? <TableEmpty colSpan={6}>{vacio}</TableEmpty>
                  : alaVista.map((e) => {
                    const st = ESTADOS[e.status]
                    return (
                      <TableRow key={e.submissionId} onClick={() => abrir(e)}>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <Avatar name={e.learner ?? '?'} size={26} />
                            <span className="font-semibold">{e.learner}</span>
                          </span>
                        </TableCell>
                        <TableCell><span className="block max-w-64 truncate">{e.title}</span></TableCell>
                        <TableCell className="text-text-muted">{e.group}</TableCell>
                        <TableCell><Chip size="sm" color={st.color}>{st.label}</Chip></TableCell>
                        <TableCell className="whitespace-nowrap text-text-muted">{timeAgo(e.when)}</TableCell>
                        <TableCell align="right" fit>{accion(e)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          )}

      {!q.isPending && lista.length > 0 && (
        <Pagination>
          <PaginationStatus from={desde + 1} to={desde + alaVista.length} total={lista.length} noun="entregas" />
          <PaginationPrev disabled={desde === 0} onClick={() => setPagina((p) => p - 1)} />
          <PaginationNext disabled={!hayMas} onClick={() => setPagina((p) => p + 1)} />
        </Pagination>
      )}
    </div>
  )
}
