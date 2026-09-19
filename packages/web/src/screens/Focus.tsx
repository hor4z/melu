// "Cómo vienen": la pantalla a la que se entra a entender a la gente.
//
// Inicio responde "qué tengo que hacer ahora". Esto responde "quién necesita una mano", que se
// lee más despacio y no debería estar compitiendo con lo urgente. La regla de lo que entra acá:
// nada se muestra si no termina en algo que el docente pueda hacer. Por eso el orden es el de la
// urgencia: primero quien se traba.
import { useQuery } from '@tanstack/react-query'
import {
  Card, Chip, Icon, PageHeader, SectionLabel, Table, TableBody, TableCell, TableEmpty, TableHead,
  TableHeader, TableNum, TableRow, markFill, type IconName, type MarkColor,
} from '@milo/ui'
import { SignalAction } from '../blocks/SignalAction'
import { api, type Dashboard } from '../lib/api'
import { EXPERIENCES } from '../lib/composition'
import { useSpaceId } from '../lib/space'
import { cn } from '../lib/cn'
import { Cargando, NoLlego } from '../blocks/Estado'

const KIND: Record<string, { icon: IconName; color: MarkColor; label: string }> = {
  misses: { icon: 'error', color: 'pink', label: 'Se traba' },
  dropout: { icon: 'schedule', color: 'orange', label: 'Sin terminar' },
  slow: { icon: 'arrow_downward', color: 'blue', label: 'Le lleva más' },
  shines: { icon: 'bolt', color: 'green', label: 'Vuela' },
}

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
    <div className="page-stack">
      <PageHeader
        title="Cómo vienen"
        subtitle="Lo que está pasando con tus chicos, en orden de urgencia y con qué hacer en cada caso."
      />

      <section className="flex flex-col gap-3">
        <SectionLabel count={signals.length}>Quién necesita una mano</SectionLabel>
        {signals.length === 0
          ? <Card className="p-5"><p className="text-body text-text-muted">Sin señales por ahora. Aparecen cuando alguien se traba, tarda mucho, abandona... o vuela.</p></Card>
          : (
            <ul className="flex flex-col gap-3">
              {signals.map((s) => {
                const t = KIND[s.kind]
                return (
                  <li key={s.learnerId + s.kind}>
                    <Card className="flex flex-wrap items-start gap-4 p-4">
                      <span className={cn('mark grid size-10 shrink-0 place-items-center rounded-[var(--radius-lg)]', markFill[t.color])}>
                        <Icon name={t.icon} size={22} weight={400} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-body font-semibold">{s.learner}</span>
                          <Chip size="sm">{t.label}</Chip>
                          <span className="text-meta text-text-muted">{s.group}</span>
                        </div>
                        <p className="mt-1 text-body text-text-muted">{s.detail}</p>
                        <p className="mt-2 text-body">{s.suggestion}</p>
                        {s.recipeTitle && <p className="mt-1 text-meta text-text-muted">Asignar le manda "{s.recipeTitle}".</p>}
                      </div>
                      <div className="shrink-0"><SignalAction signal={s} /></div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Qué les cuesta más</SectionLabel>
        <p className="text-body text-text-muted">
          Si un tipo tiene pocos aciertos, probá otro camino antes de repetirlo: la dificultad puede
          estar en el formato y no en el tema.
        </p>
        {/* La tabla del sistema y no una escrita a mano. Sin la columna de minutos: para saber
            qué les cuesta, el promedio de tiempo no dice nada que los aciertos no digan mejor. */}
        <Table label="Entregas y aciertos por tipo de actividad">
          <TableHeader>
            <TableRow>
              <TableHead>Experiencia</TableHead>
              <TableHead align="right">Entregas</TableHead>
              <TableHead align="right">Aciertos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byKind.length === 0
              ? <TableEmpty colSpan={3}>Cuando haya entregas, acá ves qué tipo de actividad les cuesta más.</TableEmpty>
              : byKind.map((t) => (
                <TableRow key={t.experience}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Icon name="layers" size={16} className="icon-muted" />
                      {EXPERIENCES[t.experience] ?? t.experience ?? '-'}
                    </span>
                  </TableCell>
                  <TableNum>{t.submissions}</TableNum>
                  <TableNum>
                    <span className={cn(t.accuracy >= 0 && t.accuracy < 0.6 && 'font-semibold text-bad-ink')}>
                      {t.accuracy >= 0 ? `${Math.round(t.accuracy * 100)}%` : '-'}
                    </span>
                  </TableNum>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
