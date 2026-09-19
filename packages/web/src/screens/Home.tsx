// La mesa de trabajo: qué falta corregir y qué falta que llegue.
//
// Lo que hay que leer despacio (quién se traba, qué les cuesta, cómo aprenden) se mudó a "Cómo
// vienen". Acá quedó solo lo que se mira varias veces por día, y los números de arriba son cuentas
// de cosas que pasaron y no promedios: "5 sin corregir" se entiende sin referencia, "34.6 min" no.
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar, BarChart, Button, Card, Divider, Folder, Icon, Link, List, ListItem, PageHeader,
  Progress, SectionLabel, Steps, count, markColors, timeAgo, type BarDatum,
} from '@milo/ui'
import { Stat } from '../blocks/Product'
import { api, type Dashboard, type Group } from '../lib/api'
import { useSpace, useSpaceId } from '../lib/space'
import { labelOf, EXPERIENCES } from '../lib/composition'
import { Cargando, NoLlego } from '../blocks/Estado'

/** El color de una carpeta sale de su nombre: el mismo grupo se ve siempre igual. */
const SPACE_COLORS = ['var(--space-green)', 'var(--space-blue)', 'var(--space-purple)', 'var(--space-orange)', 'var(--space-pink)']
function colorOf(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SPACE_COLORS[h % SPACE_COLORS.length]
}

const PASOS: [string, string, string, string][] = [
  ['group', 'Creá un grupo', 'Un aula, un taller, tres alumnos: gente que aprende junta.', '/groups'],
  ['invite', 'Sumá a los chicos', 'Escribí sus emails. Entran con Google y el grupo ya los espera.', '/groups'],
  ['activity', 'Armá una actividad', 'Empezá desde una receta y editala como un documento.', '/activities/new'],
  ['assign', 'Asignala al grupo', 'Los chicos la ven en "Hoy" y la hacen a su ritmo.', '/activities'],
  ['grade', 'Mirá la primera entrega', 'La rúbrica es una botonera: dos minutos por entrega.', '/groups'],
]

export function Home() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const { space } = useSpace()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const groups = useQuery({ queryKey: ['groups', spaceId], queryFn: () => api.get<Group[]>(`/api/groups?space=${spaceId}`) })
  const p = q.data
  if (q.isPending) return <Cargando bloques={3} />
  if (!p) return <NoLlego que="tu panel" error={q.error} onRetry={() => void q.refetch()} />

  // La lista la arma la api: son las que esperan devolución y nada más. Filtrarla acá sobre una
  // ventana mezclada dejaba la tarjeta vacía justo después de corregir varias seguidas.
  const esperando = p.awaitingReview ?? []
  // La cuenta de entregas y la de asignadas salen de dos lados distintos (filas de entregas y
  // miembros del grupo), así que se recorta: sacar a alguien de un grupo después de que entregó
  // daría "13/12".
  const llegaron = Math.min(p.toReview + p.graded, p.assigned)
  const hechos = PASOS.filter(([k]) => p.checklist[k]).length
  const empezando = hechos < PASOS.length

  // El gráfico es lo que ya midió la api: cuántas entregas trajo cada tipo de experiencia. La
  // barra gris es la más alta de todas, que es la escala, y no un total inventado.
  const top = Math.max(1, ...p.byKind.map((k) => k.submissions))
  const barras: BarDatum[] = p.byKind.slice(0, 6).map((k) => ({
    label: labelOf(EXPERIENCES, k.experience) ?? k.experience,
    value: k.submissions,
    total: top,
    detail: k.accuracy >= 0 ? `${Math.round(k.accuracy * 100)}% de aciertos` : undefined,
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tu semana"
        subtitle={space ? `Lo que pasa en ${space.name}` : undefined}
        actions={<Button size="sm" variant="brand" icon="add" onClick={() => nav('/activities/new')}>Nueva actividad</Button>}
      />

      {empezando && (
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <span className="text-meta text-text-muted">Primeros pasos, {hechos} de {PASOS.length}</span>
            <h2 className="text-title">Así funciona melu, en cinco pasos</h2>
          </div>
          <Steps
            label="Primeros pasos"
            current={hechos}
            onSelect={(i) => nav(PASOS[i][3])}
            steps={PASOS.map(([, label, hint]) => ({ label, hint }))}
          />
        </Card>
      )}

      {/* Lo corregido se fue de acá: era lo único de estos números que no pedía nada. Un panel
          donde todo lo que se ve espera algo se puede leer de un vistazo. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Para mirar" value={count(p.toReview)} icon="inbox" hint="esperando tu devolución" />
        <Stat label="Sin terminar" value={count(p.unfinished)} icon="schedule" hint="las abrieron y no entregaron" tone="down" />
        <Stat label="Corregidas" value={count(p.graded)} icon="check_circle" hint="en este espacio" />
        <Stat
          label="Aprendices" value={count(p.learners)} icon="group"
          hint={`${p.groups} ${p.groups === 1 ? 'grupo' : 'grupos'} en ${p.spaces} ${p.spaces === 1 ? 'espacio' : 'espacios'}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          {barras.length > 0 && (
            <Card className="flex flex-col gap-4 p-5">
              <div>
                <h2 className="text-title">Entregas por tipo de actividad</h2>
                <p className="text-body text-text-muted">El azul es lo que llegó; el gris, la más alta de todas</p>
              </div>
              <BarChart title="Entregas por tipo de actividad" data={barras} height={180} />
            </Card>
          )}

          <section>
            <div className="flex items-center justify-between">
              <SectionLabel count={groups.data?.length}>Tus grupos</SectionLabel>
              <Link href="/groups" onClick={(e) => { e.preventDefault(); nav('/groups') }}>Ver todos</Link>
            </div>
            {groups.data && groups.data.length > 0
              ? (
                <div className="flex flex-wrap gap-5">
                  {groups.data.slice(0, 6).map((g) => (
                    <Folder
                      key={g.id}
                      size={104}
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

        {/* La tarjeta está siempre: con la barra y el "Ver todas" adentro, esconderla cuando no
            queda nada para corregir se llevaba también la única forma de ir a las entregas. */}
        <Card surface="muted" className="flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-title">Lo que espera tu devolución</h2>
            <Link href="/submissions" onClick={(e) => { e.preventDefault(); nav('/submissions') }}>Ver todas</Link>
          </div>

          {p.assigned > 0 && (
            <Progress
              value={llegaron} max={p.assigned} hint={`${llegaron}/${p.assigned}`}
              label={llegaron >= p.assigned ? 'Entregadas, todas' : 'Entregadas'}
            />
          )}

          <Divider />

          {/* Sin chip de estado: si todas las filas esperan lo mismo, el chip lo repite en cada
              una y compite con el botón, que es lo único que hay que tocar. */}
          {esperando.length === 0
            ? <p className="text-body text-text-muted">Nada espera tu devolución.</p>
            : (
              <ul className="flex flex-col gap-3">
                {esperando.map((e) => (
                  <li key={e.submissionId} className="flex items-center gap-3">
                    <Avatar name={e.learner ?? '?'} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-body font-semibold">{e.learner}</div>
                      {/* Separado por aire y un icono, no por puntuación: el nombre de un grupo
                          ya trae un "·" adentro ("4° A · Matemática"). */}
                      <div className="flex flex-wrap items-center gap-x-3 text-meta text-text-muted">
                        <span className="truncate">{e.title}</span>
                        <span className="inline-flex items-center gap-1"><Icon name="schedule" size={14} className="icon-muted" />{timeAgo(e.when)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="muted" onClick={() => nav(`/groups/${e.groupId}/missions/${e.assignmentId}/submissions/${e.submissionId}`)}>
                      Corregir
                    </Button>
                  </li>
                ))}
              </ul>
            )}

          {p.signals.length > 0 && (
            <>
              <Divider />
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-title">Para mirar de cerca</h2>
                <Link href="/progress" onClick={(e) => { e.preventDefault(); nav('/progress') }}>Cómo vienen</Link>
              </div>
              <List>
                {p.signals.slice(0, 3).map((s, i) => (
                  <ListItem
                    key={`${s.learnerId}-${s.kind}`}
                    icon={s.kind === 'shines' ? 'star' : s.kind === 'dropout' ? 'schedule' : 'error'}
                    color={markColors[i % markColors.length]}
                    title={s.learner}
                    hint={s.detail}
                    onClick={() => nav('/progress')}
                  />
                ))}
              </List>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
