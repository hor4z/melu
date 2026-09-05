import { useQuery } from '@tanstack/react-query'
import { Chip } from '@/kit'
import { api, type Composicion, type Lente } from '../lib/api'
import { ESCENARIOS, EXPERIENCIAS, SOCIAL, nombreDe } from '../lib/composicion'

// Los ejes de una actividad, como chips. La experiencia va en marca; el resto, neutro.
export function ChipsComposicion({ c, compacto }: { c: Composicion; compacto?: boolean }) {
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes'), staleTime: Infinity })
  const lente = lentes.data?.find((l) => l.clave === c.lente)
  const size = compacto ? 'sm' : 'md'
  const exp = nombreDe(EXPERIENCIAS, c.experiencia)
  const soc = nombreDe(SOCIAL, c.social)
  return (
    <div className="flex flex-wrap gap-1.5">
      {exp && <Chip color="accent" size={size}>{exp}</Chip>}
      {lente && lente.clave !== 'sin_lente' && <Chip size={size}>{lente.nombre}</Chip>}
      {(c.escenario ?? []).map((e) => { const n = nombreDe(ESCENARIOS, e); return n ? <Chip key={e} size={size}>{n}</Chip> : null })}
      {soc && <Chip size={size}>{soc}</Chip>}
      {!compacto && (c.disciplinas ?? []).map((d) => <Chip key={d} color="outline" size={size}>{d}</Chip>)}
    </div>
  )
}

// Rótulo chico en mayúsculas y color de marca, como los "RETO 1" / "CONSIGNA".
export function Rotulo({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[11px] font-semibold uppercase tracking-wider text-brand-text ${className}`}>{children}</span>
}
