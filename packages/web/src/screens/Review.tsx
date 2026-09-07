// Corregir: una entrega a la vez, la rúbrica como botonera y la pila siempre a la vista.
//
// La pantalla contesta tres preguntas en este orden: qué falta corregir, qué hizo esta persona,
// y qué nivel le pongo. Lo que no contestaba era la cuarta, que es la primera que hace quien
// corrige: de quién falta. Por eso la pila trae al grupo entero y no solo a los que entregaron.
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Alert, Avatar, Breadcrumb, BreadcrumbItem, BreadcrumbPage, Button, Card, Chip, cn, Eyebrow, Field,
  Heading, Icon, NativeSelect, Progress, RadioCard, RadioGroup, Skeleton, Text,
} from '@melu/ui'
import { api, type Assignment, type Learner, type Submission, type Score } from '../lib/api'
import { InteractiveBlock } from '../blocks/Interactive'
import { IS_INTERACTIVE } from '../lib/composition'
import { Empty } from '../blocks/Modal'

type Pila = { id: string; learner: string; entrega?: Submission; estado: 'submitted' | 'graded' | 'missing' }

const ESTADO = {
  submitted: { label: 'Para mirar', color: 'warning' },
  graded: { label: 'Corregida', color: 'success' },
  missing: { label: 'Sin entregar', color: 'default' },
} as const

/** Lo que se ve como respuesta vacía: la caja de escribir en blanco no dice que no entregó nada. */
const vacio = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

export function Review() {
  const { groupId, id } = useParams()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => api.get<{ assignment: Assignment; submissions: Submission[]; learners: Learner[] }>(`/api/assignments/${id}/submissions`),
  })
  const [sel, setSel] = useState<string | null>(null)
  // El borrador es de una entrega: mientras estás en esa, manda lo que tocaste; en cualquier
  // otra manda lo que ya tiene puesto el servidor. Antes el estado era uno solo para todas, así
  // que abrir una ya corregida mostraba la rúbrica en blanco y pedía elegir todo de nuevo.
  const [draft, setDraft] = useState<{ id: string; scores: Record<string, number> } | null>(null)
  // Recibe la entrega, los niveles y a quién seguir: así vive arriba de los cortes por carga y
  // por error, que es donde tiene que estar un hook, y no depende de lo que se calcula abajo.
  const guardar = useMutation({
    mutationFn: (v: { e: Submission; scores: Record<string, number>; sigue: string }) =>
      api.put(`/api/submissions/${v.e.id}/scores`, { scores: Object.entries(v.scores).map(([cid, level]): Score => ({ id: cid, level })) }),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: ['submissions', id] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDraft(null)
      setSel(v.sigue)
    },
  })

  if (q.isPending) return <Cargando />
  if (q.error || !q.data) {
    return (
      <Alert variant="danger" title="No pudimos traer las entregas" actions={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Probar de nuevo</Button>}>
        Puede ser la conexión. Los datos están, no se perdió nada.
      </Alert>
    )
  }

  const { assignment: a, submissions, learners } = q.data
  // La ruta vieja ("/review/:id") no sabe de qué grupo es la misión: eso lo dice la respuesta,
  // así que en cuanto llega, la barra de direcciones queda en la dirección de verdad.
  if (!groupId) return <Navigate to={`/groups/${a.groupId}/missions/${id}`} replace />

  const entregadas = submissions.filter((e) => e.status !== 'in_progress')
  // El orden es el del trabajo: primero lo que espera, después lo hecho, y al final quienes no
  // entregaron, que no son una tarea pero son la respuesta a "de quién falta".
  const pila: Pila[] = [
    ...entregadas.filter((e) => e.status === 'submitted').map((e) => ({ id: e.id, learner: e.learner ?? '?', entrega: e, estado: 'submitted' as const })),
    ...entregadas.filter((e) => e.status === 'graded').map((e) => ({ id: e.id, learner: e.learner ?? '?', entrega: e, estado: 'graded' as const })),
    ...learners
      .filter((p) => !entregadas.some((e) => e.learnerId === p.id))
      .map((p) => ({ id: p.id, learner: p.name, estado: 'missing' as const })),
  ]
  const conEntrega = pila.filter((x) => x.entrega)
  const actual = conEntrega.find((x) => x.id === sel) ?? conEntrega[0]
  const donde = actual ? conEntrega.indexOf(actual) : -1
  const corregidas = entregadas.filter((e) => e.status === 'graded').length
  const rubric = a.rubric ?? []
  const bloques = (a.document?.phases ?? []).flatMap((f) => f.blocks.filter((b) => IS_INTERACTIVE(b.type)).map((b) => ({ ...b, phase: f.name })))

  const puestos = actual?.entrega
    ? (draft?.id === actual.id ? draft.scores : Object.fromEntries(actual.entrega.scores.map((p) => [p.id, p.level])))
    : {}
  const faltan = rubric.filter((c) => puestos[c.id] === undefined).map((c) => c.label)

  // A la siguiente que espera, que es para lo que se entró. Si no queda ninguna, se queda donde
  // está: mandar a la primera de la lista después de terminar es perder el lugar.
  const sigue = conEntrega.find((x) => x.estado === 'submitted' && x.id !== actual?.id)?.id ?? actual?.id ?? ''

  const irA = (paso: -1 | 1) => setSel(conEntrega[donde + paso]?.id ?? null)

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbItem asChild><Link to="/groups">Grupos</Link></BreadcrumbItem>
        <BreadcrumbItem asChild><Link to={`/groups/${a.groupId}`}>{a.groupName}</Link></BreadcrumbItem>
        <BreadcrumbPage>{a.title}</BreadcrumbPage>
      </Breadcrumb>

      <header className="flex flex-col gap-3 border-b border-line pb-4">
        <div className="max-w-2xl">
          <Eyebrow>Corregir</Eyebrow>
          <Heading level={1} size="xl" className="mt-1">{a.title}</Heading>
          {a.description && <Text variant="muted" className="mt-1">{a.description}</Text>}
        </div>
        {/* Una sola cuenta, y es la del trabajo: cuánto de lo que llegó ya tiene devolución.
            "3 de 4 entregaron" lo contesta la pila, que además dice quiénes son. */}
        {entregadas.length > 0 && (
          <Progress className="max-w-xs" value={corregidas} max={entregadas.length} showValue
            label={corregidas >= entregadas.length ? 'Corregidas, todas' : 'Corregidas'} />
        )}
      </header>

      {entregadas.length === 0
        ? <Empty title="Nadie entregó todavía" text="Cuando alguien entregue, aparece acá." />
        : (
          <div className="grid w-full gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* La pila entera con ancho; en el celular, un selector y las flechas, que ocupan una
                fila en vez de una pantalla de nombres antes de llegar al trabajo. */}
            {/* El `hidden lg:block` va en el envoltorio y no en la tarjeta: la tarjeta le presta
                los estilos al `<ul>`, y `flex` del `<ul>` le ganaba a `hidden` al fusionarse. La
                pila aparecía en el celular igual, abajo del selector. */}
            <div className="hidden self-start lg:block">
            <Card asChild padding="none">
              <ul className="flex flex-col gap-1 p-2">
                {pila.map((x) => {
                  const e = ESTADO[x.estado]
                  const activo = actual?.id === x.id
                  return (
                    <li key={x.id}>
                      <button
                        type="button" disabled={!x.entrega} onClick={() => setSel(x.id)}
                        aria-current={activo || undefined}
                        className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm',
                          x.entrega ? 'hover:bg-hover' : 'cursor-default opacity-55',
                          activo && 'bg-teal font-medium text-accent hover:bg-teal')}
                      >
                        <Avatar aria-hidden="true" name={x.learner} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{x.learner}</span>
                        {x.estado === 'graded'
                          ? <Icon icon={Check} size="sm" className="shrink-0 text-success" label="Corregida" />
                          : <span className={cn('size-2 shrink-0 rounded-full', x.estado === 'submitted' ? 'bg-warning' : 'bg-line-strong')} aria-label={e.label} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end gap-3 lg:hidden">
                <Field label="Quién" className="min-w-48 flex-1">
                  <NativeSelect value={actual?.id ?? ''} onChange={(ev) => setSel(ev.target.value)}>
                    {conEntrega.map((x) => <option key={x.id} value={x.id}>{x.learner}, {ESTADO[x.estado].label.toLowerCase()}</option>)}
                  </NativeSelect>
                </Field>
                <Pasos donde={donde} total={conEntrega.length} irA={irA} />
              </div>

              {actual?.entrega && (
                <>
                  <section className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar aria-hidden="true" name={actual.learner} />
                        <div>
                          <Heading level={2} size="lg">{actual.learner}</Heading>
                          <Chip size="sm" color={ESTADO[actual.estado].color}>{ESTADO[actual.estado].label}</Chip>
                        </div>
                      </div>
                      <div className="hidden lg:block"><Pasos donde={donde} total={conEntrega.length} irA={irA} /></div>
                    </div>

                    {bloques.map((b) => {
                      const paso = actual.entrega?.steps?.[b.id]
                      const sinRespuesta = vacio(actual.entrega?.answers?.[b.id])
                      return (
                        <Card key={b.id} padding="md" className="gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Eyebrow className="text-brand-text">{b.phase}</Eyebrow>
                            {/* Sin el tiempo: para poner un nivel no cambia nada, y al lado de
                                "se trabó" pedía compararlo con algo que no está. Los intentos sí,
                                y solo cuando hubo más de uno. */}
                            {paso && paso.ok !== null && (
                              <Chip size="sm" color={paso.ok ? 'success' : 'danger'}>
                                {paso.ok ? 'Bien' : 'Se trabó'}
                                {paso.attempts > 1 && <span className="ml-1.5 opacity-70">{paso.attempts} intentos</span>}
                              </Chip>
                            )}
                          </div>
                          {b.type !== 'fill_in' && <p className="font-medium">{b.text}</p>}
                          {sinRespuesta
                            ? <Text size="sm" variant="muted">Dejó esto en blanco.</Text>
                            : <InteractiveBlock b={b} value={actual.entrega?.answers?.[b.id]} onChange={() => {}} status="review" reveal />}
                        </Card>
                      )
                    })}
                  </section>

                  {rubric.length > 0 && (
                    <Card padding="md" className="gap-5">
                      <div>
                        <Heading level={3} size="sm">Rúbrica</Heading>
                        <Text size="sm" variant="muted">Un nivel por criterio. Se puede volver a cambiar después.</Text>
                      </div>
                      {rubric.map((c) => (
                        <Field key={c.id} asGroup label={c.label}>
                          {/* Las columnas salen de cuántos niveles hay y no de un número escrito
                              a mano: la rúbrica de una actividad puede tener dos o cuatro. */}
                          <RadioGroup
                            className="grid gap-2 sm:auto-cols-fr sm:grid-flow-col"
                            value={puestos[c.id] === undefined ? '' : String(puestos[c.id])}
                            onValueChange={(v) => setDraft({ id: actual.id, scores: { ...puestos, [c.id]: Number(v) } })}
                          >
                            {c.levels.map((n, i) => <RadioCard key={i} value={String(i)} className="p-3">{n}</RadioCard>)}
                          </RadioGroup>
                        </Field>
                      ))}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={() => actual.entrega && guardar.mutate({ e: actual.entrega, scores: puestos, sigue })}
                          loading={guardar.isPending} disabled={faltan.length > 0}
                        >
                          {actual.estado === 'graded' ? 'Guardar cambios' : 'Guardar y seguir'}
                        </Button>
                        {/* En vez de un botón apagado sin motivo: qué falta, por su nombre. */}
                        {faltan.length > 0 && (
                          <Text size="sm" variant="muted">
                            Falta el nivel de {faltan.length === 1 ? faltan[0] : `${faltan.slice(0, -1).join(', ')} y ${faltan[faltan.length - 1]}`}.
                          </Text>
                        )}
                        {guardar.isError && <Text size="sm" variant="danger">No se pudo guardar. Probá de nuevo.</Text>}
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </div>
  )
}

/** Anterior y siguiente dentro de la pila. Se apagan en las puntas y no se van, como en la tabla. */
function Pasos({ donde, total, irA }: { donde: number; total: number; irA: (paso: -1 | 1) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" disabled={donde <= 0} onClick={() => irA(-1)} startIcon={<Icon icon={ChevronLeft} size="sm" />}>Anterior</Button>
      <Button size="sm" variant="ghost" disabled={donde < 0 || donde >= total - 1} onClick={() => irA(1)} endIcon={<Icon icon={ChevronRight} size="sm" />}>Siguiente</Button>
    </div>
  )
}

/** Mientras llega: la forma de la pantalla, no una pantalla en blanco. */
function Cargando() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-64" />
      <div className="flex flex-col gap-3 border-b border-line pb-4">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="hidden h-64 lg:block" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
