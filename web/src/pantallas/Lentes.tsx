import { useQuery } from '@tanstack/react-query'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { api, type Lente } from '../lib/api'

export function Lentes() {
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level={1}>Lentes</Heading>
        <Text color="secondary">Un lente es una forma de recorrer una actividad. Cada uno trae sus fases. Son datos, no código: sumar un método es cargar una fila.</Text>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {lentes.data?.map((l) => (
          <Card key={l.clave} padding={5}>
            <div className="flex flex-col gap-3">
              <div>
                <Text weight="bold" size="lg">{l.nombre}</Text>
                <Text size="sm" color="secondary">{l.descripcion}</Text>
              </div>
              <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                {l.fases.map((f, i) => (
                  <li key={f.clave} className="flex items-center gap-1.5">
                    <span className="rounded-md bg-muted px-2 py-0.5" title={f.pide}>{f.nombre}</span>
                    {i < l.fases.length - 1 && <span className="text-secondary">→</span>}
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
