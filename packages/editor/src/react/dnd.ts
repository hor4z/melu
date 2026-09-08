// Arrastrar bloques, con eventos de puntero y nada más. Una librería habría sido lo obvio y es lo
// incorrecto: lo que hace falta no es "lista ordenable", es un destino que puede caer entre dos
// bloques o adentro de uno, a un nivel que elige cuánto se fue el puntero a la derecha.

import type { BlockId, Doc } from '../core/doc.ts'
import { childrenOf, flatten, isAncestor, parentOf } from '../core/doc.ts'
import { BLOCK_ATTR } from './dom.ts'

/** Where a drop would land. */
export type DropTarget = {
  parent: BlockId
  index: number
  /** What to draw: the line between two blocks, or the outline of the block it would go into. */
  hint: { kind: 'line'; x: number; y: number; width: number } | { kind: 'inside'; id: BlockId }
}

/** One rendered block and where it is on screen. */
type Placed = { id: BlockId; rect: DOMRect; depth: number }

/** Reads the blocks on screen once, at the start of a drag. */
export function measure(container: HTMLElement, doc: Doc): Placed[] {
  const order = flatten(doc)
  const out: Placed[] = []
  for (const id of order) {
    const el = container.querySelector<HTMLElement>(`[${BLOCK_ATTR}="${id.replace(/["\\]/g, '\\$&')}"]`)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (rect.height === 0) continue
    out.push({ id, rect, depth: depthOf(doc, id) })
  }
  return out
}

const depthOf = (doc: Doc, id: BlockId): number => {
  let n = 0
  let at = parentOf(doc, id)
  while (at && at !== doc.root) {
    n++
    at = parentOf(doc, at)
  }
  return n
}

/** How far right the pointer has to travel to mean one more level of nesting. */
const STEP = 28

/**
 * Dónde caería un arrastre. Se deciden dos cosas: en qué hueco (el borde más cercano, medido desde
 * el medio de cada bloque) y a qué nivel (cuánto se fue el puntero a la derecha, recortado a lo
 * que el documento permite). El bloque que se arrastra queda fuera de los candidatos.
 */
export function targetAt(
  doc: Doc,
  placed: readonly Placed[],
  dragging: BlockId,
  x: number,
  y: number,
  accepts: (parent: string, child: string) => boolean,
): DropTarget | null {
  const moving = doc.blocks[dragging]
  if (!moving) return null
  const candidates = placed.filter((p) => p.id !== dragging && !isAncestor(doc, dragging, p.id))
  if (candidates.length === 0) return null

  // El bloque cuyo borde queda más cerca verticalmente, y de qué lado del medio cayó el puntero.
  let best = candidates[0]!
  let bestDistance = Infinity
  let after = false
  for (const p of candidates) {
    const middle = p.rect.top + p.rect.height / 2
    const d = Math.abs(y - middle)
    if (d < bestDistance) {
      bestDistance = d
      best = p
      after = y > middle
    }
  }

  const type = moving.type

  // Sobre la mitad derecha de un contenedor vacío o abierto, el destino es adentro.
  const insideParent = best.id
  if (
    after &&
    accepts(doc.blocks[insideParent]?.type ?? '', type) &&
    x > best.rect.left + STEP &&
    childrenOf(doc, insideParent).length === 0
  ) {
    return { parent: insideParent, index: 0, hint: { kind: 'inside', id: insideParent } }
  }

  // Si no, entre dos bloques. El nivel sale de la x, y no puede pasarse del que permite el vecino.
  const anchor = best
  const wanted = Math.max(0, Math.round((x - anchor.rect.left) / STEP) + anchor.depth)
  let parent = after ? nextParentFor(doc, anchor.id, wanted) : parentOf(doc, anchor.id) ?? doc.root
  if (!accepts(doc.blocks[parent]?.type ?? (parent === doc.root ? 'doc' : ''), type) && parent !== doc.root) {
    parent = parentOf(doc, parent) ?? doc.root
  }

  // Si ni siquiera el abuelo lo acepta, no hay destino. Antes se devolvía igual: se dibujaba la
  // línea, la persona soltaba, y `moveBlock` decía que no en silencio. Mostrar dónde va a caer algo
  // que no va a caer es peor que no mostrar nada.
  if (!accepts(doc.blocks[parent]?.type ?? (parent === doc.root ? 'doc' : ''), type) && parent !== doc.root) return null

  const siblings = childrenOf(doc, parent)
  const anchorIndex = siblings.indexOf(anchor.id)
  const index =
    anchorIndex === -1
      ? after
        ? siblings.length
        : 0
      : anchorIndex + (after ? 1 : 0)

  const line = after ? anchor.rect.bottom : anchor.rect.top
  const indent = depthOf(doc, parent === doc.root ? anchor.id : parent) + (parent === doc.root ? 0 : 1)
  return {
    parent,
    index,
    hint: { kind: 'line', x: anchor.rect.left + (indent - anchor.depth) * STEP, y: line, width: anchor.rect.width },
  }
}

/** Un paso a la derecha de un bloque quiere decir "adentro"; más a la derecha no baja más. */
function nextParentFor(doc: Doc, anchor: BlockId, wantedDepth: number): BlockId {
  const own = depthOf(doc, anchor)
  if (wantedDepth > own) return anchor
  let parent = parentOf(doc, anchor) ?? doc.root
  let depth = own
  while (depth > wantedDepth && parent !== doc.root) {
    parent = parentOf(doc, parent) ?? doc.root
    depth--
  }
  return parent
}

/** Si el movimiento cambia algo. Soltar donde estaba no es un cambio y no va al historial. */
export function isRealMove(doc: Doc, id: BlockId, target: DropTarget): boolean {
  const parent = parentOf(doc, id)
  if (parent !== target.parent) return true
  const siblings = childrenOf(doc, target.parent)
  const now = siblings.indexOf(id)
  return target.index !== now && target.index !== now + 1
}
