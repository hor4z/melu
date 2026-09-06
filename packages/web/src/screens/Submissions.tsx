import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar, Button, Card, Chip, Filter, FilterBar, FilterReset, FilterSearch, Heading, Text,
  DataList, DataListActions, DataListHead, DataListItem, DataListMedia, DataListMeta, DataListText, DataListTitle,
  Table, TableBody, TableCaption, TableCell, TableEmpty, TableHead, TableHeader, TableRow, facets, useDevice,
} from '@melu/ui'
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

// Las columnas que se esconden en la tabla angosta. El nombre, el estado y la acción no se van
// nunca: son las tres cosas por las que se entra acá.
const SOLO_ANCHO = 'hidden xl:table-cell'

export function Submissions() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  // La tabla es de la pantalla ancha y de ninguna otra. Con la barra lateral puesta, una tablet
  // deja menos de 500 px para las filas: ahí la tabla ya se arrastra de costado, y una tabla que
  // se arrastra de costado no la mira nadie. Abajo de `lg` las mismas filas se rinden como lista,
  // que se recorre para abajo como todo lo demás.
  const device = useDevice()
  const conTabla = device === 'desktop'
  const q = useQuery({ queryKey: ['submissions', spaceId], queryFn: () => api.get<SubmissionSummary[]>(`/api/submissions?space=${spaceId}`) })

  const [texto, setTexto] = useState('')
  const [estados, setEstados] = useState<string[]>([])
  const [grupos, setGrupos] = useState<string[]>([])
  const [personas, setPersonas] = useState<string[]>([])
  const [orden, setOrden] = useState<{ por: Por; dir: 'asc' | 'desc' }>({ por: 'when', dir: 'desc' })

  const todas = useMemo(() => q.data ?? [], [q.data])

  // `salvo` deja afuera un filtro para contar las opciones de ese mismo filtro. Así el número
  // que muestra cada opción es el que va a quedar si la tocás, y no el de la tabla entera.
  const pasa = (e: SubmissionSummary, salvo?: 'texto' | 'estado' | 'grupo' | 'persona') => {
    const t = texto.trim().toLowerCase()
    if (salvo !== 'texto' && t && !`${e.learner ?? ''} ${e.title} ${e.group}`.toLowerCase().includes(t)) return false
    if (salvo !== 'estado' && estados.length > 0 && !estados.includes(e.status)) return false
    if (salvo !== 'grupo' && grupos.length > 0 && !grupos.includes(e.group)) return false
    if (salvo !== 'persona' && personas.length > 0 && !personas.includes(e.learner ?? '')) return false
    return true
  }

  const porEstado = facets(todas.filter((e) => pasa(e, 'estado')), (e) => e.status)
  const porGrupo = facets(todas.filter((e) => pasa(e, 'grupo')), (e) => e.group)
  const porPersona = facets(todas.filter((e) => pasa(e, 'persona')), (e) => e.learner)

  const opcionesEstado = (Object.keys(ESTADOS) as Estado[]).map((k) => ({ value: k, label: ESTADOS[k].label, color: ESTADOS[k].color, count: porEstado[k] ?? 0 }))
  const alfabetico = (a: string, b: string) => a.localeCompare(b, 'es')
  const opcionesGrupo = [...new Set(todas.map((e) => e.group))].sort(alfabetico).map((g) => ({ value: g, label: g, count: porGrupo[g] ?? 0 }))
  const opcionesPersona = [...new Set(todas.map((e) => e.learner).filter((n): n is string => !!n))].sort(alfabetico)
    .map((n) => ({ value: n, label: n, avatar: true, count: porPersona[n] ?? 0 }))

  const valor = (e: SubmissionSummary) =>
    orden.por === 'learner' ? (e.learner ?? '') : orden.por === 'when' ? e.when : orden.por === 'minutes' ? e.minutes : e.accuracy
  const lista = todas.filter((e) => pasa(e)).sort((a, b) => {
    const x = valor(a)
    const y = valor(b)
    return (orden.dir === 'asc' ? 1 : -1) * (typeof x === 'string' ? x.localeCompare(y as string, 'es') : x - (y as number))
  })

  const filtrando = texto !== '' || estados.length > 0 || grupos.length > 0 || personas.length > 0
  const limpiar = () => { setTexto(''); setEstados([]); setGrupos([]); setPersonas([]) }

  const ordenarPor = (por: Por) =>
    setOrden((o) => (o.por === por ? { por, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { por, dir: por === 'learner' ? 'asc' : 'desc' }))
  const sentido = (por: Por) => (orden.por === por ? orden.dir : false)

  const abrir = (e: SubmissionSummary) => nav(`/review/${e.assignmentId}`)
  const accion = (e: SubmissionSummary) => (
    <Button
      size="sm" variant={e.status === 'submitted' ? 'primary' : 'ghost'}
      onClick={(ev) => { ev.stopPropagation(); abrir(e) }}
    >
      {e.status === 'submitted' ? 'Corregir' : 'Ver'}
    </Button>
  )
  const cuenta = filtrando ? `${lista.length} de ${todas.length} entregas` : `${todas.length} entregas`
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
        <Filter label="Estado" options={opcionesEstado} value={estados} onValueChange={setEstados} />
        {opcionesGrupo.length > 1 && <Filter label="Grupo" options={opcionesGrupo} value={grupos} onValueChange={setGrupos} />}
        {opcionesPersona.length > 1 && <Filter label="Aprendiz" options={opcionesPersona} value={personas} onValueChange={setPersonas} />}
        {filtrando && <FilterReset onClick={limpiar} />}
      </FilterBar>

      <Card className="overflow-hidden">
        {!conTabla
          ? (lista.length === 0
            ? <div className="px-4 py-10">{vacio}</div>
            : (
              <>
                <DataList>
                  {lista.map((e) => {
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
                <div className="border-t border-line px-4 py-3 text-sm text-ink-muted">{cuenta}</div>
              </>
            ))
          : (
            <Table>
              <TableCaption className="px-4 pb-4">{cuenta}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead sort={sentido('learner')} onSort={() => ordenarPor('learner')}>Aprendiz</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead className={SOLO_ANCHO}>Grupo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead sort={sentido('when')} onSort={() => ordenarPor('when')}>Cuándo</TableHead>
                  <TableHead className={SOLO_ANCHO} align="end" sort={sentido('minutes')} onSort={() => ordenarPor('minutes')}>Tiempo</TableHead>
                  <TableHead className={SOLO_ANCHO} align="end" sort={sentido('accuracy')} onSort={() => ordenarPor('accuracy')}>Aciertos</TableHead>
                  <TableHead align="end"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.length === 0
                  ? <TableEmpty colSpan={8}>{vacio}</TableEmpty>
                  : lista.map((e) => {
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
                        <TableCell className={`${SOLO_ANCHO} text-ink-muted`}>{e.group}</TableCell>
                        <TableCell><Chip size="sm" color={st.color}>{st.label}</Chip></TableCell>
                        <TableCell className="whitespace-nowrap text-ink-muted">{ago(e.when)}</TableCell>
                        <TableCell className={SOLO_ANCHO} numeric>{e.minutes ? `${e.minutes} min` : '—'}</TableCell>
                        <TableCell className={SOLO_ANCHO} numeric>{e.accuracy >= 0 ? `${Math.round(e.accuracy * 100)}%` : '—'}</TableCell>
                        <TableCell align="end">{accion(e)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  )
}
