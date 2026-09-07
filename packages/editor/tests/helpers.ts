/**
 * Lo que hace legible a un test del motor.
 *
 * Un test que arma un documento a mano se lee como un documento armado a mano, y el que lo lee
 * después no ve qué se estaba probando. Así que acá viven dos cosas: una forma corta de describir
 * el contenido (`doc('# Título', '- uno', '- dos')`, que es markdown) y una forma corta de leerlo
 * de vuelta (`sketch(editor)`, que devuelve el tipo y el texto de cada bloque).
 *
 * Los editores de los tests van en `strict`: un documento inconsistente hace fallar el test que
 * lo produjo, y no uno cualquiera tres archivos más adelante.
 */

import { Editor, fromMarkdown, nameKey, normalizeKey, plain, type BlockInit, type EditorOptions, type Selection } from '../src/core/index.ts'
import { activityKit, basics } from '../src/plugins/index.ts'

/** Un editor con los plugins de escritura, sin las preguntas. */
export const makeEditor = (blocks?: readonly BlockInit[], opts: Partial<EditorOptions> = {}) =>
  new Editor({ plugins: basics(), strict: true, ...(blocks ? { blocks } : {}), ...opts })

/** Un editor con todo, preguntas incluidas. */
export const makeFullEditor = (blocks?: readonly BlockInit[], opts: Partial<EditorOptions> = {}) =>
  new Editor({ plugins: activityKit(), strict: true, ...(blocks ? { blocks } : {}), ...opts })

/** Contenido escrito como markdown, que es la forma más corta de decir un documento. */
export const doc = (...lines: string[]): BlockInit[] => fromMarkdown(lines.join('\n'))

/** Un editor cuyo contenido se describe en markdown. */
export const editorWith = (...lines: string[]) => makeEditor(doc(...lines))

/** Los bloques de arriba, como `tipo: texto`. Es lo que se compara en casi todos los tests. */
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

/** Escribe texto carácter por carácter, corriendo las reglas de entrada como al tipear. */
export function type(editor: Editor, text: string): void {
  for (const ch of text) {
    editor.run('insertText', { text: ch })
    editor.applyInputRules()
  }
}

/**
 * Aprieta una tecla, con la notación de los bindings.
 *
 * "Mod" es Cmd en una Mac y Ctrl en el resto, así que el evento se arma probando las dos y
 * quedándose con la que el motor nombra igual que lo pedido. Si no, la mitad de los atajos
 * fallaría en el CI y andaría en la máquina de alguien, que es la peor forma de fallar.
 */
export function press(editor: Editor, key: string): boolean {
  const parts = key.split('-')
  const last = parts.pop() ?? ''
  const base = {
    key: last,
    shiftKey: parts.includes('Shift'),
    altKey: parts.includes('Alt'),
  }
  const wanted = normalizeKey(key)
  for (const mod of [{ ctrlKey: true, metaKey: false }, { ctrlKey: false, metaKey: true }]) {
    const event = { ...base, ...(parts.includes('Mod') ? mod : { ctrlKey: parts.includes('Ctrl'), metaKey: parts.includes('Meta') }) }
    if (nameKey(event) === wanted) return editor.handleKey(event)
  }
  return editor.handleKey({ ...base, ctrlKey: parts.includes('Mod') || parts.includes('Ctrl'), metaKey: parts.includes('Meta') })
}

/** El texto de un bloque por posición. */
export const textAt = (editor: Editor, n: number): string => plain(editor.block(at(editor, n))?.text)

/** Las props de un bloque por posición. */
export const propsAt = (editor: Editor, n: number) => editor.block(at(editor, n))?.props ?? {}

/** El tipo de un bloque por posición. */
export const typeAt = (editor: Editor, n: number): string => editor.block(at(editor, n))?.type ?? ''
