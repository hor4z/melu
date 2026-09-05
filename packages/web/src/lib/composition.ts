// The catalog of the six axes. It is content, not logic: changing it touches no component.
// Keys are technical (they travel to the database); labels are copy and stay in Spanish.
export const EXPERIENCES: Record<string, string> = {
  practice: 'Práctica', challenge: 'Reto', research: 'Investigación', build: 'Construcción',
  game: 'Juego', real_mission: 'Misión real', creation: 'Creación', debate: 'Debate',
  experiment: 'Experimento', simulation: 'Simulación', checkin: 'Check-in',
}
export const SETTINGS: Record<string, string> = {
  screen: 'Pantalla', paper: 'Papel', kit: 'Kit / materiales', printer_3d: 'Impresora 3D',
  street: 'Patio / calle', home: 'Casa', kitchen: 'Cocina', robot: 'Robot',
}
export const SOCIAL: Record<string, string> = {
  alone: 'Solo', pair: 'En pareja', team: 'En equipo', whole_group: 'Grupo entero', across_groups: 'Entre grupos', family: 'Con la familia',
}
export const EVIDENCE: Record<string, string> = {
  answer: 'Respuesta', photo: 'Foto', audio: 'Audio 60 s', file: 'Archivo / STL / código',
  observation: 'Rúbrica de observación', peer_review: 'Coevaluación', self_report: 'Autoreporte',
}

export const BLOCK_TYPES: Record<string, { name: string; hint: string; semantic: boolean; grades?: boolean }> = {
  paragraph:   { name: 'Texto',        hint: 'Consigna, contexto, explicación', semantic: false },
  heading:     { name: 'Título',       hint: 'Separa partes dentro de una fase', semantic: false },
  list:        { name: 'Lista',        hint: 'Pasos o materiales, uno por línea', semantic: false },
  callout:     { name: 'Destacado',    hint: 'Algo que no se puede pasar por alto', semantic: false },
  choice:      { name: 'Opciones',     hint: 'Varias tarjetas, una correcta', semantic: true, grades: true },
  multi:       { name: 'Varias correctas', hint: 'Tarjetas donde más de una vale', semantic: true, grades: true },
  number:      { name: 'Número',       hint: 'Responde con un número, con tolerancia', semantic: true, grades: true },
  fill_in:     { name: 'Completar',    hint: 'Una frase con huecos entre {{ }}', semantic: true, grades: true },
  order:       { name: 'Ordenar',      hint: 'Poner pasos o valores en orden', semantic: true, grades: true },
  match:       { name: 'Emparejar',    hint: 'Unir cada cosa con su par', semantic: true, grades: true },
  question:    { name: 'Pregunta',     hint: 'Responde escribiendo; la mira el docente', semantic: true },
  evidence:    { name: 'Evidencia',    hint: 'Pide foto, audio o archivo', semantic: true },
  self_report: { name: 'Autoreporte',  hint: 'Escala de 1 a 5, nunca se califica', semantic: true },
  game:        { name: 'Juego',        hint: 'Una mecánica con tu contenido', semantic: true, grades: true },
  manipulative:{ name: 'Figura',       hint: 'Una recta, una barra o una balanza que se toca', semantic: true, grades: true },
  check:       { name: 'Opciones',     hint: 'Varias tarjetas, una correcta', semantic: true, grades: true },
}

/** The ones the system can grade on its own, on the spot. */
export const SELF_GRADED = (t: string) => Boolean(BLOCK_TYPES[t]?.grades)
/** The ones that take a screen of their own in step-by-step mode. */
export const IS_INTERACTIVE = (t: string) => Boolean(BLOCK_TYPES[t]?.semantic)

export const labelOf = (cat: Record<string, string>, k?: string) => (k ? cat[k] ?? k : undefined)

/** Games are mechanics: you pick one and load your content into it, like Genially templates. */
export const GAMES: Record<string, { name: string; hint: string; emoji: string }> = {
  sort:        { name: 'Clasificar',   hint: 'Arrastrar cada cosa a su caja', emoji: '🗂️' },
  memory:      { name: 'Memoria',      hint: 'Dar vuelta cartas y encontrar las parejas', emoji: '🃏' },
  time_attack: { name: 'Contrarreloj', hint: 'Varias preguntas contra el reloj', emoji: '⏱️' },
}

/** Drawn figures you manipulate: the idea lands by moving it. */
export const FIGURES: Record<string, { name: string; hint: string; emoji: string }> = {
  number_line:  { name: 'Recta numérica', hint: 'Arrastrar un punto hasta el valor', emoji: '📏' },
  fraction_bar: { name: 'Barra de fracción', hint: 'Pintar las partes que se piden', emoji: '🟦' },
  balance:      { name: 'Balanza', hint: 'Equilibrar una ecuación probando valores', emoji: '⚖️' },
}

/** Qué organiza un espacio. La clave viaja a la base (ver el check de `spaces.kind`). */
export const SPACE_KINDS: Record<string, string> = {
  personal: 'Soy yo', tutoring: 'Apoyo / refuerzo', club: 'Club / taller', school: 'Escuela',
}

/** Los tres medios de evidencia, con su etiqueta. La clave viaja a la base; el texto se muestra. */
export const EVIDENCE_MEDIA: Record<string, string> = { photo: 'foto', audio: 'audio', file: 'archivo' }
