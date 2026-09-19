import { useQuery } from '@tanstack/react-query'
import { Card, Chip, Icon, PageHeader, Tooltip } from '@milo/ui'
import { api, type Lens } from '../lib/api'

export function Lenses() {
  const lenses = useQuery({ queryKey: ['lenses'], queryFn: () => api.get<Lens[]>('/api/lenses') })
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cómo se recorre una actividad"
        subtitle="Una lente es una forma de recorrer una actividad, y trae sus fases. Son datos: sumar un método es cargar una fila."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {lenses.data?.map((l) => (
          <Card key={l.key} className="flex flex-col gap-3 p-4">
            <div>
              <div className="text-body font-semibold">{l.name}</div>
              <p className="text-body text-text-muted">{l.description}</p>
            </div>
            <ol className="flex flex-wrap items-center gap-1.5">
              {l.phases.map((f, i) => (
                <li key={f.key} className="flex items-center gap-1.5">
                  <Tooltip label={f.asks}><span><Chip color="teal" size="sm">{f.name}</Chip></span></Tooltip>
                  {i < l.phases.length - 1 && <Icon name="chevron_right" size={14} className="icon-muted" />}
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  )
}
