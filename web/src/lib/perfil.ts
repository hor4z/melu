// El catálogo del perfil de aprendizaje. Es copy y colores: la matemática vive en Go
// (internal/app/perfil.go) para que el número sea el mismo lo mire el aprendiz o el docente.
//
// Nota importante, la misma que está en el backend: esto NO es un test de "estilos de
// aprendizaje". Los estilos como etiqueta fija no tienen respaldo. Acá hay dos cosas honestas:
// una preferencia que la persona declara, y un rendimiento que se mide con el trabajo real.
// El perfil es la mezcla, y se muestra siempre como "hoy".

export type Polo =
  | 'ver' | 'escuchar' | 'leer' | 'hacer'
  | 'reto' | 'historia' | 'juego' | 'real'
  | 'paso' | 'mapa'
  | 'solo' | 'conotros'
  | 'apoyo' | 'descubrir'
  | 'bocado' | 'sesion'

export type ClaveEje = 'canal' | 'chispa' | 'ritmo' | 'compania' | 'andamio' | 'dosis'

export const EJES: { clave: ClaveEje; nombre: string; pregunta: string; tinte: string; trazo: string; polos: Polo[] }[] = [
  { clave: 'canal',    nombre: 'Por dónde entra',  pregunta: '¿Por dónde te entra mejor una idea nueva?', tinte: 'bg-teal',   trazo: 'text-teal-500',   polos: ['ver', 'escuchar', 'leer', 'hacer'] },
  { clave: 'chispa',   nombre: 'Qué engancha',  pregunta: '¿Qué te dan ganas de abrir?',                tinte: 'bg-orange', trazo: 'text-orange-500', polos: ['reto', 'historia', 'juego', 'real'] },
  { clave: 'ritmo',    nombre: 'En qué orden',   pregunta: '¿Cómo se te ordena la cabeza?',              tinte: 'bg-blue',   trazo: 'text-cyan-500',   polos: ['paso', 'mapa'] },
  { clave: 'compania', nombre: 'Con quién',      pregunta: '¿Solo o con gente?',                          tinte: 'bg-lilac',  trazo: 'text-purple-500', polos: ['solo', 'conotros'] },
  { clave: 'andamio',  nombre: 'Cuánta ayuda',   pregunta: '¿Ejemplo primero o a probar?',                tinte: 'bg-green',  trazo: 'text-teal-500',   polos: ['apoyo', 'descubrir'] },
  { clave: 'dosis',    nombre: 'Cuánto de una',  pregunta: '¿Ratos cortos o sesión larga?',               tinte: 'bg-yellow', trazo: 'text-orange-500', polos: ['bocado', 'sesion'] },
]

export const POLOS: Record<Polo, { eje: ClaveEje; nombre: string; micro: string; frase: string }> = {
  ver:       { eje: 'canal',    nombre: 'Ver',              micro: 'un dibujo, un esquema, un color',   frase: 'viendo' },
  escuchar:  { eje: 'canal',    nombre: 'Escuchar',         micro: 'que alguien te lo cuente',          frase: 'escuchando' },
  leer:      { eje: 'canal',    nombre: 'Leer',             micro: 'texto corto y preciso',             frase: 'leyendo' },
  hacer:     { eje: 'canal',    nombre: 'Hacer',            micro: 'tocar, mover, probar',              frase: 'haciendo' },
  reto:      { eje: 'chispa',   nombre: 'Un reto',          micro: 'algo difícil, a ver si podés',      frase: 'un buen reto' },
  historia:  { eje: 'chispa',   nombre: 'Una historia',     micro: 'que haya alguien y algo que pasa',  frase: 'una buena historia' },
  juego:     { eje: 'chispa',   nombre: 'Un juego',         micro: 'puntos, niveles, reloj',            frase: 'el juego' },
  real:      { eje: 'chispa',   nombre: 'Algo real',        micro: 'que sirva para algo de verdad',     frase: 'lo que sirve de verdad' },
  paso:      { eje: 'ritmo',    nombre: 'Paso a paso',      micro: 'primero esto, después aquello',     frase: 'paso a paso' },
  mapa:      { eje: 'ritmo',    nombre: 'El mapa primero',  micro: 'ver todo y después el detalle',     frase: 'viendo el mapa entero' },
  solo:      { eje: 'compania', nombre: 'Solo',             micro: 'tu cabeza, tu ritmo',               frase: 'a solas' },
  conotros:  { eje: 'compania', nombre: 'Con otros',        micro: 'hablarlo, discutirlo, explicarlo',  frase: 'con alguien al lado' },
  apoyo:     { eje: 'andamio',  nombre: 'Con un ejemplo',   micro: 'ver uno resuelto antes',            frase: 'con un ejemplo a mano' },
  descubrir: { eje: 'andamio',  nombre: 'Descubriendo',     micro: 'probar y ver qué pasa',             frase: 'probando por tu cuenta' },
  bocado:    { eje: 'dosis',    nombre: 'En ratos cortos',  micro: 'diez minutos y listo',              frase: 'en ratos cortos' },
  sesion:    { eje: 'dosis',    nombre: 'De una sentada',   micro: 'meterte y no salir',                frase: 'de una sentada' },
}

export const BANDAS: Record<string, string> = { chico: 'Recién empieza', medio: 'Primaria', grande: 'Secundaria o más' }

export type Rendimiento = { polo: Polo; aciertos: number; diferencia: number; misiones: number }

export type PerfilVivo = {
  personaId: string
  nombre?: string
  tiene: boolean
  banda: '' | 'chico' | 'medio' | 'grande'
  declarado: Record<string, number>
  observado: Record<string, number>
  perfil: Record<string, number>
  peso: number
  misiones: number
  fuertes: Rendimiento[]
  flojos: Rendimiento[]
  actualizado?: string
}

/** El polo que más pesa dentro de un eje. */
export function dominante(p: Record<string, number>, eje: ClaveEje): Polo {
  const e = EJES.find((x) => x.clave === eje)!
  return e.polos.reduce((a, b) => ((p[b] ?? 0) > (p[a] ?? 0) ? b : a))
}

/** Los polos que van cabeza a cabeza arriba del eje. Un empate no se cuenta como preferencia. */
export function dominantes(p: Record<string, number>, eje: ClaveEje): Polo[] {
  const e = EJES.find((x) => x.clave === eje)!
  const top = Math.max(...e.polos.map((k) => p[k] ?? 0))
  return e.polos.filter((k) => top - (p[k] ?? 0) < 0.06)
}

/** ¿El eje está repartido casi en partes iguales? Entonces no hay nada que afirmar. */
export function parejo(p: Record<string, number>, eje: ClaveEje): boolean {
  const e = EJES.find((x) => x.clave === eje)!
  const vals = e.polos.map((k) => p[k] ?? 0)
  return Math.max(...vals) - Math.min(...vals) < 0.12
}

const unir = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0])

/** La frase de una línea que resume el perfil. Se arma con los ejes que sí dicen algo:
 *  si dos polos empatan, se nombran los dos; si el eje está parejo, no se dice nada de él.
 *  La voz cambia según quién lo lee: el aprendiz se lee a sí mismo, el docente lee a otro. */
export function titular(p: Record<string, number>, voz: 'vos' | 'tercera' = 'vos'): string {
  const frase = (eje: ClaveEje) => unir(dominantes(p, eje).map((k) => POLOS[k].frase))
  const mio = voz === 'vos'
  const partes: string[] = []
  partes.push(parejo(p, 'canal')
    ? (mio ? 'Aprendés de varias maneras parecidas' : 'Aprende de varias maneras parecidas')
    : `${mio ? 'Aprendés' : 'Aprende'} ${frase('canal')}`)
  if (!parejo(p, 'chispa')) partes.push(`${mio ? 'te' : 'le'} prende ${frase('chispa')}`)
  for (const eje of ['compania', 'dosis'] as const) if (!parejo(p, eje)) partes.push(frase(eje))
  return partes.join(', ') + '.'
}

/** Qué tanto se puede confiar en el perfil, en palabras. La voz cambia según quién lo mira. */
export function confianza(v: PerfilVivo, voz: 'vos' | 'tercera' = 'tercera'): { nivel: 'corazonada' | 'pista' | 'sostenido'; texto: string } {
  const mio = voz === 'vos'
  if (v.misiones < 3) {
    return { nivel: 'corazonada', texto: mio
      ? 'Por ahora esto es solo lo que elegiste recién. Con unas cuantas misiones se va a acomodar solo.'
      : 'Por ahora es lo que dijo de sí mismo. Con unas cuantas misiones más, se va a acomodar solo.' }
  }
  const n = `${v.misiones} ${v.misiones === 1 ? 'misión' : 'misiones'}`
  if (v.misiones < 12) {
    return { nivel: 'pista', texto: mio
      ? `Se está acomodando con lo que vas haciendo: ${n} hasta ahora.`
      : `Se está acomodando con lo que va haciendo: ${n} hasta ahora.` }
  }
  return { nivel: 'sostenido', texto: `Sostenido por ${n} de trabajo real.` }
}
