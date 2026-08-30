import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./grid.module.css"

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of equal columns, or a raw `grid-template-columns` value. */
  columns?: number | string
  /** Gap between cells as a multiple of `--spacing`. */
  gap?: number
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  /** Render the single child element instead of a <div>, merging behavior. */
  asChild?: boolean
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ columns, gap = 2, align, asChild = false, className, style, ...props }, ref) => {
    const classes = cx(styles.grid, align && styles[`align-${align}`], className)
    const gridStyle = {
      gridTemplateColumns: typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns,
      gap: `calc(var(--spacing) * ${gap})`,
      ...style,
    }

    if (asChild) {
      return <Slot ref={ref as React.Ref<HTMLElement>} className={classes} style={gridStyle} {...props} />
    }

    return <div ref={ref} className={classes} style={gridStyle} {...props} />
  },
)

Grid.displayName = "Grid"

export interface GridSpanProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns this cell spans. */
  span?: number
}

export const GridSpan = forwardRef<HTMLDivElement, GridSpanProps>(({ span, className, style, ...props }, ref) => {
  const spanStyle = span !== undefined ? { gridColumn: `span ${span}`, ...style } : style

  return <div ref={ref} className={cx(styles.span, className)} style={spanStyle} {...props} />
})

GridSpan.displayName = "GridSpan"
