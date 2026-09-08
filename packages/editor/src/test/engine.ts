/**
 * Lo que hace legible a un test del motor, y que sólo tiene sentido corriendo en jsdom.
 *
 * Un test que arma un documento a mano se lee como un documento armado a mano, y el que lo lee
 * después no ve qué se estaba probando. Así que acá vive la forma corta de describir el contenido
 * (`doc('# Título', '- uno', '- dos')`, que es markdown) y de empujar el motor (`type`, `press`).
 *
 * La forma corta de leerlo de vuelta (`sketch`, `where`, `at`) está en `vocabulary.ts` y se
 * re-exporta acá: es la misma que corre en el navegador, y por eso no puede depender de nada de
 * esto. Para quien escribe un test no cambia nada, sigue importando todo de un solo lugar.
 *
 * Los editores de los tests van en `strict`: un documento inconsistente hace fallar el test que
 * lo produjo, y no uno cualquiera tres archivos más adelante.
 */

import { Editor, fromMarkdown, nameKey, normalizeKey, type BlockInit, type EditorOptions } from '../core/index.ts'
import { activityKit, basics } from '../plugins/index.ts'

export * from './vocabulary.ts'

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
