import { useQuery } from '@tanstack/react-query'
import { api, type Composicion, type Lente } from '../lib/api'
import { ESCENARIOS, EXPERIENCIAS, SOCIAL, nombreDe } from '../lib/composicion'

// Los ejes de una actividad, como chips. Cada eje con su color, siempre el mismo.
export function ChipsComposicion({ c, lenteNombre, compacto }: { c: Composicion; lenteNombre?: string; compacto?: boolean }) {
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes'), staleTime: Infinity })
  lenteNombre ??= lentes.data?.find((l) => l.clave === c.lente)?.nombre
  const chips: [string, string][] = []
  const exp = nombreDe(EXPERIENCIAS, c.experiencia); if (exp) chips.push([exp, 'bg-accent-muted text-accent'])
  const len = lenteNombre ?? (c.lente && c.lente !== 'sin_lente' ? c.lente : undefined); if (len) chips.push([len, 'bg-purple-subtle'])
  for (const e of c.escenario ?? []) { const n = nombreDe(ESCENARIOS, e); if (n) chips.push([n, 'bg-green-subtle']) }
  const soc = nombreDe(SOCIAL, c.social); if (soc) chips.push([soc, 'bg-yellow-subtle'])
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(([t, cls], i) => <span key={i} className={`rounded-full px-2.5 py-0.5 ${compacto ? 'text-2xs' : 'text-xs'} font-medium ${cls}`}>{t}</span>)}
      {!compacto && (c.disciplinas ?? []).map((d) => <span key={d} className="rounded-full border border-default px-2.5 py-0.5 text-xs text-secondary">{d}</span>)}
    </div>
  )
}
