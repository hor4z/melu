// How the learning profile is shown. One single way to draw it, whoever is looking.
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, Chip, Eyebrow, Icon, Text, cn } from '@melu/ui'
import { ProfileBars } from '../screens/Start'
import { BANDS, AXES, POLES, confidence, dominant, even, headline, type LiveProfile, type Pole } from '../lib/profile'

/** The full card: what the learner sees of themselves and the teacher sees of each one. */
export function ProfileCard({ v, title = 'Cómo aprendés', voice = 'third' }: { v: LiveProfile; title?: string; voice?: 'you' | 'third' }) {
  if (!v.has && v.missions === 0) {
    return (
      <Card padding="lg">
        <Eyebrow>{title}</Eyebrow>
        <Text variant="muted" className="mt-2">Todavía no hay nada: se arma con el recorrido de bienvenida y con las misiones que se van haciendo.</Text>
      </Card>
    )
  }
  const c = confidence(v, voice)
  return (
    <Card padding="lg" className="gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>{title}</Eyebrow>
          <Chip size="sm" color={c.level === 'backed' ? 'success' : 'default'}>
            {c.level === 'hunch' ? 'Corazonada' : c.level === 'lead' ? 'Se está acomodando' : 'Sostenido'}
          </Chip>
        </div>
        <p className="font-display text-xl font-semibold tracking-tight text-balance">{headline(v.profile, voice === 'you' ? 'you' : 'third')}</p>
      </div>

      <ProfileBars profile={v.profile} />

      <Text size="sm" variant="muted">{c.text}</Text>

      {(v.strong.length > 0 || v.weak.length > 0) && (
        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <PerformanceList title="Le rinde más" sign="+" items={v.strong} />
          <PerformanceList title="Le cuesta más" sign="−" items={v.weak} />
        </div>
      )}
    </Card>
  )
}

function PerformanceList({ title, sign, items }: { title: string; sign: '+' | '−'; items: LiveProfile['strong'] }) {
  if (items.length === 0) return <div />
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{title}</span>
      <ul className="flex flex-col gap-1.5">
        {items.map((r) => (
          <li key={r.pole} className="flex items-center gap-2 text-sm">
            <Icon icon={sign === '+' ? TrendingUp : TrendingDown} size="sm" className={sign === '+' ? 'text-success' : 'text-warning'} />
            <span className="font-medium">{POLES[r.pole as Pole]?.name ?? r.pole}</span>
            <span className="text-ink-muted">{POLES[r.pole as Pole]?.micro}</span>
            <span className="ml-auto tabular-nums text-xs text-ink-subtle">{sign}{Math.abs(Math.round(r.delta * 100))} pts</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One line per learner: for the group list. */
export function ProfileRow({ v }: { v: LiveProfile }) {
  const axes = AXES.filter((e) => !even(v.profile, e.key)).slice(0, 3)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!v.has && <Chip size="sm" color="warning">Sin recorrido de bienvenida</Chip>}
      {v.band && <Chip size="sm" color="outline">{BANDS[v.band]}</Chip>}
      {axes.map((e) => (
        <Chip key={e.key} size="sm" className={cn(e.tint, 'border-transparent')}>{POLES[dominant(v.profile, e.key)].name}</Chip>
      ))}
      {axes.length === 0 && <Text size="xs" variant="subtle">Todavía parejo en todo</Text>}
    </div>
  )
}

/** What happens across the whole group: how many do better with each thing. */
export function GroupSummary({ profiles }: { profiles: LiveProfile[] }) {
  if (profiles.length === 0) return null
  const counts: Record<string, number> = {}
  for (const v of profiles) {
    for (const e of AXES) {
      if (even(v.profile, e.key)) continue
      const p = dominant(v.profile, e.key)
      counts[p] = (counts[p] ?? 0) + 1
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const withEvidence = profiles.filter((v) => v.missions >= 3).length
  return (
    <Card padding="lg" className="gap-3">
      <Eyebrow>El grupo, de un vistazo</Eyebrow>
      <div className="flex flex-wrap gap-2">
        {top.map(([pole, n]) => (
          <span key={pole} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <strong className="font-display text-lg tabular-nums">{n}</strong>
            <span className="text-ink-muted">de {profiles.length} · {POLES[pole as Pole]?.name}</span>
          </span>
        ))}
      </div>
      <Text size="sm" variant="muted">
        {withEvidence === 0
          ? 'Por ahora todo esto es lo que dijeron de sí mismos. Se va a acomodar con las misiones que hagan.'
          : `${withEvidence} de ${profiles.length} ya tienen suficiente trabajo hecho como para que el perfil se apoye en datos y no solo en lo que dijeron.`}
      </Text>
    </Card>
  )
}
