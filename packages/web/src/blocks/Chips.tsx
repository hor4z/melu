import { useQuery } from '@tanstack/react-query'
import { Chip } from '@milo/ui'
import { api, type Composition, type Lens } from '../lib/api'
import { SETTINGS, EXPERIENCES, SOCIAL, labelOf } from '../lib/composition'

// Los ejes de una actividad, como chips. La experiencia lleva color; el resto queda neutro.
export function CompositionChips({ c, compact }: { c: Composition; compact?: boolean }) {
  const lenses = useQuery({ queryKey: ['lenses'], queryFn: () => api.get<Lens[]>('/api/lenses'), staleTime: Infinity })
  const lens = lenses.data?.find((l) => l.key === c.lens)
  const size = compact ? 'sm' : 'md'
  const exp = labelOf(EXPERIENCES, c.experience)
  const soc = labelOf(SOCIAL, c.social)
  return (
    <div className="flex flex-wrap gap-1.5">
      {exp && <Chip color="blue" size={size}>{exp}</Chip>}
      {lens && lens.key !== 'no_lens' && <Chip size={size}>{lens.name}</Chip>}
      {(c.setting ?? []).map((e) => { const n = labelOf(SETTINGS, e); return n ? <Chip key={e} size={size}>{n}</Chip> : null })}
      {soc && <Chip size={size}>{soc}</Chip>}
      {!compact && (c.disciplines ?? []).map((d) => <Chip key={d} size={size}>{d}</Chip>)}
    </div>
  )
}
