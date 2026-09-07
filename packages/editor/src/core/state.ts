/**
 * The state: the document, where the caret is, and the schema that explains both.
 *
 * It is one immutable value. Every change produces a new one, which is what makes undo cheap,
 * makes a render comparable by reference, and makes a bug reproducible from a single JSON dump.
 */

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
   * What the next character typed should be formatted as, when it is not simply what is to the
   * left. It is the answer to two things that otherwise feel wrong: pressing the bold shortcut on
   * an empty line and having the next word come out bold, and writing `**algo**` and having what
   * follows come out plain instead of staying bold forever.
   *
   * It is not part of the document, and it is dropped by the next change that does not set it.
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
