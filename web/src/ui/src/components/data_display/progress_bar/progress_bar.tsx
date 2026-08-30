import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./progress_bar.module.css"

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Omit for an indeterminate sliding animation. */
  value?: number
  size?: "sm" | "md"
  variant?: "accent" | "success" | "danger"
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, size = "md", variant = "accent", className, ...props }, ref) => {
    const indeterminate = value === undefined
    const clamped = indeterminate ? undefined : Math.min(100, Math.max(0, value))

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className={cx(styles.track, styles[`size-${size}`], styles[variant], indeterminate && styles.indeterminate, className)}
        {...props}
      >
        <div className={styles.fill} style={indeterminate ? undefined : { width: `${clamped}%` }} />
      </div>
    )
  },
)

ProgressBar.displayName = "ProgressBar"
