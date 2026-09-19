// La mesa de trabajo: qué falta corregir y qué falta que llegue.
//
// El mueble es el del dashboard del sistema: portada grande, la fila de métricas, el gráfico y
// las carpetas a la izquierda, y a la derecha una sola tarjeta con lo que hay que hacer, cómo va
// cada grupo y quiénes son. Lo que hay que leer despacio (quién se traba, qué les cuesta) vive
// en "Cómo vienen": acá queda lo que se mira varias veces por día.
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AvatarGroup, BarChart, Button, Card, Chip, Folder, Icon, Link, List, ListItem, Progress,
  count, share, type BarDatum, type LabelColor, type MarkColor,
} from '@milo/ui'
import { Stat } from '../blocks/Product'
import { coverOf } from '../blocks/Cover'
import { api, type Dashboard, type Group, type SubmissionSummary } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { Cargando, NoLlego } from '../blocks/Estado'

/** El color de una carpeta sale de su nombre: el mismo grupo se ve siempre igual. */
const SPACE_COLORS = ['var(--space-green)', 'var(--space-blue)', 'var(--space-purple)', 'var(--space-orange)', 'var(--space-pink)']
function hash(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}
function colorOf(name: string) {
  return SPACE_COLORS[hash(name) % SPACE_COLORS.length]
}

/** La marca de una fila es la de la portada de su actividad: el mismo objeto, la misma cara.
 *  Las marcas son cinco y las etiquetas seis, así que la que sobra cae en la más cercana. */
function marcaDe(color: LabelColor): MarkColor {
  return color === 'teal' ? 'green' : color
}

const PASOS: [string, string, string][] = [
  ['group', 'Creá un grupo', '/groups'],
  ['invite', 'Sumá a los chicos', '/groups'],
  ['activity', 'Armá una actividad', '/activities/new'],
  ['assign', 'Asignala al grupo', '/activities'],
  ['grade', 'Mirá la primera entrega', '/groups'],
]

/** El día de una entrega, cortado a la fecha: es la clave con la que se agrupan las barras. */
const enDia = (iso: string) => iso.slice(0, 10)
const rotuloDia = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-AR', { weekday: 'short' })} ${d.getDate()}`
}

export function Home() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const groups = useQuery({ queryKey: ['groups', spaceId], queryFn: () => api.get<Group[]>(`/api/groups?space=${spaceId}`) })
  // La misma clave que Entregas: si ya estuviste ahí, entrar acá no pide nada de nuevo.
  const entregas = useQuery({ queryKey: ['submissions', spaceId], queryFn: () => api.get<SubmissionSummary[]>(`/api/submissions?space=${spaceId}`) })
  const p = q.data
  if (q.isPending) return <Cargando bloques={3} />
  if (!p) return <NoLlego que="tu panel" error={q.error} onRetry={() => void q.refetch()} />

  // La lista la arma la api, y son cuatro como mucho: el corte vive allá, para no mandar filas
  // que nadie va a mostrar.
  const esperando = p.awaitingReview ?? []
  const hechos = PASOS.filter(([k]) => p.checklist[k]).length
  const empezando = hechos < PASOS.length
  const llegadas = entregas.data ?? []

  // El gráfico del sistema con los datos de verdad: por día, lo corregido sobre lo que entró.
  // Los últimos cinco días con entregas, que son los que tienen algo que contar.
  const porDia = new Map<string, { value: number; total: number; when: string }>()
  for (const e of llegadas) {
    const k = enDia(e.when)
    const d = porDia.get(k) ?? { value: 0, total: 0, when: e.when }
    d.total += 1
    if (e.status === 'graded') d.value += 1
    porDia.set(k, d)
  }
  const barras: BarDatum[] = [...porDia.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-5)
    .map(([, d]) => ({
      label: rotuloDia(d.when),
      value: d.value,
      total: d.total,
      detail: `${d.value} de ${d.total} corregidas`,
    }))
  const entregadas = llegadas.length
  const corregidas = llegadas.filter((e) => e.status === 'graded').length

  // Cómo va cada grupo: lo corregido sobre lo que entregó ese grupo. Es el mismo par que cuenta
  // el gráfico, repartido por aula.
  const avance = (groups.data ?? []).map((g) => {
    const suyas = llegadas.filter((e) => e.groupId === g.id)
    return { id: g.id, name: g.name, listas: suyas.filter((e) => e.status === 'graded').length, total: suyas.length }
  })
  const caras = (groups.data ?? []).flatMap((g) => (g.names ?? []).map((name) => ({ name })))
  const dondeFalta = [...new Set(esperando.map((e) => e.group))]

  return (
    <div className="page-stack">
      {/* La portada del panel: el título grande es el del dashboard del sistema y no el de una
          pantalla más. Es la primera que se abre a la mañana. */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-display font-bold">Tu semana</h1>
          <p className="text-reading text-text-muted">
            {dondeFalta.length === 0
              ? 'Nada espera tu devolución. Lo que entre, aparece acá.'
              : `Lo que falta mirar está en ${dondeFalta.join(' y ')}.`}
          </p>
        </div>
        <Button size="sm" variant="brand" icon="add" onClick={() => nav('/activities/new')}>Nueva actividad</Button>
      </header>

      {empezando && (
        <Card className="flex flex-col gap-3 p-5">
          <div>
            <span className="text-meta text-text-muted">Primeros pasos, {hechos} de {PASOS.length}</span>
            <h2 className="text-reading font-semibold">Así funciona melu, en cinco pasos</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PASOS.map(([k, label, to], i) => (
              <Chip
                key={k}
                icon={p.checklist[k] ? 'check' : undefined}
                color={p.checklist[k] ? 'green' : undefined}
                onClick={() => nav(to)}
              >
                {i + 1}. {label}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entregas" value={count(entregadas)} icon="inbox" />
        <Stat label="Corregidas" value={count(corregidas)} icon="check_circle" />
        <Stat label="Sin mirar" value={count(p.toReview)} icon="schedule" tone="down" />
        <Stat label="Aprendices" value={count(p.learners)} icon="group" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-reading font-semibold">Corregidas sobre entregadas</h2>
                <p className="text-body text-text-muted">El azul es lo corregido; el gris, lo que entró</p>
              </div>
              {entregadas > 0 && (
                <Chip size="sm" color={corregidas === entregadas ? 'ok' : undefined} icon="trending_up">
                  {share(corregidas, entregadas).percent}
                </Chip>
              )}
            </div>
            {barras.length > 0
              ? <BarChart title="Corregidas sobre entregadas" data={barras} height={180} />
              : <p className="text-body text-text-muted">Todavía no entró ninguna entrega.</p>}
          </Card>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-reading font-semibold">Tus grupos</h2>
              <Link href="/groups" onClick={(e) => { e.preventDefault(); nav('/groups') }}>Ver todos</Link>
            </div>
            {groups.data && groups.data.length > 0
              ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {groups.data.slice(0, 8).map((g) => (
                    <Folder
                      key={g.id}
                      size={112}
                      label={g.name}
                      meta={`${g.learners} ${g.learners === 1 ? 'aprendiz' : 'aprendices'}`}
                      color={colorOf(g.name)}
                      avatars={(g.names ?? []).slice(0, 3).map((name) => ({ name }))}
                      onClick={() => nav(`/groups/${g.id}`)}
                    />
                  ))}
                </div>
              )
              : <p className="text-body text-text-muted">Todavía no hay grupos. El primero se crea en Grupos.</p>}
          </section>
        </div>

        {/* Una sola tarjeta a la derecha: lo que hay que hacer, cómo va cada grupo y quiénes son.
            Está siempre, aunque no quede nada para corregir: con el "Ver todas" adentro,
            esconderla se llevaba la única puerta a las entregas. */}
        <Card surface="muted" className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-reading font-semibold">Para corregir</h2>
            <Link href="/submissions" onClick={(e) => { e.preventDefault(); nav('/submissions') }}>Ver todas</Link>
          </div>

          {esperando.length === 0
            ? <p className="text-body text-text-muted">Nada espera tu devolución.</p>
            : (
              <List>
                {esperando.map((e) => {
                  const [color, icon] = coverOf(e.title)
                  return (
                    <ListItem
                      key={e.submissionId}
                      icon={icon}
                      color={marcaDe(color)}
                      title={e.learner ?? 'Alguien'}
                      hint={e.title}
                      onClick={() => nav(`/groups/${e.groupId}/missions/${e.assignmentId}/submissions/${e.submissionId}`)}
                      trailing={<Icon name="chevron_right" size={18} className="icon-muted" />}
                    />
                  )
                })}
              </List>
            )}

          {avance.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-reading font-semibold">Cómo va cada grupo</h2>
              {avance.map((g) => (
                <Progress
                  key={g.id}
                  label={g.name}
                  value={g.listas}
                  max={g.total || 1}
                  tone={g.total > 0 && g.listas === g.total ? 'ok' : 'brand'}
                  hint={g.total === 0 ? 'sin entregas' : g.listas === g.total ? 'listo' : `${g.listas}/${g.total}`}
                />
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
            {caras.length > 0 && <AvatarGroup size={24} people={caras.slice(0, 4)} />}
            <span className="text-body text-text-muted">
              {p.learners} {p.learners === 1 ? 'aprendiz' : 'aprendices'} en total
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
