import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Icon, Text } from '@/ui'
import { api, type Lente } from '../lib/api'

export function Lentes() {
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-line pb-4"><h1 className="text-2xl font-semibold tracking-tight">Lentes</h1><Text variant="muted">Una forma de recorrer una actividad. Cada lente trae sus fases. Son datos: sumar un método es cargar una fila.</Text></header>
      <div className="grid gap-4 md:grid-cols-2">
        {lentes.data?.map((l) => (
          <div key={l.clave} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
            <div><div className="font-semibold">{l.nombre}</div><Text size="sm" variant="muted">{l.descripcion}</Text></div>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              {l.fases.map((f, i) => (
                <li key={f.clave} className="flex items-center gap-1.5"><span className="rounded-md bg-brand-subtle px-2 py-0.5 font-medium text-brand-text" title={f.pide}>{f.nombre}</span>{i < l.fases.length - 1 && <Icon icon={ArrowRight} size="xs" color="subtle" />}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
