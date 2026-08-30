import React, { forwardRef } from "react"

const STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
}

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {}

/** Visually removed but available to assistive tech (labels, live regions). */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(({ style, ...props }, ref) => (
  <span ref={ref} style={{ ...STYLE, ...style }} {...props} />
))

VisuallyHidden.displayName = "VisuallyHidden"
