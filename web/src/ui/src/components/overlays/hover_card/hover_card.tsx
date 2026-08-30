import React, { useState } from "react"
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useFocus,
  useDismiss,
  useInteractions,
  safePolygon,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./hover_card.module.css"

export interface HoverCardProps {
  /** Rich content to reveal. Unlike Tooltip it is interactive (hoverable). */
  content: React.ReactNode
  placement?: Placement
  openDelay?: number
  closeDelay?: number
  children: React.ReactElement
}

/** Rich preview shown on hover/focus of the trigger. Interactive content. */
export function HoverCard({ content, placement = "bottom", openDelay = 350, closeDelay = 150, children }: HoverCardProps) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, {
    delay: { open: openDelay, close: closeDelay },
    handleClose: safePolygon(),
  })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss])

  return (
    <>
      {/* Slot merges the reference props with the child's own handlers/ref */}
      <Slot ref={refs.setReference as React.Ref<HTMLElement>} {...getReferenceProps()}>
        {children}
      </Slot>
      {open && (
        <FloatingPortal>
          <div ref={refs.setFloating} style={floatingStyles} className={cx(styles.card)} {...getFloatingProps()}>
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

HoverCard.displayName = "HoverCard"
