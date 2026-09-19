// La portada de una actividad: la marca de color del sistema con un glifo, elegido por el
// título. No hay fotos, y tampoco ilustración: una marca dice de qué va sin inventar un dibujo.
import { Icon, labelColors, labelFill, type IconName, type LabelColor } from '@milo/ui'
import { cn } from '../lib/cn'

const POR_TITULO: Record<string, [LabelColor, IconName]> = {
  'Puente de espagueti': ['orange', 'handyman'],
  'Cartógrafos del barrio': ['blue', 'map'],
  'Una pieza para alguien': ['purple', 'lightbulb'],
  'El robot que cuenta': ['teal', 'smart_toy'],
  'Fracciones en la cocina': ['orange', 'calculate'],
  'Escape del aula': ['purple', 'lock'],
  'Cuento con números': ['green', 'menu_book'],
  'La tienda del grupo': ['pink', 'payments'],
  'Gallinas y conejos': ['blue', 'calculate'],
  '¿Cómo llegaste hoy?': ['green', 'forum'],
}

/** El par color/glifo de una actividad. Sin entrada propia, sale del título y no cambia nunca. */
export function coverOf(title: string): [LabelColor, IconName] {
  const conocida = POR_TITULO[title]
  if (conocida) return conocida
  let h = 0
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return [labelColors[h % labelColors.length], 'lightbulb']
}

export function Cover({ title, className = '', size = 88 }: { title: string; className?: string; size?: number }) {
  const [color, icon] = coverOf(title)
  return (
    <span className={cn('mark grid place-items-center', labelFill[color], className)}>
      <Icon name={icon} size={size} weight={300} />
    </span>
  )
}
