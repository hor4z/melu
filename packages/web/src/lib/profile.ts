// The learning-profile catalog. It is copy and colors: the math lives in Go
// (internal/app/profile.go) so the number is the same whether the learner or the teacher looks.
//
// Important note, the same one that is in the backend: this is NOT a "learning styles" test.
// Styles as a fixed label have no support. There are two honest things here: a preference the
// person declares, and a performance measured against real work. The profile is the blend,
// and it is always shown as "today".

export type Pole =
  | 'see' | 'listen' | 'read' | 'do'
  | 'challenge' | 'story' | 'game' | 'real'
  | 'step' | 'map'
  | 'alone' | 'with_others'
  | 'support' | 'discover'
  | 'bite' | 'session'

export type AxisKey = 'channel' | 'spark' | 'pace' | 'company' | 'scaffold' | 'dose'

export const AXES: { key: AxisKey; name: string; question: string; tint: string; stroke: string; poles: Pole[] }[] = [
  { key: 'channel',  name: 'Por dónde entra',  question: '¿Por dónde te entra mejor una idea nueva?', tint: 'bg-teal',   stroke: 'text-teal-500',   poles: ['see', 'listen', 'read', 'do'] },
  { key: 'spark',    name: 'Qué engancha',  question: '¿Qué te dan ganas de abrir?',                tint: 'bg-orange', stroke: 'text-orange-500', poles: ['challenge', 'story', 'game', 'real'] },
  { key: 'pace',     name: 'En qué orden',   question: '¿Cómo se te ordena la cabeza?',              tint: 'bg-blue',   stroke: 'text-cyan-500',   poles: ['step', 'map'] },
  { key: 'company',  name: 'Con quién',      question: '¿Solo o con gente?',                          tint: 'bg-lilac',  stroke: 'text-purple-500', poles: ['alone', 'with_others'] },
  { key: 'scaffold', name: 'Cuánta ayuda',   question: '¿Ejemplo primero o a probar?',                tint: 'bg-green',  stroke: 'text-teal-500',   poles: ['support', 'discover'] },
  { key: 'dose',     name: 'Cuánto de una',  question: '¿Ratos cortos o sesión larga?',               tint: 'bg-yellow', stroke: 'text-orange-500', poles: ['bite', 'session'] },
]

export const POLES: Record<Pole, { axis: AxisKey; name: string; micro: string; phrase: string }> = {
  see:         { axis: 'channel',  name: 'Ver',              micro: 'un dibujo, un esquema, un color',   phrase: 'viendo' },
  listen:      { axis: 'channel',  name: 'Escuchar',         micro: 'que alguien te lo cuente',          phrase: 'escuchando' },
  read:        { axis: 'channel',  name: 'Leer',             micro: 'texto corto y preciso',             phrase: 'leyendo' },
  do:          { axis: 'channel',  name: 'Hacer',            micro: 'tocar, mover, probar',              phrase: 'haciendo' },
  challenge:   { axis: 'spark',    name: 'Un reto',          micro: 'algo difícil, a ver si podés',      phrase: 'un buen reto' },
  story:       { axis: 'spark',    name: 'Una historia',     micro: 'que haya alguien y algo que pasa',  phrase: 'una buena historia' },
  game:        { axis: 'spark',    name: 'Un juego',         micro: 'puntos, niveles, reloj',            phrase: 'el juego' },
  real:        { axis: 'spark',    name: 'Algo real',        micro: 'que sirva para algo de verdad',     phrase: 'lo que sirve de verdad' },
  step:        { axis: 'pace',     name: 'Paso a paso',      micro: 'primero esto, después aquello',     phrase: 'paso a paso' },
  map:         { axis: 'pace',     name: 'El mapa primero',  micro: 'ver todo y después el detalle',     phrase: 'viendo el mapa entero' },
  alone:       { axis: 'company',  name: 'Solo',             micro: 'tu cabeza, tu ritmo',               phrase: 'a solas' },
  with_others: { axis: 'company',  name: 'Con otros',        micro: 'hablarlo, discutirlo, explicarlo',  phrase: 'con alguien al lado' },
  support:     { axis: 'scaffold', name: 'Con un ejemplo',   micro: 'ver uno resuelto antes',            phrase: 'con un ejemplo a mano' },
  discover:    { axis: 'scaffold', name: 'Descubriendo',     micro: 'probar y ver qué pasa',             phrase: 'probando por tu cuenta' },
  bite:        { axis: 'dose',     name: 'En ratos cortos',  micro: 'diez minutos y listo',              phrase: 'en ratos cortos' },
  session:     { axis: 'dose',     name: 'De una sentada',   micro: 'meterte y no salir',                phrase: 'de una sentada' },
}

export const BANDS: Record<string, string> = { small: 'Recién empieza', medium: 'Primaria', large: 'Secundaria o más' }

export type Performance = { pole: Pole; accuracy: number; delta: number; missions: number }

export type LiveProfile = {
  personId: string
  name?: string
  has: boolean
  band: '' | 'small' | 'medium' | 'large'
  declared: Record<string, number>
  observed: Record<string, number>
  profile: Record<string, number>
  weight: number
  missions: number
  strong: Performance[]
  weak: Performance[]
  updatedAt?: string
}

/** The pole that weighs most within an axis. */
export function dominant(p: Record<string, number>, axis: AxisKey): Pole {
  const a = AXES.find((x) => x.key === axis)!
  return a.poles.reduce((x, y) => ((p[y] ?? 0) > (p[x] ?? 0) ? y : x))
}

/** The poles running neck and neck at the top of an axis. A tie is not a preference. */
export function dominants(p: Record<string, number>, axis: AxisKey): Pole[] {
  const a = AXES.find((x) => x.key === axis)!
  const top = Math.max(...a.poles.map((k) => p[k] ?? 0))
  return a.poles.filter((k) => top - (p[k] ?? 0) < 0.06)
}

/** Is the axis split almost evenly? Then there is nothing to assert. */
export function even(p: Record<string, number>, axis: AxisKey): boolean {
  const a = AXES.find((x) => x.key === axis)!
  const vals = a.poles.map((k) => p[k] ?? 0)
  return Math.max(...vals) - Math.min(...vals) < 0.12
}

const joinWords = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0])

/** The one-line phrase that sums up the profile. It is built from the axes that do say something:
 *  if two poles tie, both are named; if the axis is even, nothing is said about it.
 *  The voice changes with who reads it: the learner reads themselves, the teacher reads someone else. */
export function headline(p: Record<string, number>, voice: 'you' | 'third' = 'you'): string {
  const phrase = (axis: AxisKey) => joinWords(dominants(p, axis).map((k) => POLES[k].phrase))
  const mine = voice === 'you'
  const parts: string[] = []
  parts.push(even(p, 'channel')
    ? (mine ? 'Aprendés de varias maneras parecidas' : 'Aprende de varias maneras parecidas')
    : `${mine ? 'Aprendés' : 'Aprende'} ${phrase('channel')}`)
  if (!even(p, 'spark')) parts.push(`${mine ? 'te' : 'le'} prende ${phrase('spark')}`)
  for (const axis of ['company', 'dose'] as const) if (!even(p, axis)) parts.push(phrase(axis))
  return parts.join(', ') + '.'
}

/** How much the profile can be trusted, in words. The voice changes with who looks at it. */
export function confidence(v: LiveProfile, voice: 'you' | 'third' = 'third'): { level: 'hunch' | 'lead' | 'backed'; text: string } {
  const mine = voice === 'you'
  if (v.missions < 3) {
    return { level: 'hunch', text: mine
      ? 'Por ahora esto es solo lo que elegiste recién. Con unas cuantas misiones se va a acomodar solo.'
      : 'Por ahora es lo que dijo de sí mismo. Con unas cuantas misiones más, se va a acomodar solo.' }
  }
  const n = `${v.missions} ${v.missions === 1 ? 'misión' : 'misiones'}`
  if (v.missions < 12) {
    return { level: 'lead', text: mine
      ? `Se está acomodando con lo que vas haciendo: ${n} hasta ahora.`
      : `Se está acomodando con lo que va haciendo: ${n} hasta ahora.` }
  }
  return { level: 'backed', text: `Sostenido por ${n} de trabajo real.` }
}
