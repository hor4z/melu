import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import styles from "./code.module.css"

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {}

export const Code = forwardRef<HTMLElement, CodeProps>(({ className, ...props }, ref) => {
  return <code ref={ref} className={cx(styles.code, className)} {...props} />
})

Code.displayName = "Code"
