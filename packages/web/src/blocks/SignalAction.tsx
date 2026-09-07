// El botón que convierte una señal en algo hecho.
//
// Una sugerencia que no se puede seguir es una crítica: melu detecta que a Benjamín le fue mal en
// dos misiones, sugiere una receta, y hasta acá el docente tenía que buscarla a mano en la
// biblioteca, crear la actividad y asignarla. Tres pantallas para obedecer una línea de texto.
// Este bloque hace esas dos llamadas en un clic y después dice que quedó hecho, en vez de volver
// a ofrecer lo mismo.
//
// El botón dice una palabra y va al costado de la tarjeta: el qué y el a quién ya están en el
// cuerpo de la señal, así que repetirlos adentro del botón lo convertía en un párrafo con borde.
// La frase entera se queda en la etiqueta accesible, que es donde hace falta.
import { Link } from 'react-router'
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
        {/* Un `Link` y no un `<a>`: el `<a>` recargaba la aplicación entera para ir a otra
            pantalla de la misma aplicación. */}
        <Link to={`/groups/${signal.groupId}/missions/${signal.assignmentId}/submissions/${signal.submissionId}`} aria-label={`Ver qué hizo ${signal.learner}`}>Ver</Link>
      </Button>
    )
  }

  if (assign.isSuccess) {
    return (
      <Text size="sm" variant="muted" className="flex items-center gap-1.5">
        <Icon icon={Check} size="sm" className="text-success" />
        Asignada
      </Text>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" loading={assign.isPending} onClick={() => assign.mutate()}
        startIcon={<Icon icon={Wand2} size="sm" />}
        aria-label={`Asignar "${signal.recipeTitle}" a ${signal.group}`}>
        Asignar
      </Button>
      {assign.isError && <Text size="xs" variant="danger">No se pudo. Probá de nuevo.</Text>}
    </div>
  )
}
