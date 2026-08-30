import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./separator.module.css"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  /** Purely decorative (removed from the a11y tree). */
  decorative?: boolean
}

export function Separator({ orientation = "horizontal", decorative = true, className, ...props }: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cx(styles.separator, styles[orientation], className)}
      {...props}
    />
  )
}

Separator.displayName = "Separator"
