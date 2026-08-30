import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./stack.module.css"

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column"
  /** Gap between items as a multiple of `--spacing`. */
  gap?: number
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between" | "around"
  wrap?: boolean
  /** Render the single child element instead of a <div>, merging behavior. */
  asChild?: boolean
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ direction = "column", gap = 2, align, justify, wrap = false, asChild = false, className, style, ...props }, ref) => {
    const classes = cx(
      styles.stack,
      styles[direction],
      align && styles[`align-${align}`],
      justify && styles[`justify-${justify}`],
      wrap && styles.wrap,
      className,
    )
    const stackStyle = { gap: `calc(var(--spacing) * ${gap})`, ...style }

    if (asChild) {
      return <Slot ref={ref as React.Ref<HTMLElement>} className={classes} style={stackStyle} {...props} />
    }

    return <div ref={ref} className={classes} style={stackStyle} {...props} />
  },
)

Stack.displayName = "Stack"

export type HStackProps = Omit<StackProps, "direction">

export const HStack = forwardRef<HTMLDivElement, HStackProps>((props, ref) => {
  return <Stack ref={ref} direction="row" {...props} />
})

HStack.displayName = "HStack"

export type VStackProps = Omit<StackProps, "direction">

export const VStack = forwardRef<HTMLDivElement, VStackProps>((props, ref) => {
  return <Stack ref={ref} direction="column" {...props} />
})

VStack.displayName = "VStack"
