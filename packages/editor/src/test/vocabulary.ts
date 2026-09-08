/**
 * El vocabulario con el que se afirma, y lo único que las dos capas de tests comparten.
 *
 * Un test que arma un documento a mano se lee como un documento armado a mano, y el que lo lee
 * después no ve qué se estaba probando. Así que todo lo que se afirma pasa por acá: `sketch` para
 * el contenido, `where` para el caret, y una forma corta de nombrar un bloque por su posición de
 * lectura, que es como se los cuenta al leerlos.
 *
 * Está aparte de `engine.ts` por una razón concreta: acá adentro no hay nada de jsdom, ni de
 * vitest, ni plugins. Son funciones puras de un `Editor`, así que **las mismas** corren en el
 * navegador, colgadas de `window.taller` por el taller. Un test de Playwright afirma con el mismo
 * `sketch` que uno de jsdom, y no con una copia que se va a desincronizar en tres semanas.
 */

import { plain, type Editor, type Props, type Selection } from '../core/index.ts'

/** Los bloques de arriba abajo, como `tipo: texto`. Es lo que se compara en casi todos los tests. */
export function sketch(editor: Editor, parent = editor.doc.root, depth = 0): string[] {
  const out: string[] = []
  for (const id of editor.doc.blocks[parent]?.children ?? []) {
    const b = editor.doc.blocks[id]!
    const text = plain(b.text)
    out.push(`${'  '.repeat(depth)}${b.type}${text ? `: ${text}` : ''}`)
    out.push(...sketch(editor, id, depth + 1))
  }
  return out
}

/** Lo mismo pero sin el texto: la forma del documento cuando lo que importa es la estructura. */
export const outline = (editor: Editor): string[] => sketch(editor).map((line) => line.replace(/:.*$/, ''))

/** Los ids de arriba a abajo, para poder nombrar bloques sin guardarlos al crearlos. */
export function ids(editor: Editor, parent = editor.doc.root): string[] {
  const out: string[] = []
  for (const id of editor.doc.blocks[parent]?.children ?? []) {
    out.push(id, ...ids(editor, id))
  }
  return out
}

/** El id del bloque en la posición `n` del orden de lectura. */
export const at = (editor: Editor, n: number): string => {
  const id = ids(editor)[n]
  if (!id) throw new Error(`no hay bloque en la posición ${n} (hay ${ids(editor).length})`)
  return id
}

/** Deja el caret en un bloque y un offset, por posición de lectura. */
export function caretAt(editor: Editor, n: number, offset = 0): string {
  const id = at(editor, n)
  editor.setSelection({ kind: 'text', anchor: { block: id, offset }, head: { block: id, offset } })
  return id
}

/** Deja seleccionado un rango de texto, que puede empezar en un bloque y terminar en otro. */
export function selectRange(editor: Editor, from: [number, number], to: [number, number]): void {
  editor.setSelection({
    kind: 'text',
    anchor: { block: at(editor, from[0]), offset: from[1] },
    head: { block: at(editor, to[0]), offset: to[1] },
  })
}

/** Deja seleccionados bloques enteros, por posición. */
export function selectBlocks(editor: Editor, ...positions: number[]): void {
  const chosen = positions.map((n) => at(editor, n))
  editor.setSelection({ kind: 'blocks', ids: chosen, anchor: chosen[0] ?? '' })
}

/** Dónde está el caret, como `posición:offset`, para poder afirmarlo en una línea. */
export function where(editor: Editor): string {
  const sel: Selection = editor.selection
  if (!sel) return 'sin selección'
  const order = ids(editor)
  if (sel.kind === 'blocks') return `bloques ${sel.ids.map((id) => order.indexOf(id)).join(',')}`
  const i = order.indexOf(sel.head.block)
  const anchor = order.indexOf(sel.anchor.block)
  const head = `${i}:${sel.head.offset}`
  return anchor === i && sel.anchor.offset === sel.head.offset ? head : `${anchor}:${sel.anchor.offset}-${head}`
}

/** El texto de un bloque por posición. */
export const textAt = (editor: Editor, n: number): string => plain(editor.block(at(editor, n))?.text)

/** Las props de un bloque por posición. */
export const propsAt = (editor: Editor, n: number): Props => editor.block(at(editor, n))?.props ?? {}

/** El tipo de un bloque por posición. */
export const typeAt = (editor: Editor, n: number): string => editor.block(at(editor, n))?.type ?? ''

/** Las marcas de cada run de un bloque, para afirmar el formato sin mirar el DOM. */
export const marksAt = (editor: Editor, n: number): string[] =>
  (editor.block(at(editor, n))?.text ?? []).map((run) =>
    (run.marks ?? []).map((m) => ('value' in m && m.value ? `${m.type}:${m.value}` : m.type)).join('+'),
  )

/**
 * El vocabulario atado a un editor concreto, para colgarlo de `window` en el taller.
 *
 * Es la bisagra entre las dos capas: del otro lado, un helper de Playwright hace
 * `page.evaluate(() => window.taller.sketch())` y recibe exactamente lo mismo que afirma un test de
 * jsdom. Todo lo que devuelve es serializable a JSON, porque tiene que cruzar esa frontera.
 */
export const vocabulary = (editor: Editor) => ({
  sketch: () => sketch(editor),
  outline: () => outline(editor),
  where: () => where(editor),
  textAt: (n: number) => textAt(editor, n),
  propsAt: (n: number) => propsAt(editor, n),
  typeAt: (n: number) => typeAt(editor, n),
  marksAt: (n: number) => marksAt(editor, n),
  idAt: (n: number) => at(editor, n),
  /** Sube en cada transacción: es la condición que espera un test en lugar de esperar milisegundos. */
  version: () => editor.version,
  caretAt: (n: number, offset = 0) => void caretAt(editor, n, offset),
  selectRange: (from: [number, number], to: [number, number]) => selectRange(editor, from, to),
  selectBlocks: (...positions: number[]) => selectBlocks(editor, ...positions),
})

export type Vocabulary = ReturnType<typeof vocabulary>
