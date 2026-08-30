import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import styles from "./center.module.css"

export interface CenterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as inline-flex instead of a block-level flex container. */
  inline?: boolean
}

export const Center = forwardRef<HTMLDivElement, CenterProps>(({ inline = false, className, ...props }, ref) => {
  return <div ref={ref} className={cx(styles.center, inline && styles.inline, className)} {...props} />
})

Center.displayName = "Center"
