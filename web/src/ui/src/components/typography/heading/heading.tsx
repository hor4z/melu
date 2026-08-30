import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./heading.module.css"

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
type HeadingSize = "sm" | "md" | "lg" | "xl" | "display"

const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = {
  1: "display",
  2: "xl",
  3: "lg",
  4: "md",
  5: "sm",
  6: "sm",
}

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level (renders h1..h6). */
  level?: HeadingLevel
  /** Visual size, independent of the semantic level. Defaults from `level`. */
  size?: HeadingSize
  /** Render the single child element instead of a heading, merging behavior. */
  asChild?: boolean
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(({ level = 2, size, asChild = false, className, ...props }, ref) => {
  const classes = cx(styles.heading, styles[size ?? DEFAULT_SIZE[level]], className)

  if (asChild) {
    return <Slot ref={ref as React.Ref<HTMLElement>} className={classes} {...props} />
  }

  const Tag = `h${level}` as const
  return <Tag ref={ref} className={classes} {...props} />
})

Heading.displayName = "Heading"
