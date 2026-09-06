// La sugerencia, convertida en algo que se puede hacer.
//
// Antes la señal decía «una actividad con lente CPA, corta, en casa» y nombraba una receta, pero
// la receta era un enlace a la lista: el docente leía qué hacer y después tenía que ir a buscarla,
// copiarla y asignarla. Tres pantallas para seguir un consejo de una línea.
//
// Acá es un botón: crea la actividad desde la receta y se la asigna al grupo del aprendiz, que es
// exactamente lo que la sugerencia estaba pidiendo.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Send } from 'lucide-react'
import { Button, Icon, Text } from '@melu/ui'
import { api, type Activity } from '../lib/api'
import { useSpaceId } from '../lib/space'

export function SignalAction({ recipeId, recipeTitle, groupId, groupName }: {
  recipeId: string; recipeTitle?: string; groupId: string; groupName: string
}) {
  const qc = useQueryClient()
  const spaceId = useSpaceId()

  const assign = useMutation({
    mutationFn: async () => {
      const a = await api.post<Activity>('/api/activities', { spaceId, fromRecipe: recipeId })
      await api.post(`/api/activities/${a.id}/assign`, { groupId })
      return a
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  if (assign.isSuccess) {
    return (
      <Text size="sm" className="mt-2 flex items-center gap-1.5 font-semibold text-success">
        <Icon icon={Check} size="sm" /> «{recipeTitle}» quedó asignada a {groupName}
      </Text>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" loading={assign.isPending} onClick={() => assign.mutate()}
        startIcon={<Icon icon={Send} size="sm" />}>
        Asignar «{recipeTitle}» a {groupName}
      </Button>
      {assign.isError && <Text size="sm" variant="danger">No se pudo asignar. Probá de nuevo.</Text>}
    </div>
  )
}
