// Dónde va lo que flota. Acá todos usan una librería, y la librería resuelve un problema más
// difícil del que tenemos: un menú sobre una página de texto son tres reglas. Abajo del ancla, o
// arriba si no hay lugar; adentro de la ventana; y nunca tapándola.

export type Anchor = { top: number; left: number; right: number; bottom: number; width: number; height: number }

export type Placement = 'bottom-start' | 'bottom-center' | 'top-start' | 'top-center'

export type Placed = { top: number; left: number; placement: Placement; maxHeight: number }

export type PlaceOptions = {
  /** How far from the anchor. */
  gap?: number
  /** How close it may get to the edge of the window. */
  margin?: number
  placement?: Placement
}

export const rectOf = (el: Element): Anchor => {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
}

/** A zero size anchor at a point, for a menu opened by the keyboard at the caret. */
export const pointAnchor = (x: number, y: number, height = 0): Anchor => ({
  top: y,
  left: x,
  right: x,
  bottom: y + height,
  width: 0,
  height,
})

/**
 * Ubica una caja al lado del ancla. Nunca devuelve una posición fuera de la pantalla: si no cabe
 * abajo va arriba, y si no cabe de ningún lado dice cuánto lugar hay para que la caja scrollee.
 */
export function place(anchor: Anchor, size: { width: number; height: number }, opts: PlaceOptions = {}): Placed {
  const gap = opts.gap ?? 6
  const margin = opts.margin ?? 8
  const vw = typeof window === 'undefined' ? 1024 : window.innerWidth
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight

  const roomBelow = vh - anchor.bottom - gap - margin
  const roomAbove = anchor.top - gap - margin
  const wanted = opts.placement ?? 'bottom-start'
  const preferTop = wanted.startsWith('top')
  const centered = wanted.endsWith('center')

  const fitsBelow = size.height <= roomBelow
  const fitsAbove = size.height <= roomAbove
  const above = preferTop ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove

  const maxHeight = Math.max(120, above ? roomAbove : roomBelow)
  const top = above ? Math.max(margin, anchor.top - gap - Math.min(size.height, maxHeight)) : anchor.bottom + gap

  const rawLeft = centered ? anchor.left + anchor.width / 2 - size.width / 2 : anchor.left
  const left = Math.min(Math.max(margin, rawLeft), Math.max(margin, vw - size.width - margin))

  return {
    top,
    left,
    placement: above ? (centered ? 'top-center' : 'top-start') : centered ? 'bottom-center' : 'bottom-start',
    maxHeight,
  }
}

/** Turns viewport coordinates into coordinates relative to a positioned container. */
export const relativeTo = (container: Element, at: { top: number; left: number }) => {
  const box = container.getBoundingClientRect()
  return { top: at.top - box.top, left: at.left - box.left }
}
