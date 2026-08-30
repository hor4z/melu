import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./status_dot.module.css"

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: "online" | "busy" | "away" | "offline" | "none"
  /** Diameter in px. */
  size?: number
  /** Subtle radiating pulse (disabled under prefers-reduced-motion). */
  pulse?: boolean
}

export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ status = "none", size = 8, pulse = false, className, style, ...props }, ref) => (
    <span
      ref={ref}
      aria-hidden="true"
      className={cx(styles.dot, styles[status], pulse && styles.pulse, className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  ),
)

StatusDot.displayName = "StatusDot"
