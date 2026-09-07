/**
 * The activity plugin: the blocks that ask something of a learner.
 *
 * These are the block types the platform already has, and the shape is the same in all of them:
 * the prompt is the block's own rich text, and the answer is props. That split is deliberate. The
 * prompt gets bold, links, formulas and the "/" menu for free because it is text like any other
 * text; the answer gets validation, defaults and a manifest because it is declared props. Nothing
 * here knows how a question is drawn or graded, which stays where it already is: the grading maths
 * lives in Go so the number is the same whoever looks at it.
 *
 * This is also the file that shows what the extension point is worth. Everything below is data.
 */

import type { BlockSpec } from '../core/schema.ts'
import type { Plugin } from '../core/plugins.ts'
import type { Command } from '../core/commands.ts'
import { getBlock } from '../core/doc.ts'

/** Las mecánicas de juego que la plataforma sabe correr. */
export const GAME_ENGINES = ['sort', 'memory', 'time_attack'] as const
/** Las figuras que se manipulan arrastrando. */
export const FIGURES = ['number_line', 'fraction_bar', 'balance'] as const
/** Los tres medios de evidencia. */
export const EVIDENCE_MEDIA = ['photo', 'audio', 'file'] as const

/** Lo que toda pregunta comparte: la pista antes, la explicación después, el puntaje. */
const SHARED = {
  hint: { kind: 'text', label: 'Pista', hint: 'Se puede pedir antes de responder' },
  explanation: { kind: 'text', label: 'Explicación', hint: 'Se muestra después de responder' },
  points: { kind: 'number', default: 1, min: 0, max: 100, label: 'Puntos' },
  required: { kind: 'boolean', default: true, label: 'Hay que responderla' },
} as const

const ASK = {
  content: 'text',
  container: false,
  draggable: true,
  selectable: true,
  standalone: true,
  placeholder: 'Consigna',
  group: 'Preguntas',
  // Enter en una consigna no crea otra pregunta: crea el texto que la acompaña.
  split: { end: 'paragraph', middle: 'paragraph' },
} as const

export const activityBlocks: BlockSpec[] = [
  {
    ...ASK,
    type: 'choice',
    name: 'Opciones',
    hint: 'Varias tarjetas, una correcta',
    keywords: ['opcion', 'multiple', 'eleccion', 'una', 'correcta'],
    icon: 'choice',
    props: {
      ...SHARED,
      options: { kind: 'list', of: { kind: 'text' }, default: [[], []], label: 'Opciones' },
      correct: { kind: 'number', default: 0, min: 0, label: 'La correcta' },
      shuffle: { kind: 'boolean', default: false, label: 'Mezclar el orden' },
    },
  },
  {
    ...ASK,
    type: 'multi',
    name: 'Varias correctas',
    hint: 'Tarjetas donde más de una vale',
    keywords: ['varias', 'multiple', 'checkbox', 'muchas'],
    icon: 'multi',
    props: {
      ...SHARED,
      options: { kind: 'list', of: { kind: 'text' }, default: [[], []], label: 'Opciones' },
      correctMulti: { kind: 'list', of: { kind: 'number', min: 0 }, default: [], label: 'Las correctas' },
      shuffle: { kind: 'boolean', default: false, label: 'Mezclar el orden' },
    },
  },
  {
    ...ASK,
    type: 'number',
    name: 'Número',
    hint: 'Responde con un número, con tolerancia',
    keywords: ['numero', 'cantidad', 'medida', 'calculo', 'resultado'],
    icon: 'number',
    props: {
      ...SHARED,
      answer: { kind: 'number', default: 0, label: 'Respuesta' },
      // Cero quiere decir exacto. Una medida con regla nunca lo es, así que existe.
      tolerance: { kind: 'number', default: 0, min: 0, label: 'Tolerancia' },
      unit: { kind: 'string', default: '', label: 'Unidad' },
    },
  },
  {
    ...ASK,
    type: 'fill_in',
    name: 'Completar',
    hint: 'Una frase con huecos entre llaves dobles',
    keywords: ['completar', 'hueco', 'espacio', 'frase', 'rellenar'],
    icon: 'fillIn',
    placeholder: 'La capital de {{Francia}} es {{París}}',
    props: {
      ...SHARED,
      blanks: { kind: 'list', of: { kind: 'string' }, default: [], label: 'Lo que va en cada hueco' },
      caseSensitive: { kind: 'boolean', default: false, label: 'Distinguir mayúsculas' },
    },
  },
  {
    ...ASK,
    type: 'order',
    name: 'Ordenar',
    hint: 'Poner pasos o valores en orden',
    keywords: ['ordenar', 'secuencia', 'pasos', 'cronologia', 'arrastrar'],
    icon: 'order',
    props: {
      ...SHARED,
      items: { kind: 'list', of: { kind: 'string' }, default: ['', ''], label: 'En el orden correcto' },
    },
  },
  {
    ...ASK,
    type: 'match',
    name: 'Emparejar',
    hint: 'Unir cada cosa con su par',
    keywords: ['emparejar', 'unir', 'parejas', 'relacionar', 'columnas'],
    icon: 'match',
    props: {
      ...SHARED,
      pairs: { kind: 'list', of: { kind: 'json' }, default: [], label: 'Las parejas' },
    },
  },
  {
    ...ASK,
    type: 'question',
    name: 'Pregunta abierta',
    hint: 'Responde escribiendo; la mira el guía',
    keywords: ['pregunta', 'abierta', 'escribir', 'texto', 'desarrollo'],
    icon: 'question',
    props: {
      ...SHARED,
      // No se autocorrige: la mira una persona.
      points: { kind: 'number', default: 0, min: 0, max: 100, label: 'Puntos' },
      minWords: { kind: 'number', default: 0, min: 0, label: 'Mínimo de palabras' },
      rows: { kind: 'number', default: 3, min: 1, max: 20, label: 'Renglones' },
    },
  },
  {
    ...ASK,
    type: 'evidence',
    name: 'Evidencia',
    hint: 'Pide foto, audio o archivo',
    keywords: ['evidencia', 'foto', 'audio', 'archivo', 'subir', 'entrega'],
    icon: 'evidence',
    props: {
      ...SHARED,
      points: { kind: 'number', default: 0, min: 0, max: 100, label: 'Puntos' },
      media: { kind: 'string', options: EVIDENCE_MEDIA, default: 'photo', label: 'Qué se pide' },
      maxSeconds: { kind: 'number', default: 60, min: 5, max: 600, label: 'Máximo de audio (s)' },
    },
  },
  {
    ...ASK,
    type: 'self_report',
    name: 'Autoreporte',
    hint: 'Escala de 1 a 5, nunca se califica',
    keywords: ['autoreporte', 'escala', 'como', 'sentir', 'checkin'],
    icon: 'selfReport',
    props: {
      hint: SHARED.hint,
      required: SHARED.required,
      // Sin puntos a propósito: preguntarle a alguien cómo le fue no se corrige.
      low: { kind: 'string', default: 'Me costó', label: 'Extremo bajo' },
      high: { kind: 'string', default: 'Me salió', label: 'Extremo alto' },
      steps: { kind: 'number', default: 5, min: 3, max: 7, label: 'Puntos de la escala' },
    },
  },
  {
    ...ASK,
    type: 'game',
    name: 'Juego',
    hint: 'Una mecánica con tu contenido',
    keywords: ['juego', 'jugar', 'clasificar', 'memoria', 'contrarreloj'],
    icon: 'game',
    props: {
      ...SHARED,
      engine: { kind: 'string', options: GAME_ENGINES, default: 'sort', label: 'Mecánica' },
      categories: { kind: 'list', of: { kind: 'json' }, default: [], label: 'Cajas (clasificar)' },
      pairs: { kind: 'list', of: { kind: 'json' }, default: [], label: 'Parejas (memoria)' },
      questions: { kind: 'list', of: { kind: 'json' }, default: [], label: 'Preguntas (contrarreloj)' },
      seconds: { kind: 'number', default: 60, min: 10, max: 900, label: 'Tiempo (s)' },
    },
  },
  {
    ...ASK,
    type: 'manipulative',
    name: 'Figura',
    hint: 'Una recta, una barra o una balanza que se toca',
    keywords: ['figura', 'recta', 'fraccion', 'balanza', 'arrastrar', 'manipular'],
    icon: 'figure',
    props: {
      ...SHARED,
      figure: { kind: 'string', options: FIGURES, default: 'number_line', label: 'Qué figura' },
      min: { kind: 'number', default: 0, label: 'Desde' },
      max: { kind: 'number', default: 5, label: 'Hasta' },
      step: { kind: 'number', default: 0.25, min: 0.01, label: 'Paso' },
      answer: { kind: 'number', default: 2.5, label: 'Respuesta' },
      tolerance: { kind: 'number', default: 0, min: 0, label: 'Tolerancia' },
      parts: { kind: 'number', default: 4, min: 2, max: 24, label: 'Partes (fracción)' },
      coefA: { kind: 'number', default: 1, label: 'a (balanza)' },
      coefB: { kind: 'number', default: 0, label: 'b (balanza)' },
      coefC: { kind: 'number', default: 3, label: 'c (balanza)' },
    },
  },
]

/** Los tipos que la plataforma corrige sola, en el momento. */
export const SELF_GRADED = new Set(['choice', 'multi', 'number', 'fill_in', 'order', 'match', 'game', 'manipulative'])

/** Los que se llevan una pantalla propia en el modo paso a paso. */
export const INTERACTIVE = new Set(activityBlocks.map((b) => b.type))

// ---------------------------------------------------------------------------- commands

/** Agrega una opción a una pregunta de opciones o de varias correctas. */
const addOption: Command<{ id: string; text?: string }> = ({ tr }, { id, text = '' }) => {
  const b = getBlock(tr.doc, id)
  if (!b) return false
  const options = Array.isArray(b.props?.options) ? [...(b.props.options as unknown[])] : []
  options.push(text ? [{ text }] : [])
  tr.setProps(id, { options })
  return true
}

const removeOption: Command<{ id: string; index: number }> = ({ tr }, { id, index }) => {
  const b = getBlock(tr.doc, id)
  if (!b || !Array.isArray(b.props?.options)) return false
  const options = (b.props.options as unknown[]).filter((_, i) => i !== index)
  if (options.length < 2) return false
  const correct = typeof b.props.correct === 'number' ? b.props.correct : 0
  const correctMulti = Array.isArray(b.props.correctMulti) ? (b.props.correctMulti as number[]) : undefined
  tr.setProps(id, {
    options,
    // Los índices de lo correcto se corren con lo que se borró: si no, señalan a otra opción.
    correct: Math.max(0, correct > index ? correct - 1 : Math.min(correct, options.length - 1)),
    ...(correctMulti
      ? { correctMulti: correctMulti.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)) }
      : {}),
  })
  return true
}

/** Los huecos de un "completar" salen del texto: las llaves dobles son la fuente de verdad. */
export const blanksOf = (text: string): string[] => [...text.matchAll(/\{\{([^{}]*)\}\}/g)].map((m) => m[1] ?? '')

const syncBlanks: Command<{ id: string }> = ({ tr }, { id }) => {
  const b = getBlock(tr.doc, id)
  if (!b || b.type !== 'fill_in') return false
  const found = blanksOf((b.text ?? []).map((s) => s.text).join(''))
  const current = Array.isArray(b.props?.blanks) ? (b.props.blanks as string[]) : []
  if (found.length === current.length && found.every((x, i) => x === current[i])) return false
  tr.setProps(id, { blanks: found })
  return true
}

/**
 * A fill in the blank sentence carries its answers inside the text, so the props follow the text
 * and not the other way round. Typing another `{{hueco}}` is all it takes.
 */
const normalizeActivity: Plugin['normalize'] = ({ tr, touched }) => {
  for (const id of touched) {
    if (tr.doc.blocks[id]?.type === 'fill_in') syncBlanks({ state: tr.current, tr }, { id })
  }
}

export const activity = (): Plugin => ({
  name: 'activity',
  blocks: activityBlocks,
  normalize: normalizeActivity,
  commands: {
    addOption: addOption as Command<never>,
    removeOption: removeOption as Command<never>,
    syncBlanks: syncBlanks as Command<never>,
  },
})
