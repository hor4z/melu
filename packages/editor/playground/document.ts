/**
 * El documento con el que arranca el taller.
 *
 * No es un catálogo de bloques: es una actividad que una guía podría estar escribiendo de verdad,
 * con sus fases y su cierre. Se lee de corrido, y de paso toca los cuatro grupos y los once bloques
 * de pregunta, que son la razón de ser del package y lo que menos se mira.
 *
 * La prosa entra por markdown, que es la forma más corta de decirla. Lo que markdown no sabe decir
 * (una pregunta con sus props, un reloj, una fórmula) entra como JSON, que es lo que la plataforma
 * va a guardar igual.
 */

import { fromMarkdown, type BlockJSON } from '../src/index.ts'

/** Markdown a bloques, que es como se escribe la prosa acá adentro. */
export const md = (...lines: string[]): BlockJSON[] =>
  fromMarkdown(lines.join('\n')).map(function walk(b): BlockJSON {
    return {
      type: b.type,
      ...(b.text !== undefined ? { text: b.text } : {}),
      ...(b.props ? { props: b.props } : {}),
      ...(b.children?.length ? { children: b.children.map(walk) } : {}),
    }
  })

/** Un bloque suelto, con su texto como una sola tirada sin formato. */
const block = (type: string, text = '', props?: Record<string, unknown>): BlockJSON => ({
  type,
  ...(text ? { text: [{ text }] } : {}),
  ...(props ? { props } : {}),
})

/** Una pregunta: la consigna es texto y el resto son props. */
const ask = (type: string, consigna: string, props: Record<string, unknown> = {}): BlockJSON =>
  block(type, consigna, props)

/** Las opciones de un `choice` o un `multi` son texto con formato, no strings. */
const opciones = (...textos: string[]) => textos.map((t) => [{ text: t }])

export const ACTIVIDAD: BlockJSON[] = [
  ...md('# El patio en números'),
  block('callout', 'Dos clases de 45 minutos. La primera se sale al patio.', { emoji: '📐', tone: 'green' }),
  ...md(
    'Vamos a medir el patio **con pasos** y *con cinta métrica*, y después comparar las dos medidas.',
    '',
    '## Antes de salir',
    '',
    '- Cinta métrica de 5 metros',
    '- Tiza, para marcar dónde arranca cada medición',
    '- La planilla impresa',
    '',
    '- [x] Anotar la fecha',
    '- [ ] Cargar la tablet',
    '- [ ] Repartir los roles: quien camina, quien cuenta y quien anota',
  ),
  {
    type: 'toggle',
    text: [{ text: '¿Y si el patio no es un rectángulo?' }],
    children: [block('paragraph', 'Se parte en dos rectángulos, se mide cada uno y se suman las áreas.')],
  },
  block('timer', '', { seconds: 600, label: 'Salida al patio', chime: true }),

  ...md(
    '## Medir con el cuerpo',
    '',
    '1. Caminar el largo pisando talón con punta',
    '2. Contar los pasos en voz alta',
    '3. Anotar el número antes de olvidarlo',
  ),
  ask('number', '¿Cuántos pasos tuyos mide el largo del patio?', {
    answer: 24,
    tolerance: 3,
    unit: 'pasos',
    hint: [{ text: 'Si perdés la cuenta, volvé a empezar desde la pared.' }],
  }),
  ask('self_report', '¿Cómo te fue contando los pasos?', {
    low: 'Me costó',
    high: 'Me salió',
    steps: 5,
  }),

  ...md('## Medir con la cinta'),
  block('image', '', {
    src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=70',
    alt: 'El patio de una escuela, visto desde la puerta',
    caption: [{ text: 'El patio, desde la puerta del aula' }],
    width: 100,
  }),
  {
    type: 'table',
    props: { header: true },
    children: [
      { type: 'table_row', children: [block('table_cell', 'Lado'), block('table_cell', 'Pasos'), block('table_cell', 'Metros')] },
      { type: 'table_row', children: [block('table_cell', 'Largo'), block('table_cell'), block('table_cell')] },
      { type: 'table_row', children: [block('table_cell', 'Ancho'), block('table_cell'), block('table_cell')] },
    ],
  },
  ask('number', '¿Cuántos metros de largo tiene el patio?', {
    answer: 12.5,
    tolerance: 0.5,
    unit: 'm',
    explanation: [{ text: 'Nuestra medida fue 12,5 m. Medio metro de diferencia es esperable.' }],
  }),
  ask('choice', 'Si un paso tuyo mide 60 cm, ¿cuántos pasos entran en 12 metros?', {
    options: opciones('15', '20', '24', '30'),
    correct: 1,
  }),
  ask('multi', '¿Cuáles de estas medidas se pueden tomar con la cinta de 5 m sin moverla?', {
    options: opciones('El ancho de una baldosa', 'El largo del patio', 'El alto de la puerta', 'El perímetro entero'),
    correctMulti: [0, 2],
  }),
  // A propósito sin `blanks`: los calcula el normalizador al montar, y se ven aparecer solos.
  ask('fill_in', 'El área de un rectángulo se calcula multiplicando el {{largo}} por el {{ancho}}.'),
  ask('order', 'Ordená los pasos para calcular el área del patio', {
    items: ['Medir el largo', 'Medir el ancho', 'Multiplicar las dos medidas', 'Escribir el resultado en metros cuadrados'],
  }),
  ask('match', 'Uní cada cosa con la unidad en la que conviene medirla', {
    pairs: [
      { left: 'El patio', right: 'metros' },
      { left: 'Una baldosa', right: 'centímetros' },
      { left: 'La superficie', right: 'metros cuadrados' },
    ],
  }),

  {
    type: 'columns',
    children: [
      {
        type: 'column',
        children: [
          block('heading_3', 'Lo que esperamos'),
          block('paragraph', 'Que las dos medidas se parezcan, y que la diferencia se pueda explicar.'),
        ],
      },
      {
        type: 'column',
        children: [block('math', '', { latex: 'A = l \\times a' })],
      },
    ],
  },
  ...md(
    '> Medir es comparar con una unidad que elegimos nosotros.',
    '',
    '```python',
    'largo = 12.5',
    'ancho = 8.2',
    'print(round(largo * ancho, 1))',
    '```',
    '',
    '---',
    '',
    '## Para mostrar lo que hicieron',
  ),
  ask('evidence', 'Sacá una foto del patio con la cinta puesta a lo largo', { media: 'photo', points: 0 }),
  ask('question', '¿Por qué la medida en pasos no dio igual para todos?', { minWords: 25, rows: 4 }),
  block('callout', 'Cuando termines, subí la foto y avisale a tu guía.', { emoji: '✅', tone: 'blue' }),
]

/** Lo que escribe el botón del agente: un lote atómico, que entra con un solo deshacer. */
export const DEL_AGENTE = [
  '## Lo que escribió un agente',
  '',
  'Este pedazo entró por la misma puerta que un click, en una sola transacción.',
  '',
  '1. Contar los pasos del largo',
  '2. Contar los pasos del ancho',
].join('\n')

/** Una página en blanco, para empezar de cero sin recargar. */
export const VACIO: BlockJSON[] = md('')
