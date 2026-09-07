// El único contenedor flotante, con lo que todo menú necesita y nadie quiere escribir cuatro
// veces: va donde cabe, cierra con Escape y con un click afuera, y no le roba la selección a la
// página, así que la barra de formato sigue sabiendo qué está formateando.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { place, type Anchor, type Placement } from './float.ts'

export type PopoverProps = {
  anchor: Anchor | null
  open: boolean
  onClose: () => void
  placement?: Placement
  gap?: number
  className?: string
  /** Whether Escape and a click outside should close it. On by default. */
  dismissable?: boolean
  /** Keeps the focus where it was: a format bar must not steal the caret. */
  keepFocus?: boolean
  role?: 'menu' | 'listbox' | 'dialog' | 'toolbar'
  'aria-label'?: string
  children: ReactNode
}

export function Popover({
  anchor,
  open,
  onClose,
  placement = 'bottom-start',
  gap,
  className,
  dismissable = true,
  keepFocus = false,
  role = 'menu',
  children,
  ...rest
}: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null)

  /**
   * Se mide en cada render y no solo al abrir: un menú que se filtra cambia de alto en cada letra.
   * Por `scrollHeight` y no `offsetHeight`, porque el alto máximo que este mismo cálculo escribe
   * recorta al segundo y los dos se perseguirían para siempre.
   */
  useLayoutEffect(() => {
    if (!open || !anchor) {
      if (pos !== null) setPos(null)
      return
    }
    const el = ref.current
    if (!el) return
    const size = { width: Math.max(el.offsetWidth, el.scrollWidth), height: Math.max(el.scrollHeight, el.offsetHeight) }
    const at = place(anchor, size, { placement, ...(gap === undefined ? {} : { gap }) })
    if (pos && pos.top === at.top && pos.left === at.left && pos.maxHeight === at.maxHeight) return
    setPos({ top: at.top, left: at.left, maxHeight: at.maxHeight })
  })

  useEffect(() => {
    if (!open || !dismissable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    // En captura: un menú tiene que cerrarse antes de que el click de afuera haga lo suyo.
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open, dismissable, onClose])

  if (!open || !anchor) return null

  return (
    <div
      ref={ref}
      className={['melu-pop', className].filter(Boolean).join(' ')}
      role={role}
      style={{
        top: pos?.top ?? anchor.bottom,
        left: pos?.left ?? anchor.left,
        maxHeight: pos?.maxHeight,
        // Invisible hasta estar medido: un cuadro de menú que salta se ve mal y se clickea peor.
        visibility: pos ? 'visible' : 'hidden',
      }}
      // Sin esto, apretar un botón de la barra de formato saca el caret del texto y no hay nada
      // que formatear cuando el click llega.
      onPointerDown={keepFocus ? (e) => e.preventDefault() : undefined}
      {...rest}
    >
      {children}
    </div>
  )
}
