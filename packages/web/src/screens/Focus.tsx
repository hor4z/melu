// "Cómo vienen": la pantalla a la que se entra a entender a la gente.
//
// Inicio responde "qué tengo que hacer ahora". Esto responde "quién necesita una mano", que se
// lee más despacio y no debería estar compitiendo con lo urgente. La regla de lo que entra acá:
// nada se muestra si no termina en algo que el docente pueda hacer. Por eso el orden es el de la
// urgencia: primero quien se traba.
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Layers, TrendingDown, Zap } from 'lucide-react'
import { Card, Chip, cn, Eyebrow, Heading, Icon, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow, Text } from '@melu/ui'
import { SignalAction } from '../blocks/SignalAction'
import { api, type Dashboard } from '../lib/api'
import { EXPERIENCES } from '../lib/composition'
import { useSpaceId } from '../lib/space'
import { Cargando, NoLlego } from '../blocks/Estado'

const KIND = {
  misses: { icon: AlertTriangle, ink: 'text-danger', label: 'Se traba' },
  dropout: { icon: Clock, ink: 'text-warning', label: 'Sin terminar' },
  slow: { icon: TrendingDown, ink: 'text-ink-muted', label: 'Le lleva más' },
  shines: { icon: Zap, ink: 'text-success', label: 'Vuela' },
} as const

export function Focus() {
  const spaceId = useSpaceId()
  // La misma clave que Inicio: entrar acá no dispara una request nueva, react-query ya la tiene.
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`) })
  const p = q.data
  if (q.isPending) return <Cargando bloques={2} />
  if (!p) return <NoLlego que="cómo vienen" error={q.error} onRetry={() => void q.refetch()} />
  const signals = p.signals ?? []
  const byKind = p.byKind ?? []

  return (
    <div className="flex flex-col gap-10">
      <header className="border-b border-line pb-4">
        <Heading level={1} size="xl">Cómo vienen</Heading>
        <Text variant="muted">Lo que está pasando con tus chicos, en orden de urgencia y con qué hacer en cada caso.</Text>
      </header>

      <section className="flex flex-col gap-4">
        <div><Eyebrow>Lo primero</Eyebrow><Heading level={2} size="lg" className="mt-1">Quién necesita una mano</Heading></div>
        {signals.length === 0
          ? <Card padding="lg"><Text variant="muted">Sin señales por ahora. Aparecen cuando alguien se traba, tarda mucho, abandona… o vuela.</Text></Card>
          : <ul className="flex flex-col gap-3">
              {signals.map((s) => { const t = KIND[s.kind]; return (
                <li key={s.learnerId + s.kind} className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-4">
                  <span className={`shrink-0 self-start ${t.ink}`}><Icon icon={t.icon} size="lg" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{s.learner}</span><Chip size="sm">{t.label}</Chip><Text size="xs" variant="muted">{s.group}</Text></div>
                    <p className="mt-1 text-sm text-ink-muted">{s.detail}</p>
                    <p className="mt-2 text-sm">{s.suggestion}</p>
                    {s.recipeTitle && <Text size="xs" variant="subtle" className="mt-1">Asignar le manda "{s.recipeTitle}".</Text>}
                  </div>
                  <div className="shrink-0"><SignalAction signal={s} /></div>
                </li>
              )})}
            </ul>}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <Eyebrow>Por tipo de actividad</Eyebrow>
          <Heading level={2} size="lg" className="mt-1">Qué les cuesta más</Heading>
          <Text variant="muted" className="mt-1">Si un tipo tiene pocos aciertos, probá otro camino antes de repetirlo: la dificultad puede estar en el formato y no en el tema.</Text>
        </div>
        {/* La tabla del kit y no una escrita a mano: era la única tabla de la plataforma con sus
            propios bordes, su propio alto de fila y su propio encabezado, justo la pieza que el
            kit ya resuelve. Y sin la columna de minutos: para saber qué les cuesta, el promedio
            de tiempo de un tipo de actividad no dice nada que los aciertos no digan mejor. */}
        <Card padding="none" className="overflow-hidden">
          <Table size="sm">
            <TableHeader>
              <TableRow>
                <TableHead>Experiencia</TableHead>
                <TableHead align="end">Entregas</TableHead>
                <TableHead align="end">Aciertos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byKind.length === 0
                ? <TableEmpty colSpan={3}>Cuando haya entregas, acá ves qué tipo de actividad les cuesta más.</TableEmpty>
                : byKind.map((t) => (
                  <TableRow key={t.experience}>
                    <TableCell className="font-medium"><span className="flex items-center gap-2"><Icon icon={Layers} size="sm" color="subtle" />{EXPERIENCES[t.experience] ?? t.experience ?? '-'}</span></TableCell>
                    <TableCell align="end" className="tabular-nums">{t.submissions}</TableCell>
                    <TableCell align="end" className={cn('tabular-nums', t.accuracy >= 0 && t.accuracy < 0.6 && 'font-semibold text-danger')}>
                      {t.accuracy >= 0 ? `${Math.round(t.accuracy * 100)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  )
}
