import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./button_group.module.css"

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fused look — children share borders and only the outer corners are rounded. false = plain gap row. */
  attached?: boolean
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(({ attached = true, className, ...props }, ref) => (
  <div ref={ref} role="group" className={cx(styles.group, attached ? styles.attached : styles.detached, className)} {...props} />
))

ButtonGroup.displayName = "ButtonGroup"
