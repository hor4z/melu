import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./spinner.module.css"

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg"
  label?: string
}

export function Spinner({ size = "md", label = "Cargando", className, ...props }: SpinnerProps) {
  return <span role="status" aria-label={label} className={cx(styles.spinner, styles[size], className)} {...props} />
}

Spinner.displayName = "Spinner"
