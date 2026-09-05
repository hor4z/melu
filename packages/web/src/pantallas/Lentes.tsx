import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Card, Chip, Eyebrow, Heading, Icon, Text } from '@/kit'
import { api, type Lente } from '../lib/api'

export function Lentes() {
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-line pb-4"><Eyebrow>Lentes</Eyebrow><Heading level={1} size="2xl" className="mt-1">Cómo se recorre una actividad</Heading><Text variant="muted">Una forma de recorrer una actividad. Cada lente trae sus fases. Son datos: sumar un método es cargar una fila.</Text></header>
      <div className="grid gap-4 md:grid-cols-2">
        {lentes.data?.map((l) => (
          <Card key={l.clave} padding="md" className="gap-3">
            <div><div className="font-semibold">{l.nombre}</div><Text size="sm" variant="muted">{l.descripcion}</Text></div>
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              {l.fases.map((f, i) => (
                <li key={f.clave} className="flex items-center gap-1.5"><Chip color="teal" title={f.pide}>{f.nombre}</Chip>{i < l.fases.length - 1 && <Icon icon={ArrowRight} size="xs" color="subtle" />}</li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  )
}
