import React, { forwardRef, useEffect, useRef } from "react"
import { composeRefs } from "./compose_refs"
import { Slot } from "./slot"

// Global stack so only the topmost layer reacts to Escape / outside pointerdown.
const layerStack: HTMLElement[] = []

export interface DismissableLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  /** Called on Escape while this is the topmost layer. */
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  /** Called on pointerdown outside the layer. */
  onPointerDownOutside?: (event: PointerEvent) => void
  /** When true, outside pointerdown does NOT dismiss (Escape still does). */
  disableOutsideDismiss?: boolean
  /** Convenience: fired for either dismissal reason. */
  onDismiss?: () => void
}

/**
 * A layer that dismisses on Escape (topmost only) or on outside pointerdown.
 * Composable via `asChild`. Callbacks are kept in refs so the layer registers
 * once per mount — re-renders never reorder the layer stack.
 */
export const DismissableLayer = forwardRef<HTMLDivElement, DismissableLayerProps>(
  ({ asChild = false, onEscapeKeyDown, onPointerDownOutside, onDismiss, disableOutsideDismiss = false, ...props }, forwardedRef) => {
    const nodeRef = useRef<HTMLDivElement | null>(null)

    // latest-value refs: consumers pass inline arrows; re-registering the
    // listeners (and re-pushing onto layerStack) every render would corrupt
    // the stack order and churn document listeners.
    const callbacks = useRef({ onEscapeKeyDown, onPointerDownOutside, onDismiss, disableOutsideDismiss })
    callbacks.current = { onEscapeKeyDown, onPointerDownOutside, onDismiss, disableOutsideDismiss }

    useEffect(() => {
      const node = nodeRef.current
      if (!node) return
      layerStack.push(node)

      const isTopmost = () => layerStack[layerStack.length - 1] === node

      const onPointerDown = (event: PointerEvent) => {
        if (!isTopmost()) return
        if (node.contains(event.target as Node)) return
        callbacks.current.onPointerDownOutside?.(event)
        if (!event.defaultPrevented && !callbacks.current.disableOutsideDismiss) callbacks.current.onDismiss?.()
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || !isTopmost()) return
        callbacks.current.onEscapeKeyDown?.(event)
        if (!event.defaultPrevented) callbacks.current.onDismiss?.()
      }

      document.addEventListener("pointerdown", onPointerDown)
      document.addEventListener("keydown", onKeyDown)

      return () => {
        document.removeEventListener("pointerdown", onPointerDown)
        document.removeEventListener("keydown", onKeyDown)
        const i = layerStack.indexOf(node)
        if (i >= 0) layerStack.splice(i, 1)
      }
    }, [])

    const Comp = asChild ? Slot : "div"
    return <Comp ref={composeRefs(forwardedRef, nodeRef)} {...props} />
  },
)

DismissableLayer.displayName = "DismissableLayer"
