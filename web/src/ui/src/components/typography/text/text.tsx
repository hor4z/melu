import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./text.module.css"

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "xs" | "sm" | "md"
  variant?: "default" | "muted" | "subtle" | "danger"
  weight?: "normal" | "medium" | "semibold"
  /** Render with the monospace font stack. */
  mono?: boolean
  /** Clip overflowing text to a single line with an ellipsis. */
  truncate?: boolean
  /** Render the single child element instead of a <p>, merging behavior. */
  asChild?: boolean
}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(
  ({ size = "md", variant = "default", weight = "normal", mono = false, truncate = false, asChild = false, className, ...props }, ref) => {
    const classes = cx(
      styles.text,
      styles[size],
      variant !== "default" && styles[variant],
      weight !== "normal" && styles[weight],
      mono && styles.mono,
      truncate && styles.truncate,
      className,
    )

    if (asChild) {
      return <Slot ref={ref as React.Ref<HTMLElement>} className={classes} {...props} />
    }

    return <p ref={ref} className={classes} {...props} />
  },
)

Text.displayName = "Text"
