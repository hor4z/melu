// "Cómo vienen": la pantalla a la que se entra a entender a la gente.
//
// Inicio responde "qué tengo que hacer ahora". Esto responde "quién necesita una mano", que se
// lee más despacio y no debería estar compitiendo con lo urgente. La regla de lo que entra acá:
// nada se muestra si no termina en algo que el docente pueda hacer. Por eso el orden es el de la
// urgencia: primero quien se traba.
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Clock, Layers, TrendingDown, Zap } from 'lucide-react'
import { Card, Chip, Eyebrow, Heading, Icon, Text } from '@melu/ui'
import { SignalAction } from '../blocks/SignalAction'
import { api, type Dashboard } from '../lib/api'
import { EXPERIENCES } from '../lib/composition'
import { useSpaceId } from '../lib/space'

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
  if (!p) return null
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
        <Card padding="lg">
          {byKind.length === 0 ? <Text variant="muted">Cuando haya entregas, acá ves tiempo y aciertos por experiencia.</Text> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-ink-subtle"><th className="pb-2 font-medium">Experiencia</th><th className="pb-2 text-right font-medium">Entregas</th><th className="pb-2 text-right font-medium">Min</th><th className="pb-2 text-right font-medium">Aciertos</th></tr></thead>
              <tbody>{byKind.map((t) => (
                <tr key={t.experience} className="border-t border-line">
                  <td className="py-2 font-medium"><span className="flex items-center gap-2"><Icon icon={Layers} size="sm" color="subtle" />{EXPERIENCES[t.experience] ?? t.experience ?? '-'}</span></td>
                  <td className="py-2 text-right tabular-nums">{t.submissions}</td>
                  <td className="py-2 text-right tabular-nums">{t.avgMinutes || '-'}</td>
                  <td className={`py-2 text-right tabular-nums ${t.accuracy >= 0 && t.accuracy < 0.6 ? 'font-semibold text-danger' : ''}`}>{t.accuracy >= 0 ? `${Math.round(t.accuracy * 100)}%` : '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  )
}
