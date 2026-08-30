import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Clock, Flame, Target, Trophy } from 'lucide-react'
import { Button, Chip, DoodleBrote, Eyebrow, Icon, ProgressRing, StatTile, Text } from '@/ui'
import { api, type Progreso as P } from '../lib/api'
import { EXPERIENCIAS } from '../lib/composicion'

export function Progreso() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['progreso'], queryFn: () => api.get<P>('/api/mi-progreso') })
  const p = q.data
  if (!p) return null
  const total = p.hechas + p.enCurso
  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-5">
        <ProgressRing value={total ? p.hechas / total : 0} size={84}>{p.hechas}/{total || 0}</ProgressRing>
        <div><Eyebrow>Mi progreso</Eyebrow><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Lo que hiciste hasta ahora</h1><Text variant="muted">Solo vos y tu docente ven esto. No se compara con nadie.</Text></div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Misiones hechas" value={p.hechas} tint="bg-orange" icon={<Icon icon={Trophy} size="lg" />} />
        <StatTile label="Racha" value={p.racha} unit={p.racha === 1 ? 'día' : 'días'} hint="días seguidos entregando" tint="bg-yellow" icon={<Icon icon={Flame} size="lg" />} />
        <StatTile label="Tiempo" value={p.minutos} unit="min" hint="en total, trabajando" tint="bg-blue" icon={<Icon icon={Clock} size="lg" />} />
        <StatTile label="Aciertos" value={p.aciertos >= 0 ? Math.round(p.aciertos * 100) : '—'} unit={p.aciertos >= 0 ? '%' : undefined} hint="en los chequeos" tint="bg-lilac" icon={<Icon icon={Target} size="lg" />} />
      </section>
      {Object.keys(p.experiencias).length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-6"><Eyebrow>Qué tipo de cosas hiciste</Eyebrow><div className="mt-3 flex flex-wrap gap-2">{Object.entries(p.experiencias).map(([k, n]) => <Chip key={k}>{EXPERIENCIAS[k] ?? k} · {n}</Chip>)}</div></section>
      )}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <Eyebrow>Misiones</Eyebrow>
        {p.misiones.length === 0 ? <div className="flex flex-col items-center gap-3 py-8 text-center"><DoodleBrote size={90} className="text-ink" /><Text variant="muted">Todavía no hiciste ninguna. Cuando empieces, acá queda tu historia.</Text></div> : (
          <ul className="mt-3 divide-y divide-line">
            {p.misiones.map((m) => (
              <li key={m.entregaId} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><div className="font-medium">{m.titulo}</div><Text size="xs" variant="muted">{m.grupo}{m.minutos ? ` · ${m.minutos} min` : ''}{m.aciertos >= 0 ? ` · ${Math.round(m.aciertos * 100)}% aciertos` : ''}</Text></div>
                <Chip size="sm" variant={m.estado === 'corregida' ? 'success' : m.estado === 'entregada' ? 'neutral' : 'warning'}>{m.estado === 'corregida' ? 'Con devolución' : m.estado === 'entregada' ? 'Entregada' : 'En curso'}</Chip>
                <Button size="sm" variant="ghost" onClick={() => nav(`/mision/${m.asignacionId}`)}>Abrir</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
