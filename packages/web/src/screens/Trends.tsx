// Lo analítico, fuera del panel.
//
// Estos números estaban en Inicio compitiendo con lo que hay que hacer hoy, y encima solos: «34.6
// min» no le dice nada a nadie sin saber si eso es mucho. Acá tienen lugar para traer contra qué
// compararse, que es lo que los vuelve legibles.
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Layers } from 'lucide-react'
import { Card, Eyebrow, Heading, Icon, Text, cn } from '@melu/ui'
import { api, type Dashboard } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { EXPERIENCES } from '../lib/composition'
import { Empty } from '../blocks/Modal'

/** Un número con lo que era antes al lado. Sin eso es un adorno, que es cómo estaba en Inicio. */
function Compared({ label, value, unit, prev, hint, betterWhen }: {
  label: string; value: number; unit?: string; prev: number; hint: string; betterWhen: 'lower' | 'higher'
}) {
  const hay = value >= 0
  const hayPrev = prev >= 0 && hay
  const delta = hayPrev ? value - prev : 0
  const mejor = betterWhen === 'lower' ? delta < 0 : delta > 0

  return (
    <Card padding="lg" className="gap-1">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold tabular-nums">{hay ? value : '-'}</span>
        {hay && unit && <span className="text-base font-medium text-ink-muted">{unit}</span>}
      </div>
      {hayPrev && delta !== 0 ? (
        <Text size="sm" className={cn('flex items-center gap-1 font-medium', mejor ? 'text-success' : 'text-danger')}>
          <Icon icon={delta > 0 ? ArrowUp : ArrowDown} size="xs" />
          {Math.abs(Math.round(delta * 10) / 10)}{unit} {delta > 0 ? 'más' : 'menos'} que la semana pasada
        </Text>
      ) : (
        <Text size="sm" variant="subtle">
          {hayPrev ? 'Igual que la semana pasada' : 'Todavía no hay con qué comparar'}
        </Text>
      )}
      <Text size="sm" variant="muted" className="mt-1">{hint}</Text>
    </Card>
  )
}

export function Trends() {
  const spaceId = useSpaceId()
  const q = useQuery({
    queryKey: ['dashboard', spaceId],
    queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`),
    staleTime: 30_000,
  })
  const p = q.data
  if (!p) return null
  const byKind = p.byKind ?? []
  const sinDatos = byKind.length === 0 && p.avgMinutes === 0 && p.accuracy < 0

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Heading level={1} size="2xl">Cómo viene</Heading>
        <Text variant="muted">
          Los promedios de la última semana, con los de la anterior al lado. Nada de esto pide una
          decisión hoy: es para mirar de vez en cuando y ver si algo se movió.
        </Text>
      </header>

      {sinDatos ? (
        <Empty title="Todavía no hay entregas" text="Cuando los chicos empiecen a entregar, acá vas a poder ver cuánto les lleva y cómo les va." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Compared label="Tiempo por misión" value={p.avgMinutes} unit=" min" prev={p.prevAvgMinutes} betterWhen="lower"
              hint="Desde que abren la misión hasta que la entregan. Si sube mucho, puede ser que la consigna no se entienda." />
            <Compared label="Aciertos en chequeos" value={p.accuracy >= 0 ? Math.round(p.accuracy * 100) : -1} unit="%"
              prev={p.prevAccuracy >= 0 ? Math.round(p.prevAccuracy * 100) : -1} betterWhen="higher"
              hint="Solo sobre los bloques con opción correcta. No dice si aprendieron: dice si acertaron." />
          </div>

          <Card padding="lg">
            <Eyebrow>Por tipo de actividad</Eyebrow>
            <Heading level={2} size="lg" className="mt-1">Qué les cuesta más</Heading>
            <Text size="sm" variant="muted">Sirve para elegir la próxima: si un tipo tiene pocos aciertos, probá otro camino antes de repetirlo.</Text>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-2 font-medium text-ink-muted">Experiencia</th>
                    <th className="py-2 text-right font-medium text-ink-muted">Entregas</th>
                    <th className="py-2 text-right font-medium text-ink-muted">Min</th>
                    <th className="py-2 text-right font-medium text-ink-muted">Aciertos</th>
                  </tr>
                </thead>
                <tbody>
                  {byKind.map((t) => (
                    <tr key={t.experience} className="border-b border-line last:border-0">
                      <td className="flex items-center gap-2 py-2.5">
                        <Icon icon={Layers} size="sm" color="subtle" />{EXPERIENCES[t.experience] ?? t.experience ?? '-'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{t.submissions}</td>
                      <td className="py-2.5 text-right tabular-nums">{t.avgMinutes || '-'}</td>
                      <td className="py-2.5 text-right tabular-nums">{t.accuracy >= 0 ? `${Math.round(t.accuracy * 100)}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
