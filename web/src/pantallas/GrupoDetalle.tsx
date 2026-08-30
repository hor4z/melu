import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Badge } from '@astryxdesign/core/Badge'
import { api, type Grupo } from '../lib/api'

export function GrupoDetalle() {
  const { id } = useParams()
  const grupo = useQuery({ queryKey: ['grupo', id], queryFn: () => api.get<Grupo>(`/api/grupos/${id}`) })
  if (!grupo.data) return null
  const g = grupo.data
  return (
    <div className="flex flex-col gap-6">
      <Link to="/grupos" className="text-sm text-secondary">← Mis grupos</Link>
      <div>
        <Heading level={1}>{g.nombre}</Heading>
        <Badge label={`${g.aprendices} aprendices`} />
      </div>
      <Card padding={6}>
        <div className="flex flex-col items-start gap-2">
          <Text size="sm" color="secondary">Código para unirse</Text>
          <Text size="xl" weight="bold" hasTabularNumbers>
            <span className="font-mono tracking-[0.25em]">{g.codigo}</span>
          </Text>
          <Text size="sm" color="secondary">Los chicos entran en <span className="font-mono">/unirme/{g.codigo}</span> con su nombre y un PIN. Eso llega en la sesión 3.</Text>
        </div>
      </Card>
      <Card padding={6}>
        <Text color="secondary">Acá van las actividades asignadas y los aprendices. Sesión 2 y 3.</Text>
      </Card>
    </div>
  )
}
