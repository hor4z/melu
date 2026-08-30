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
  useRole,
  useInteractions,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./tooltip.module.css"

export interface TooltipProps {
  content: React.ReactNode
  placement?: Placement
  /** Open delay in ms. */
  delay?: number
  children: React.ReactElement
}

export function Tooltip({ content, placement = "top", delay = 250, children }: TooltipProps) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, { move: false, delay: { open: delay, close: 60 } })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: "tooltip" })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

  return (
    <>
      {/* Slot merges the reference props with the child's own handlers/ref */}
      <Slot ref={refs.setReference as React.Ref<HTMLElement>} {...getReferenceProps()}>
        {children}
      </Slot>
      {open && content != null && (
        <FloatingPortal>
          <div ref={refs.setFloating} style={floatingStyles} className={cx(styles.tooltip)} {...getFloatingProps()}>
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

Tooltip.displayName = "Tooltip"
