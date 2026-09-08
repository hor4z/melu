// La traducción entre el DOM y el modelo: todo el riesgo de un editor, en un archivo.
//
// Un `contenteditable` por bloque, y además uno envolviendo la página, que es lo que hace Notion.
// El de afuera es el que manda: por spec, un editable adentro de otro no abre una región nueva, así
// que abajo hay una sola y la selección nativa cruza de un bloque a otro. Los de adentro siguen
// sirviendo para enfocar un bloque y para que un widget se declare no editable.
//
// El precio es que el navegador también puede *editar* cruzando, y eso no puede pasar: lo que cruce
// un borde lo cancela `Surface` en `beforeinput` y lo aplica por comandos.
//
// Los offsets se leen recorriendo nodos de texto y no confiando en el markup: el navegador pone un
// nodo donde quiere mientras alguien escribe.

import type { Mark, RichText } from '../core/text.ts'
import { normalize } from '../core/text.ts'

/** Marks the editable region of a block. */
export const TEXT_ATTR = 'data-melu-text'
/** Marks a block wrapper, and carries its id. */
export const BLOCK_ATTR = 'data-melu-block'
/** Carries the marks of a run, so what the browser types inside it keeps its formatting. */
export const MARKS_ATTR = 'data-melu-marks'

/**
 * Lo que es control y no texto: una viñeta, un checkbox, un asa, un menú.
 *
 * Hay que decirlo dos veces y por eso está junto. Al motor, para que no lo lea como parte del texto
 * del bloque. Y al navegador, porque ahora la región editable envuelve la página entera: sin esto
 * el caret se mete adentro de una viñeta y lo que se escriba ahí no es de nadie.
 */
export const SKIP = {
  'data-melu-skip': 'true',
  contentEditable: false,
  suppressContentEditableWarning: true,
  /**
   * Y no arrastrable, que es la parte que no se ve venir: adentro de una región editable, Chrome
   * hace arrastrable por defecto todo lo que se declara no editable. Sin esto, apretar el asa y
   * mover arranca el arrastre nativo del navegador, que se come los eventos de puntero, y el
   * arrastre del editor queda colgado con el cursor de agarre pegado hasta recargar la página.
   */
  draggable: false,
} as const

export const blockRoot = (node: Node | null): HTMLElement | null => {
  const el = node instanceof Element ? node : node?.parentElement
  return el?.closest(`[${BLOCK_ATTR}]`) ?? null
}

export const blockIdOf = (node: Node | null): string | null => blockRoot(node)?.getAttribute(BLOCK_ATTR) ?? null

export const textRoot = (node: Node | null): HTMLElement | null => {
  const el = node instanceof Element ? node : node?.parentElement
  return el?.closest(`[${TEXT_ATTR}]`) ?? null
}

/** The editable region belonging to a block, skipping the ones of nested blocks. */
export function textRootOf(container: ParentNode, id: string): HTMLElement | null {
  const block = container.querySelector<HTMLElement>(`[${BLOCK_ATTR}="${cssEscape(id)}"]`)
  if (!block) return null
  const own = block.querySelector<HTMLElement>(`[${TEXT_ATTR}]`)
  // El de un bloque anidado no cuenta: tiene que ser el del bloque pedido.
  return own && blockRoot(own) === block ? own : null
}

/** `CSS.escape` where it exists, and enough of it where it does not (jsdom in a test run). */
const cssEscape = (s: string) =>
  typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&')

/** The text nodes of a region, in order, stopping at nested blocks. */
export function textNodesOf(root: HTMLElement): Text[] {
  const out: Text[] = []
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        out.push(child as Text)
      } else if (child.nodeType === 1) {
        const el = child as Element
        // Un bloque anidado tiene su propia región: su texto no es de este bloque.
        if (el.hasAttribute(BLOCK_ATTR) || el.hasAttribute('data-melu-skip')) continue
        if (el.tagName === 'BR') out.push(document.createTextNode('') as Text)
        walk(el)
      }
    }
  }
  walk(root)
  return out
}

/** The offset inside a block that a DOM position corresponds to. */
export function offsetFromDom(root: HTMLElement, node: Node, offset: number): number {
  // Una posición sobre el elemento y no sobre un texto: cuenta lo que hay antes de ese hijo.
  if (node === root || node.nodeType === 1) {
    const kids = [...(node.childNodes ?? [])]
    const before = kids.slice(0, offset)
    let n = 0
    for (const k of before) n += lengthOfNode(k)
    return node === root ? n : offsetFromDom(root, node.parentNode ?? root, indexOfNode(node)) + n
  }
  let total = 0
  for (const text of textNodesOf(root)) {
    if (text === node) return total + Math.min(offset, text.length)
    total += text.length
  }
  return total
}

const indexOfNode = (node: Node) => [...(node.parentNode?.childNodes ?? [])].indexOf(node as ChildNode)

function lengthOfNode(node: Node): number {
  if (node.nodeType === 3) return (node as Text).length
  if (node.nodeType !== 1) return 0
  const el = node as Element
  if (el.hasAttribute(BLOCK_ATTR) || el.hasAttribute('data-melu-skip')) return 0
  let n = 0
  for (const k of el.childNodes) n += lengthOfNode(k)
  return n
}

/** Where in the DOM a model offset lands. */
export function domFromOffset(root: HTMLElement, offset: number): { node: Node; offset: number } {
  const nodes = textNodesOf(root).filter((t) => t.parentNode)
  if (nodes.length === 0) return { node: root, offset: 0 }
  let left = offset
  for (const text of nodes) {
    if (left <= text.length) return { node: text, offset: Math.max(0, left) }
    left -= text.length
  }
  const last = nodes[nodes.length - 1]!
  return { node: last, offset: last.length }
}

/**
 * Lee el texto de vuelta del DOM, con su formato. Corre después de que el navegador insertó la
 * letra: ya está ahí, con su acento compuesto, y solo falta averiguar qué fue. Las marcas salen
 * del run donde se escribió.
 */
export function readText(root: HTMLElement): RichText {
  const out: { text: string; marks?: Mark[] }[] = []
  const walk = (node: Node, marks: Mark[] | undefined) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        const text = (child as Text).data
        if (text !== '') out.push(marks ? { text, marks: [...marks] } : { text })
        continue
      }
      if (child.nodeType !== 1) continue
      const el = child as Element
      if (el.hasAttribute(BLOCK_ATTR) || el.hasAttribute('data-melu-skip')) continue
      if (el.tagName === 'BR') {
        // Un salto que puso el navegador con Shift+Enter es un renglón dentro del mismo bloque.
        out.push({ text: '\n' })
        continue
      }
      walk(el, readMarks(el) ?? marks)
    }
  }
  walk(root, undefined)
  // El navegador deja un solo `br` en una región vacía: eso no es un renglón, es nada.
  if (out.length === 1 && out[0]!.text === '\n' && root.textContent === '') return []
  return normalize(out)
}

/** The marks written on an element by the renderer, or undefined when it carries none. */
export function readMarks(el: Element): Mark[] | undefined {
  const raw = el.getAttribute(MARKS_ATTR)
  if (raw === null) return undefined
  if (raw === '') return []
  try {
    const parsed = JSON.parse(raw) as Mark[]
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

export const writeMarks = (marks: readonly Mark[] | undefined): string => JSON.stringify(marks ?? [])

// ---------------------------------------------------------------------------- selection

export type DomPoint = { block: string; offset: number }
export type DomRange = { anchor: DomPoint; head: DomPoint }

/**
 * Qué dice el navegador que está seleccionado, en los términos del modelo. Los dos extremos por
 * separado y sin ordenar: una selección hecha para arriba tiene que seguir estando para arriba, y
 * puede tener cada punta en un bloque distinto.
 */
export function readSelection(container: HTMLElement): DomRange | null {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !sel.focusNode) return null
  if (!container.contains(sel.anchorNode) || !container.contains(sel.focusNode)) return null
  const anchor = pointFromDom(sel.anchorNode, sel.anchorOffset)
  const head = pointFromDom(sel.focusNode, sel.focusOffset)
  return anchor && head ? { anchor, head } : null
}

/** Un extremo de la selección del navegador, como bloque y offset. */
function pointFromDom(node: Node, offset: number): DomPoint | null {
  const id = blockIdOf(node)
  if (!id) return null
  const root = textRoot(node)
  // Una punta parada sobre un bloque sin texto (una imagen, un separador) no tiene offset: cuenta
  // como el principio de ese bloque, que es lo que hace que el rango lo incluya.
  if (!root || blockIdOf(root) !== id) return { block: id, offset: 0 }
  return { block: id, offset: offsetFromDom(root, node, offset) }
}

/** El offset del caret adentro de una región, o null si el caret está en otro lado. */
export function offsetOfCaret(root: HTMLElement): number | null {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.focusNode) return null
  if (!root.contains(sel.focusNode)) return null
  return offsetFromDom(root, sel.focusNode, sel.focusOffset)
}

/**
 * Pone en el DOM un rango que cruza bloques. Ningún bloque puede hacerlo solo, porque cada punta
 * está en otro: lo hace la superficie, que los ve a los dos.
 */
export function placeRange(container: HTMLElement, anchor: DomPoint, head: DomPoint): void {
  const from = textRootOf(container, anchor.block)
  const to = textRootOf(container, head.block)
  if (!from || !to) return
  const a = domFromOffset(from, anchor.offset)
  const h = domFromOffset(to, head.offset)
  try {
    document.getSelection()?.setBaseAndExtent(a.node, a.offset, h.node, h.offset)
  } catch {
    /* el documento cambió abajo del rango: el próximo render lo acomoda */
  }
}

/**
 * Trae el foco al editor, sin mover la página.
 *
 * Es la superficie y no un bloque: la región editable es una sola, así que enfocar el elemento de
 * un bloque termina enfocándola a ella igual. Dónde queda el caret lo dice el modelo, y de ponerlo
 * se encarga el bloque cuando se dibuja.
 */
export function focusSurface(container: HTMLElement): void {
  if (container.contains(document.activeElement)) return
  container.focus({ preventScroll: true })
}

// ---------------------------------------------------------------------------- geometry

/** Qué offset hay bajo un punto. Lo usan las flechas, para caer en la misma columna del de arriba. */
export function offsetAtPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = root.ownerDocument
  type WithCaret = Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const d = doc as WithCaret
  if (d.caretPositionFromPoint) {
    const pos = d.caretPositionFromPoint(x, y)
    if (pos && root.contains(pos.offsetNode)) return offsetFromDom(root, pos.offsetNode, pos.offset)
  }
  if (d.caretRangeFromPoint) {
    const range = d.caretRangeFromPoint(x, y)
    if (range && root.contains(range.startContainer)) return offsetFromDom(root, range.startContainer, range.startOffset)
  }
  return null
}

/** Qué hay bajo un punto. Null sin geometría, así un arrastre no queda colgado a mitad de camino. */
export const elementAtPoint = (x: number, y: number): Element | null =>
  typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null

/**
 * Dónde está el caret, para ubicar lo que flota. Devuelve null en lugar de tirar: esto corre desde
 * un aviso de cambio, y un throw ahí se llevaría a los demás suscriptores.
 */
export function caretRect(): DOMRect | null {
  try {
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
    const rect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null
    if (rect && (rect.width || rect.height)) return rect
    // Un caret colapsado al principio de un renglón mide cero: se pregunta por el nodo.
    const el = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
    return el?.getBoundingClientRect() ?? rect
  } catch {
    return null
  }
}
