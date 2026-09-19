// Corregir: una entrega a la vez, la rúbrica como botonera y la pila siempre a la vista.
//
// La pantalla contesta tres preguntas en este orden: qué falta corregir, qué hizo esta persona,
// y qué nivel le pongo. Lo que no contestaba era la cuarta, que es la primera que hace quien
// corrige: de quién falta. Por eso la pila trae al grupo entero y no solo a los que entregaron.
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, AlertBody, AlertTitle, Avatar, Breadcrumb, Button, Card, Chip, Dropdown, Icon,
  PageHeader, Progress, RadioGroup, Skeleton, type ChipColor,
} from '@milo/ui'
import { api, type Assignment, type Learner, type Submission, type Score } from '../lib/api'
import { InteractiveBlock } from '../blocks/Interactive'
import { IS_INTERACTIVE } from '../lib/composition'
import { cn } from '../lib/cn'
import { Empty } from '../blocks/Modal'
import { NoLlego } from '../blocks/Estado'

type Estado = 'submitted' | 'in_progress' | 'graded' | 'missing'
type Pila = { id: string; learner: string; entrega?: Submission; estado: Estado }

const ESTADO: Record<Estado, { label: string; color?: ChipColor; punto: string }> = {
  submitted: { label: 'Para mirar', color: 'warn', punto: 'bg-warn' },
  in_progress: { label: 'Sin terminar', punto: 'bg-border-strong' },
  graded: { label: 'Corregida', color: 'ok', punto: 'bg-ok' },
  missing: { label: 'Sin abrir', punto: 'bg-border' },
}

// El orden es el del trabajo: lo que espera, lo que quedó a medias (que no se corrige pero se
// mira), lo hecho, y al final quienes no la abrieron.
const ORDEN: Estado[] = ['submitted', 'in_progress', 'graded', 'missing']

/** Lo que se ve como respuesta vacía: la caja de escribir en blanco no dice que no entregó nada. */
const vacio = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

export function Review() {
  const { groupId, id, entregaId } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => api.get<{ assignment: Assignment; submissions: Submission[]; learners: Learner[] }>(`/api/assignments/${id}/submissions`),
  })
  // Qué entrega se está mirando lo dice la dirección y no un estado adentro de la pantalla:
  // así se puede abrir la de una persona directo, pegarla en un chat o guardarla.
  const irA = (sid?: string) => { if (sid) nav(`/groups/${groupId}/missions/${id}/submissions/${sid}`) }
  // El borrador es de una entrega: mientras estás en esa, manda lo que tocaste; en cualquier
  // otra manda lo que ya tiene puesto el servidor.
  const [draft, setDraft] = useState<{ id: string; scores: Record<string, number> } | null>(null)
  // Recibe la entrega, los niveles y a quién seguir: así vive arriba de los cortes por carga y
  // por error, que es donde tiene que estar un hook.
  const guardar = useMutation({
    mutationFn: (v: { e: Submission; scores: Record<string, number>; sigue: string }) =>
      api.put(`/api/submissions/${v.e.id}/scores`, { scores: Object.entries(v.scores).map(([cid, level]): Score => ({ id: cid, level })) }),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: ['submissions', id] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDraft(null)
      if (v.sigue) irA(v.sigue)
    },
  })

  if (q.isPending) return <Cargando />
  if (q.error || !q.data) return <NoLlego que="las entregas" error={q.error} onRetry={() => void q.refetch()} />

  const { assignment: a, submissions, learners } = q.data
  // La ruta vieja ("/review/:id") no sabe de qué grupo es la misión: eso lo dice la respuesta.
  if (!groupId) return <Navigate to={`/groups/${a.groupId}/missions/${id}`} replace />

  const entregadas = submissions.filter((e) => e.status !== 'in_progress')
  // La pila es el grupo entero, no solo quienes entregaron: "de quién falta" es la primera
  // pregunta de quien corrige.
  const pila: Pila[] = [
    ...submissions.map((e) => ({ id: e.id, learner: e.learner ?? '?', entrega: e, estado: e.status as Estado })),
    ...learners
      .filter((p) => !submissions.some((e) => e.learnerId === p.id))
      .map((p) => ({ id: p.id, learner: p.name, estado: 'missing' as const })),
  ].sort((x, y) => ORDEN.indexOf(x.estado) - ORDEN.indexOf(y.estado))
  const conEntrega = pila.filter((x) => x.entrega)
  const pedida = conEntrega.find((x) => x.id === entregaId)
  // Una entrega que no es de esta misión no se cambia por otra en silencio.
  const perdida = Boolean(entregaId) && !pedida
  const actual = pedida ?? conEntrega[0]
  const donde = actual ? conEntrega.indexOf(actual) : -1
  const corregidas = entregadas.filter((e) => e.status === 'graded').length
  const rubric = a.rubric ?? []
  const bloques = (a.document?.phases ?? []).flatMap((f) => f.blocks.filter((b) => IS_INTERACTIVE(b.type)).map((b) => ({ ...b, phase: f.name })))

  // La dirección siempre nombra lo que está en pantalla.
  if (actual && !entregaId) return <Navigate to={`/groups/${a.groupId}/missions/${id}/submissions/${actual.id}`} replace />

  const puestos = actual?.entrega
    ? (draft?.id === actual.id ? draft.scores : Object.fromEntries(actual.entrega.scores.map((p) => [p.id, p.level])))
    : {}
  const faltan = rubric.filter((c) => puestos[c.id] === undefined).map((c) => c.label)

  // A la siguiente que espera, que es para lo que se entró. Si no queda ninguna, se queda donde
  // está: mandar a la primera de la lista después de terminar es perder el lugar.
  const sigue = conEntrega.find((x) => x.estado === 'submitted' && x.id !== actual?.id)?.id ?? actual?.id ?? ''

  const paso = (cuanto: -1 | 1) => irA(conEntrega[donde + cuanto]?.id)

  return (
    <div className="page-stack">
      <Breadcrumb items={[
        { label: 'Grupos', onClick: () => nav('/groups') },
        { label: a.groupName ?? 'Grupo', onClick: () => nav(`/groups/${a.groupId}`) },
        { label: a.title },
      ]} />

      <PageHeader title={a.title} subtitle={a.description || undefined} />

      {/* Una sola cuenta, y es la del trabajo: cuánto de lo que llegó ya tiene devolución.
          "3 de 4 entregaron" lo contesta la pila, que además dice quiénes son. */}
      {entregadas.length > 0 && (
        <div className="max-w-xs">
          <Progress
            value={corregidas} max={entregadas.length} hint={`${corregidas}/${entregadas.length}`}
            tone={corregidas >= entregadas.length ? 'ok' : 'brand'}
            label={corregidas >= entregadas.length ? 'Corregidas, todas' : 'Corregidas'}
          />
        </div>
      )}

      {entregadas.length === 0
        ? <Empty icon="inbox" title="Nadie entregó todavía" text="Cuando alguien entregue, aparece acá." />
        : (
          <div className="grid w-full gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* La pila entera con ancho; en el celular, un menú y las flechas, que ocupan una
                fila en vez de una pantalla de nombres antes de llegar al trabajo. */}
            <div className="hidden self-start lg:block">
              <Card className="p-2">
                <ul className="flex flex-col gap-1">
                  {pila.map((x) => {
                    const e = ESTADO[x.estado]
                    const activo = actual?.id === x.id
                    return (
                      <li key={x.id}>
                        <button
                          type="button" disabled={!x.entrega} onClick={() => irA(x.id)}
                          aria-current={activo || undefined}
                          className={cn('flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left text-body',
                            x.entrega ? 'hover:bg-surface-muted' : 'cursor-default opacity-55',
                            activo && 'bg-brand-soft font-semibold text-brand-ink')}
                        >
                          <Avatar name={x.learner} size={26} />
                          <span className="min-w-0 flex-1 truncate">{x.learner}</span>
                          {x.estado === 'graded'
                            ? <Icon name="check" size={16} className="shrink-0 text-ok-ink" />
                            : <span className={cn('size-2 shrink-0 rounded-full', e.punto)} aria-label={e.label} />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3 lg:hidden">
                <Dropdown
                  align="start"
                  width={260}
                  label="Quién"
                  trigger={({ onClick, ref, 'aria-expanded': expanded }) => (
                    <Button ref={ref} size="sm" variant="muted" iconEnd="keyboard_arrow_down" onClick={onClick} aria-expanded={expanded}>
                      {actual?.learner ?? 'Quién'}
                    </Button>
                  )}
                  items={conEntrega.map((x) => ({
                    label: `${x.learner}, ${ESTADO[x.estado].label.toLowerCase()}`,
                    onSelect: () => irA(x.id),
                  }))}
                />
                <Pasos donde={donde} total={conEntrega.length} paso={paso} />
              </div>

              {perdida && (
                <Alert tone="warn">
                  <AlertTitle>No encontramos esa entrega en esta misión</AlertTitle>
                  <AlertBody>Revisá el enlace, o elegí a alguien de la lista.</AlertBody>
                </Alert>
              )}

              {!perdida && actual?.entrega && (
                <>
                  <section className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={actual.learner} size={40} />
                        <div>
                          <h2 className="text-title">{actual.learner}</h2>
                          <Chip size="sm" color={ESTADO[actual.estado].color}>{ESTADO[actual.estado].label}</Chip>
                        </div>
                      </div>
                      <div className="hidden lg:block"><Pasos donde={donde} total={conEntrega.length} paso={paso} /></div>
                    </div>

                    {bloques.map((b) => {
                      const hecho = actual.entrega?.steps?.[b.id]
                      const sinRespuesta = vacio(actual.entrega?.answers?.[b.id])
                      return (
                        <Card key={b.id} className="flex flex-col gap-2 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-meta text-text-muted">{b.phase}</span>
                            {/* Sin el tiempo: para poner un nivel no cambia nada. Los intentos sí,
                                y solo cuando hubo más de uno. */}
                            {hecho && hecho.ok !== null && (
                              <Chip size="sm" color={hecho.ok ? 'ok' : 'bad'}>
                                {hecho.ok ? 'Bien' : 'Se trabó'}
                                {hecho.attempts > 1 && <span className="ml-1.5 opacity-70">{hecho.attempts} intentos</span>}
                              </Chip>
                            )}
                          </div>
                          {b.type !== 'fill_in' && <p className="text-body font-semibold">{b.text}</p>}
                          {sinRespuesta
                            ? <p className="text-body text-text-muted">Dejó esto en blanco.</p>
                            : <InteractiveBlock b={b} value={actual.entrega?.answers?.[b.id]} onChange={() => {}} status="review" reveal />}
                        </Card>
                      )
                    })}
                  </section>

                  {actual.estado === 'in_progress' && (
                    <Alert tone="info">
                      <AlertTitle>Todavía no la entregó</AlertTitle>
                      <AlertBody>Se puede mirar lo que hay hasta acá, pero no corregirla: los niveles se ponen sobre algo terminado.</AlertBody>
                    </Alert>
                  )}

                  {rubric.length > 0 && actual.estado !== 'in_progress' && (
                    <Card className="flex flex-col gap-5 p-4">
                      <div>
                        <h3 className="text-title">Rúbrica</h3>
                        <p className="text-body text-text-muted">Un nivel por criterio. Se puede volver a cambiar después.</p>
                      </div>
                      {rubric.map((c) => (
                        <RadioGroup
                          key={c.id}
                          label={c.label}
                          value={puestos[c.id] === undefined ? '' : String(puestos[c.id])}
                          onChange={(v) => setDraft({ id: actual.id, scores: { ...puestos, [c.id]: Number(v) } })}
                          options={c.levels.map((n, i) => ({ value: String(i), label: n }))}
                        />
                      ))}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="brand"
                          onClick={() => actual.entrega && guardar.mutate({ e: actual.entrega, scores: puestos, sigue })}
                          disabled={guardar.isPending || faltan.length > 0}
                        >
                          {guardar.isPending ? 'Guardando' : actual.estado === 'graded' ? 'Guardar cambios' : 'Guardar y seguir'}
                        </Button>
                        {/* En vez de un botón apagado sin motivo: qué falta, por su nombre. */}
                        {faltan.length > 0 && (
                          <span className="text-body text-text-muted">
                            Falta el nivel de {faltan.length === 1 ? faltan[0] : `${faltan.slice(0, -1).join(', ')} y ${faltan[faltan.length - 1]}`}.
                          </span>
                        )}
                        {guardar.isError && <span className="text-body text-bad-ink">No se pudo guardar. Probá de nuevo.</span>}
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
function Pasos({ donde, total, paso }: { donde: number; total: number; paso: (cuanto: -1 | 1) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" icon="chevron_left" disabled={donde <= 0} onClick={() => paso(-1)}>Anterior</Button>
      <Button size="sm" variant="ghost" iconEnd="chevron_right" disabled={donde < 0 || donde >= total - 1} onClick={() => paso(1)}>Siguiente</Button>
    </div>
  )
}

/** Mientras llega: la forma de la pantalla, no una pantalla en blanco. */
function Cargando() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="block h-4 w-64" />
      <div className="flex flex-col gap-3">
        <Skeleton className="block h-7 w-72" />
        <Skeleton className="block h-4 w-full max-w-md" />
        <Skeleton className="block h-6 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="hidden h-64 lg:block" />
        <div className="flex flex-col gap-4">
          <Skeleton className="block h-10 w-56" />
          <Skeleton className="block h-32" />
          <Skeleton className="block h-32" />
        </div>
      </div>
    </div>
  )
}
