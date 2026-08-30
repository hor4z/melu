import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import styles from "./kbd.module.css"

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export const Kbd = forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => {
  return <kbd ref={ref} className={cx(styles.kbd, className)} {...props} />
})

Kbd.displayName = "Kbd"
