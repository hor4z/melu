import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./badge.module.css"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  show?: boolean
  color?: string
  offset?: [number, number]
}

export function Badge({ children, show = true, color, offset, className, style, ...props }: BadgeProps) {
  if (!show) return <>{children}</>

  return (
    <span className={cx(styles.badge, className)} {...props}>
      {children}
      <span
        className={styles.circle}
        style={{
          backgroundColor: color,
          transform: offset ? `translate(calc(50% + ${offset[0]}px), calc(-50% + ${offset[1]}px))` : undefined,
          ...style,
        }}
      />
    </span>
  )
}

Badge.displayName = "Badge"
