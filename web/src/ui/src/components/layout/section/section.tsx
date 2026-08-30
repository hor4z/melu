import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import styles from "./section.module.css"

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Vertical padding scale. */
  size?: "sm" | "md" | "lg"
}

export const Section = forwardRef<HTMLElement, SectionProps>(({ size = "md", className, ...props }, ref) => {
  return <section ref={ref} className={cx(styles.section, styles[size], className)} {...props} />
})

Section.displayName = "Section"
