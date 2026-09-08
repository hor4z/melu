// Lo que hace legible un test de la capa de vista: montar el editor, encontrar sus regiones
// editables, y poner el caret de verdad.

import { act, render } from '@testing-library/react'
import { BlockEditor } from '../BlockEditor.tsx'
import { fromMarkdown, type BlockJSON, type Editor } from '../core/index.ts'

export const json = (markdown: string): BlockJSON[] =>
  fromMarkdown(markdown).map(function walk(b): BlockJSON {
    return {
      type: b.type,
      ...(b.text !== undefined ? { text: b.text } : {}),
      ...(b.props ? { props: b.props } : {}),
      ...(b.children?.length ? { children: b.children.map(walk) } : {}),
    }
  })

/**
 * Monta el editor y devuelve el motor, que es con lo que se afirma.
 *
 * El contenido va en markdown, que es la forma corta; los bloques que el markdown no sabe decir
 * (un marcador, una imagen con sus props) se pasan armados.
 */
export function mount(content: string | BlockJSON[], props: Partial<Parameters<typeof BlockEditor>[0]> = {}) {
  let editor!: Editor
  const view = render(
    <BlockEditor
      value={typeof content === 'string' ? json(content) : content}
      strict
      toolbox={false}
      aria-label="El contenido"
      onReady={(e) => {
        editor = e
      }}
      {...props}
    />,
  )
  return { editor, view }
}

/** Las regiones editables, en orden. No hay un rol único: un título es un título. */
export const blocks = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-melu-text]')]

/**
 * Pone el caret de verdad: en el DOM y en el modelo.
 *
 * En el navegador la selección del modelo sale de la del DOM, no al revés, y todo lo que flota
 * (la barra de formato, el menú) se ubica midiendo dónde está el caret. Un test que solo mueve el
 * modelo prueba media costura, así que acá se mueven las dos.
 */
export function caretTo(editor: Editor, index: number, from: number, to = from) {
  const el = blocks()[index]!
  const node = el.firstChild?.firstChild ?? el
  const max = node.nodeType === 3 ? (node as Text).length : 0
  // El foco primero: enfocar un editable mueve la selección al principio, así que ponerla antes
  // sería ponerla para que se la lleve el foco. En el navegador un click hace las dos a la vez.
  el.focus()
  const range = document.createRange()
  range.setStart(node, Math.min(from, max))
  range.setEnd(node, Math.min(to, max))
  const sel = document.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  const id = editor.doc.blocks[editor.doc.root]!.children[index]!
  act(() => {
    editor.setSelection({ kind: 'text', anchor: { block: id, offset: from }, head: { block: id, offset: to } })
  })
}
