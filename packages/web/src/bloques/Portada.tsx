import { DoodleBrote, DoodleCandado, DoodleCocina, DoodleFoco, DoodleLibro, DoodleMapa, DoodlePuente, DoodleRobot } from '@/kit'

// Portada por actividad: tinte + doodle según el título (o un valor por defecto). Sin fotos hasta que haya.
const MAPA: Record<string, [string, React.ComponentType<{ size?: number; className?: string }>]> = {
  'Puente de espagueti': ['bg-yellow', DoodlePuente], 'Cartógrafos del barrio': ['bg-blue', DoodleMapa], 'Una pieza para alguien': ['bg-lilac', DoodleFoco],
  'El robot que cuenta': ['bg-cyan', DoodleRobot], 'Fracciones en la cocina': ['bg-orange', DoodleCocina], 'Escape del aula': ['bg-lilac', DoodleCandado],
  'Cuento con números': ['bg-teal', DoodleLibro], 'La tienda del grupo': ['bg-yellow', DoodleFoco], 'Reto de la semana': ['bg-blue', DoodleFoco], '¿Cómo llegaste hoy?': ['bg-green', DoodleBrote],
}
const TINTES = ['bg-teal', 'bg-yellow', 'bg-blue', 'bg-lilac', 'bg-orange', 'bg-cyan', 'bg-green', 'bg-pink']
export function portadaDe(titulo: string): [string, React.ComponentType<{ size?: number; className?: string }>] {
  if (MAPA[titulo]) return MAPA[titulo]
  let h = 0; for (const ch of titulo) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return [TINTES[h % TINTES.length], DoodleFoco]
}
export function Portada({ titulo, className = '', size = 88 }: { titulo: string; className?: string; size?: number }) {
  const [tint, D] = portadaDe(titulo)
  return <div className={`grid place-items-center ${tint} ${className}`}><D size={size} className="text-ink" /></div>
}
