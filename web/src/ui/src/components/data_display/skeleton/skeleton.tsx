import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./skeleton.module.css"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string
  height?: number | string
  /** Border radius; defaults to the control radius. Pass "full" for a circle. */
  radius?: number | string | "full"
}

export function Skeleton({ width, height, radius, className, style, ...props }: SkeletonProps) {
  const borderRadius = radius === "full" ? "9999px" : radius
  return <div aria-hidden="true" className={cx(styles.skeleton, className)} style={{ width, height, borderRadius, ...style }} {...props} />
}

Skeleton.displayName = "Skeleton"
