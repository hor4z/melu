// El documento, dónde está el caret, y el schema que explica los dos. Un valor inmutable: cada
// cambio produce otro, y por eso un render se compara por referencia.

import type { Doc } from './doc.ts'
import { emptyDoc, materialize, setBlocks, type BlockInit } from './doc.ts'
import type { Schema } from './schema.ts'
import type { Selection } from './selection.ts'
import { caret, repair } from './selection.ts'
import type { Mark } from './text.ts'

export type EditorState = {
  readonly doc: Doc
  readonly selection: Selection
  readonly schema: Schema
  /**
   * Con qué formato sale la próxima letra, cuando no es simplemente el de la izquierda: el atajo
   * de negrita en una línea vacía, o seguir escribiendo después de `**algo**`. No es del
   * documento, y se descarta con el próximo cambio que no lo fije.
   */
  readonly storedMarks?: readonly Mark[] | null
}

export const stateOf = (doc: Doc, schema: Schema, selection: Selection = null): EditorState => ({
  doc,
  schema,
  selection: repair(doc, selection),
})

/** A state holding those blocks at the top level, with the caret in the first one. */
export function stateFrom(schema: Schema, blocks: readonly BlockInit[]): EditorState {
  let doc = emptyDoc()
  const ids: string[] = []
  for (const init of blocks) {
    const { blocks: made, id } = materialize(init, doc.root)
    doc = setBlocks(doc, made)
    ids.push(id)
  }
  doc = setBlocks(doc, [{ ...doc.blocks[doc.root]!, children: ids }])
  const first = ids[0]
  return { doc, schema, selection: first ? caret(first, 0) : null }
}

/** A state with one empty paragraph, which is what a new activity opens on. */
export const blankState = (schema: Schema, type = 'paragraph'): EditorState =>
  stateFrom(schema, [{ type, text: [] }])
