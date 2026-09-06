// El botón que convierte una señal en algo hecho.
//
// Una sugerencia que no se puede seguir es una crítica: melu detecta que a Benjamín le fue mal en
// dos misiones, sugiere una receta, y hasta acá el docente tenía que buscarla a mano en la
// biblioteca, crear la actividad y asignarla. Tres pantallas para obedecer una línea de texto.
// Este bloque hace esas dos llamadas en un clic y después dice que quedó hecho, en vez de volver
// a ofrecer lo mismo.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, Wand2 } from 'lucide-react'
import { Button, Icon, Text } from '@melu/ui'
import { api, type Activity, type Signal } from '../lib/api'
import { useSpaceId } from '../lib/space'

export function SignalAction({ signal }: { signal: Signal }) {
  const qc = useQueryClient()
  const spaceId = useSpaceId()

  // Las mismas dos llamadas que ya encadena la bienvenida: crear la actividad desde la receta y
  // asignarla al grupo del que salió la señal.
  const assign = useMutation({
    mutationFn: async () => {
      const a = await api.post<Activity>('/api/activities', { spaceId, fromRecipe: signal.recipeId })
      await api.post(`/api/activities/${a.id}/assign`, { groupId: signal.groupId })
      return a
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', spaceId] }),
  })

  // El abandono es el único caso sin receta que ofrecer: no hay nada que asignarle a alguien que
  // ya tiene una misión abierta sin terminar. Lo que hace falta es ver dónde se trabó.
  if (!signal.recipeId) {
    if (!signal.assignmentId) return null
    return (
      <Button size="sm" variant="secondary" asChild startIcon={<Icon icon={Eye} size="sm" />}>
        <a href={`/review/${signal.assignmentId}`}>Ver qué hizo</a>
      </Button>
    )
  }

  if (assign.isSuccess) {
    return (
      <Text size="sm" variant="muted" className="flex items-center gap-1.5">
        <Icon icon={Check} size="sm" className="text-success" />
        Quedó asignada a {signal.group}
      </Text>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="sm" loading={assign.isPending} onClick={() => assign.mutate()} startIcon={<Icon icon={Wand2} size="sm" />}>
        Asignar «{signal.recipeTitle}» a {signal.group}
      </Button>
      {assign.isError && <Text size="xs" variant="danger">No se pudo asignar. Probá de nuevo.</Text>}
    </div>
  )
}
