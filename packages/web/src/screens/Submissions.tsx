import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar, Button, Card, Chip, FilterBar, FilterSearch, FilterSet, Heading, Icon, Text,
  DataList, DataListActions, DataListHead, DataListItem, DataListMedia, DataListMeta, DataListText, DataListTitle,
  Pagination, PaginationNext, PaginationPrev, PaginationStatus,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
  BREAKPOINTS, facets, useDevice, useMediaQuery,
} from '@melu/ui'
import { CircleDot, School, User } from 'lucide-react'
import { Empty } from '../blocks/Modal'
import { api, type SubmissionSummary } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { ago } from '../lib/time'

const ESTADOS = {
  submitted: { label: 'Para mirar', color: 'warning' },
  graded: { label: 'Corregida', color: 'success' },
  in_progress: { label: 'Sin terminar', color: 'default' },
} as const

type Estado = keyof typeof ESTADOS
type Por = 'learner' | 'when' | 'minutes' | 'accuracy'

// El orden de entrada, y el que se recupera cuando no hay cabecera que explique otro.
const ULTIMO = { por: 'when' as Por, dir: 'desc' as const }

// Cuántas filas entran en un tramo. Es aproximadamente una pantalla.
const TRAMO = 15

export function Submissions() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  // La tabla es de la pantalla ancha y de ninguna otra. Con la barra lateral puesta, una tablet
  // deja menos de 500 px para las filas: ahí la tabla ya se arrastra de costado, y una tabla que
  // se arrastra de costado no la mira nadie. Abajo de `lg` las mismas filas se rinden como lista,
  // que se recorre para abajo como todo lo demás.
  const device = useDevice()
  const conTabla = device === 'desktop'
  // Las columnas de relleno entran recién en la pantalla ancha. Se pregunta acá y no con una
  // clase de Tailwind porque el orden depende de esto: una columna que no está no puede quedar
  // ordenando la tabla.
  const conRelleno = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`)
  const q = useQuery({ queryKey: ['submissions', spaceId], queryFn: () => api.get<SubmissionSummary[]>(`/api/submissions?space=${spaceId}`) })

  const [texto, setTexto] = useState('')
  // Un solo objeto: la clave que está es el filtro que está puesto en la barra, y su arreglo es
  // lo que tiene elegido. Que un filtro esté puesto y vacío es un estado válido, y es el que
  // queda cuando alguien lo agrega y todavía no eligió nada.
  const [filtros, setFiltros] = useState<Record<string, string[]>>({})
  const [orden, setOrden] = useState<{ por: Por; dir: 'asc' | 'desc' }>(ULTIMO)
  const [pagina, setPagina] = useState(0)

  // Cambiar de espacio no desmonta la pantalla, así que lo que había filtrado se quedaba puesto
  // sobre datos de otro lado: un grupo del espacio anterior dejando la tabla en cero. Se
  // reacomoda durante el render, que es como React pide hacer esto y no con un efecto.
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
  const disponibles = [
    {
      name: 'estado', label: 'Estado', icon: <Icon icon={CircleDot} size="sm" />,
      options: (Object.keys(ESTADOS) as Estado[]).map((k) => ({ value: k, label: ESTADOS[k].label, color: ESTADOS[k].color, count: porEstado[k] ?? 0 })),
    },
    {
      name: 'grupo', label: 'Grupo', icon: <Icon icon={School} size="sm" />,
      options: [...new Set(todas.map((e) => e.group))].sort(alfabetico).map((g) => ({ value: g, label: g, count: porGrupo[g] ?? 0 })),
    },
    {
      name: 'persona', label: 'Aprendiz', icon: <Icon icon={User} size="sm" />,
      options: [...new Set(todas.map((e) => e.learner).filter((n): n is string => !!n))].sort(alfabetico)
        .map((n) => ({ value: n, label: n, avatar: true, count: porPersona[n] ?? 0 })),
    },
    // Con una sola opción no vale la pena ofrecerlo, salvo que ya esté puesto: un filtro que
    // filtra y no está en la barra es una tabla vacía sin nada que explique por qué.
  ].filter((f) => f.options.length > 1 || filtros[f.name] !== undefined)

  // El orden se lee de una cabecera: donde esa cabecera no está, no hay orden raro que explicar
  // y la lista va como promete el título, con lo último arriba. Se guarda igual, así que volver
  // a agrandar la ventana lo devuelve.
  const escondida = !conRelleno && (orden.por === 'minutes' || orden.por === 'accuracy')
  const orden_ = !conTabla || escondida ? ULTIMO : orden

  const valor = (e: SubmissionSummary) =>
    orden_.por === 'learner' ? (e.learner ?? '') : orden_.por === 'when' ? e.when : orden_.por === 'minutes' ? e.minutes : e.accuracy
  const lista = todas.filter((e) => pasa(e)).sort((a, b) => {
    const x = valor(a)
    const y = valor(b)
    return (orden_.dir === 'asc' ? 1 : -1) * (typeof x === 'string' ? x.localeCompare(y as string, 'es') : x - (y as number))
  })

  // `trim`, como filtra `pasa`: un espacio solo no filtra nada y no tiene que decir que sí.
  // Lo que se ve es un tramo de lo que quedó filtrado. El día que el back entregue de a pedazos,
  // lo que cambia es de dónde salen las filas y no esta línea.
  //
  // La página se acomoda si el filtro dejó menos de las que hacían falta para llegar hasta acá:
  // sin esto, filtrar estando en la tres dejaba una tabla vacía y sin nada que tocar.
  const ultima = Math.max(0, Math.ceil(lista.length / TRAMO) - 1)
  if (pagina > ultima) setPagina(ultima)
  const desde = Math.min(pagina, ultima) * TRAMO
  const alaVista = lista.slice(desde, desde + TRAMO)
  const hayMas = desde + TRAMO < lista.length

  const filtrando = texto.trim() !== '' || Object.values(filtros).some((v) => v.length > 0)
  const limpiar = () => { setTexto(''); setFiltros({}) }

  // Desde `orden_` y no desde `orden`: si la columna que ordenaba se escondió, la cabecera que
  // se ve activa es otra, y el primer clic tiene que darla vuelta y no repetir lo que ya está.
  const ordenarPor = (por: Por) =>
    setOrden(orden_.por === por
      ? { por, dir: orden_.dir === 'asc' ? 'desc' : 'asc' }
      : { por, dir: por === 'learner' ? 'asc' : 'desc' })
  const sentido = (por: Por) => (orden_.por === por ? orden_.dir : false)

  const abrir = (e: SubmissionSummary) => nav(`/review/${e.assignmentId}`)
  const accion = (e: SubmissionSummary) => (
    <Button
      size="sm" variant={e.status === 'submitted' ? 'primary' : 'ghost'}
      onClick={(ev) => { ev.stopPropagation(); abrir(e) }}
    >
      {e.status === 'submitted' ? 'Corregir' : 'Ver'}
    </Button>
  )
  const vacio = (
    <Empty
      title="Nada acá"
      text={filtrando ? 'Con estos filtros no queda ninguna entrega.' : 'Todavía no llegó ninguna entrega.'}
      action={filtrando ? <Button variant="secondary" onClick={limpiar}>Limpiar los filtros</Button> : undefined}
    />
  )

  if (!q.data) return null
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="max-w-2xl border-b border-line pb-4">
        <Heading level={1} size="2xl">Entregas</Heading>
        <Text variant="muted">Todo lo que llegó, de todos tus grupos, con lo último arriba.</Text>
      </header>

      <FilterBar>
        <FilterSearch value={texto} onValueChange={setTexto} placeholder="Buscar por nombre o actividad" />
        <FilterSet filters={disponibles} value={filtros} onValueChange={setFiltros} onReset={limpiar} />
      </FilterBar>

      {/* `rounded-md` y no el `xl` del Card: una tabla es una grilla de líneas rectas y una
          esquina de 16 px se le nota de más. */}
      <Card className="overflow-hidden rounded-md">
        {!conTabla
          ? (lista.length === 0
            ? <div className="px-4 py-10">{vacio}</div>
            : (
              <>
                <DataList>
                  {alaVista.map((e) => {
                    const st = ESTADOS[e.status]
                    return (
                      <DataListItem key={e.submissionId} interactive onClick={() => abrir(e)}>
                        <DataListMedia><Avatar name={e.learner ?? '?'} /></DataListMedia>
                        <DataListHead>
                          <DataListTitle>{e.learner}</DataListTitle>
                          <Chip size="sm" color={st.color}>{st.label}</Chip>
                        </DataListHead>
                        <DataListText>{e.title}</DataListText>
                        <DataListMeta>
                          <span>{e.group}</span>
                          <span>{ago(e.when)}</span>
                          {e.minutes > 0 && <span>{e.minutes} min</span>}
                          {e.accuracy >= 0 && <span>{Math.round(e.accuracy * 100)}% aciertos</span>}
                        </DataListMeta>
                        <DataListActions>{accion(e)}</DataListActions>
                      </DataListItem>
                    )
                  })}
                </DataList>
              </>
            ))
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sort={sentido('learner')} onSort={() => ordenarPor('learner')}>Aprendiz</TableHead>
                  <TableHead>Actividad</TableHead>
                  {conRelleno && <TableHead>Grupo</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead sort={sentido('when')} onSort={() => ordenarPor('when')}>Cuándo</TableHead>
                  {conRelleno && <TableHead align="end" sort={sentido('minutes')} onSort={() => ordenarPor('minutes')}>Tiempo</TableHead>}
                  {conRelleno && <TableHead align="end" sort={sentido('accuracy')} onSort={() => ordenarPor('accuracy')}>Aciertos</TableHead>}
                  <TableHead align="end"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0
                  ? <TableEmpty colSpan={conRelleno ? 8 : 5}>{vacio}</TableEmpty>
                  : alaVista.map((e) => {
                    const st = ESTADOS[e.status]
                    return (
                      <TableRow key={e.submissionId} interactive onClick={() => abrir(e)}>
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <Avatar name={e.learner ?? '?'} size="sm" />
                            <span className="font-medium">{e.learner}</span>
                          </span>
                        </TableCell>
                        <TableCell><span className="block max-w-64 truncate">{e.title}</span></TableCell>
                        {conRelleno && <TableCell className="text-ink-muted">{e.group}</TableCell>}
                        <TableCell><Chip size="sm" color={st.color}>{st.label}</Chip></TableCell>
                        <TableCell className="whitespace-nowrap text-ink-muted">{ago(e.when)}</TableCell>
                        {conRelleno && <TableCell numeric>{e.minutes ? `${e.minutes} min` : '—'}</TableCell>}
                        {conRelleno && <TableCell numeric>{e.accuracy >= 0 ? `${Math.round(e.accuracy * 100)}%` : '—'}</TableCell>}
                        <TableCell align="end">{accion(e)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          )}

        {lista.length > 0 && (
          <Pagination>
            <PaginationStatus from={desde + 1} to={desde + alaVista.length} total={lista.length} noun="entregas" />
            <PaginationPrev disabled={desde === 0} onClick={() => setPagina((p) => p - 1)} />
            <PaginationNext disabled={!hayMas} onClick={() => setPagina((p) => p + 1)} />
          </Pagination>
        )}
      </Card>
    </div>
  )
}
