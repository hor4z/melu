// La única forma en que cambia un documento. Un paso es JSON (lo puede mandar un agente),
// determinista (no acuña ids, así que se puede repetir) e invertible (de ahí sale deshacer, sin
// guardar una copia del documento por tecla).

import type { Block, BlockId, Doc, Props } from './doc.ts'
import { childrenOf, dropBlocks, has, isAncestor, setBlock, setBlocks, subtree } from './doc.ts'
import type { RichText } from './text.ts'

export type Step =
  /** Puts an already built subtree under `parent` at `index`. */
  | { op: 'insert'; id: BlockId; parent: BlockId; index: number; blocks: Block[] }
  /** Takes the subtree rooted at `id` out of the document. */
  | { op: 'remove'; id: BlockId }
  /** Detaches `id` and puts it back under `parent` at `index`, counted after the detach. */
  | { op: 'move'; id: BlockId; parent: BlockId; index: number }
  /** Changes the type, optionally replacing the props in the same breath. */
  | { op: 'setType'; id: BlockId; type: string; props?: Props | null }
  /** Replaces the text. */
  | { op: 'setText'; id: BlockId; text: RichText }
  /** Merges a patch into the props. A key set to null is deleted. */
  | { op: 'setProps'; id: BlockId; props: Props }

/** `touched` lists the blocks whose object changed, so the view re-renders only those. */
export type StepResult = { doc: Doc; inverse: Step[]; touched: BlockId[] }

/** Thrown when a step cannot be applied. Callers treat it as "the command did not run". */
export class StepError extends Error {}

const clampIndex = (n: number, max: number) => (n < 0 ? max : Math.min(Math.max(0, Math.trunc(n)), max))

/** Children of `parent` with `id` spliced in at `index`. */
function linkChild(doc: Doc, parent: BlockId, id: BlockId, index: number): Doc {
  const p = doc.blocks[parent]
  if (!p) throw new StepError(`no existe el padre ${parent}`)
  const kids = [...p.children]
  kids.splice(clampIndex(index, kids.length), 0, id)
  return setBlock(doc, { ...p, children: kids })
}

/** Children of `parent` without `id`. */
function unlinkChild(doc: Doc, parent: BlockId, id: BlockId): Doc {
  const p = doc.blocks[parent]
  if (!p) return doc
  const kids = p.children.filter((c) => c !== id)
  return kids.length === p.children.length ? doc : setBlock(doc, { ...p, children: kids })
}

export function applyStep(doc: Doc, step: Step): StepResult {
  switch (step.op) {
    case 'insert': {
      if (has(doc, step.id)) throw new StepError(`el bloque ${step.id} ya existe`)
      if (!has(doc, step.parent)) throw new StepError(`no existe el padre ${step.parent}`)
      const root = step.blocks.find((b) => b.id === step.id)
      if (!root) throw new StepError(`el paso no trae el bloque ${step.id}`)
      // El padre del raíz del subárbol lo fija el paso, no lo que venga escrito en el bloque.
      const wired = step.blocks.map((b) => (b.id === step.id ? { ...b, parent: step.parent } : b))
      const withBlocks = setBlocks(doc, wired)
      const next = linkChild(withBlocks, step.parent, step.id, step.index)
      return {
        doc: next,
        inverse: [{ op: 'remove', id: step.id }],
        touched: [step.parent, ...step.blocks.map((b) => b.id)],
      }
    }

    case 'remove': {
      const b = doc.blocks[step.id]
      if (!b) throw new StepError(`no existe el bloque ${step.id}`)
      if (step.id === doc.root) throw new StepError('la raíz no se borra')
      const ids = subtree(doc, step.id)
      const blocks = ids.map((id) => doc.blocks[id]!).map((x) => ({ ...x }))
      const parent = b.parent!
      const index = childrenOf(doc, parent).indexOf(step.id)
      const unlinked = unlinkChild(doc, parent, step.id)
      return {
        doc: dropBlocks(unlinked, ids),
        inverse: [{ op: 'insert', id: step.id, parent, index, blocks }],
        touched: [parent, ...ids],
      }
    }

    case 'move': {
      const b = doc.blocks[step.id]
      if (!b) throw new StepError(`no existe el bloque ${step.id}`)
      if (step.id === doc.root) throw new StepError('la raíz no se mueve')
      if (!has(doc, step.parent)) throw new StepError(`no existe el padre ${step.parent}`)
      // Un bloque dentro de sí mismo desconecta su propio subárbol del documento.
      if (step.parent === step.id || isAncestor(doc, step.id, step.parent))
        throw new StepError(`${step.id} no puede colgar de sí mismo`)
      const oldParent = b.parent!
      const oldIndex = childrenOf(doc, oldParent).indexOf(step.id)
      const detached = unlinkChild(doc, oldParent, step.id)
      const linked = linkChild(detached, step.parent, step.id, step.index)
      const next = setBlock(linked, { ...linked.blocks[step.id]!, parent: step.parent })
      return {
        doc: next,
        inverse: [{ op: 'move', id: step.id, parent: oldParent, index: oldIndex }],
        touched: [step.id, step.parent, oldParent],
      }
    }

    case 'setType': {
      const b = doc.blocks[step.id]
      if (!b) throw new StepError(`no existe el bloque ${step.id}`)
      const inverse: Step[] = [
        { op: 'setType', id: step.id, type: b.type, props: step.props !== undefined ? (b.props ?? null) : undefined },
      ]
      const props = step.props === undefined ? b.props : (step.props ?? undefined)
      const next: Block = { ...b, type: step.type, ...(props === undefined ? {} : { props }) }
      if (props === undefined) delete next.props
      return { doc: setBlock(doc, next), inverse, touched: [step.id] }
    }

    case 'setText': {
      const b = doc.blocks[step.id]
      if (!b) throw new StepError(`no existe el bloque ${step.id}`)
      return {
        doc: setBlock(doc, { ...b, text: step.text }),
        inverse: [{ op: 'setText', id: step.id, text: b.text ?? [] }],
        touched: [step.id],
      }
    }

    case 'setProps': {
      const b = doc.blocks[step.id]
      if (!b) throw new StepError(`no existe el bloque ${step.id}`)
      const before: Props = {}
      const after: Props = { ...b.props }
      for (const [key, value] of Object.entries(step.props)) {
        // El inverso guarda `null` para las claves que no estaban: así borrarlas es reversible.
        before[key] = Object.hasOwn(after, key) ? after[key] : null
        if (value === null) delete after[key]
        else after[key] = value
      }
      const next: Block = { ...b, props: after }
      if (Object.keys(after).length === 0) delete next.props
      return { doc: setBlock(doc, next), inverse: [{ op: 'setProps', id: step.id, props: before }], touched: [step.id] }
    }
  }
}

/** Applies a list of steps in order, gathering the inverse already reversed for undo. */
export function applySteps(doc: Doc, steps: readonly Step[]): StepResult {
  let at = doc
  const inverse: Step[] = []
  const touchedIds = new Set<BlockId>()
  for (const s of steps) {
    const r = applyStep(at, s)
    at = r.doc
    inverse.unshift(...r.inverse)
    for (const id of r.touched) touchedIds.add(id)
  }
  return { doc: at, inverse, touched: [...touchedIds] }
}

/** Whether a step only rewrites text, which is what lets typing coalesce in the history. */
export const isTextOnly = (steps: readonly Step[]): boolean => steps.every((s) => s.op === 'setText')
