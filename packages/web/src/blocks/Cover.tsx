import { DoodleSprout, DoodleLock, DoodleKitchen, DoodleBulb, DoodleBook, DoodleMap, DoodleBridge, DoodleRobot } from '@/kit'

// Cover per activity: tint + doodle picked from the title (or a default). No photos until there are any.
const MAP: Record<string, [string, React.ComponentType<{ size?: number; className?: string }>]> = {
  'Puente de espagueti': ['bg-yellow', DoodleBridge], 'Cartógrafos del barrio': ['bg-blue', DoodleMap], 'Una pieza para alguien': ['bg-lilac', DoodleBulb],
  'El robot que cuenta': ['bg-cyan', DoodleRobot], 'Fracciones en la cocina': ['bg-orange', DoodleKitchen], 'Escape del aula': ['bg-lilac', DoodleLock],
  'Cuento con números': ['bg-teal', DoodleBook], 'La tienda del grupo': ['bg-yellow', DoodleBulb], 'Reto de la semana': ['bg-blue', DoodleBulb], '¿Cómo llegaste hoy?': ['bg-green', DoodleSprout],
}
const TINTS = ['bg-teal', 'bg-yellow', 'bg-blue', 'bg-lilac', 'bg-orange', 'bg-cyan', 'bg-green', 'bg-pink']
export function coverOf(title: string): [string, React.ComponentType<{ size?: number; className?: string }>] {
  if (MAP[title]) return MAP[title]
  let h = 0; for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return [TINTS[h % TINTS.length], DoodleBulb]
}
export function Cover({ title, className = '', size = 88 }: { title: string; className?: string; size?: number }) {
  const [tint, D] = coverOf(title)
  return <div className={`grid place-items-center ${tint} ${className}`}><D size={size} className="text-ink" /></div>
}
