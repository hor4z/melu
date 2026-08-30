import React, { forwardRef, isValidElement, cloneElement } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import { Spinner } from "../../data_display/spinner/spinner"
import styles from "./button.module.css"

const ICON_SIZES = {
  sm: 12,
  md: 14,
  lg: 16,
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "neutral" | "secondary" | "tertiary" | "white" | "ghost" | "destructive"
  outlined?: boolean
  /** Fully rounded (pill) shape. */
  pill?: boolean
  /** Stretch to fill the container width. */
  block?: boolean
  /** Shows a spinner and disables interaction. */
  loading?: boolean
  /** Render the single child element instead of a <button>, merging behavior. */
  asChild?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      size = "md",
      variant = "primary",
      outlined = false,
      pill = false,
      block = false,
      loading = false,
      asChild = false,
      disabled = false,
      startIcon,
      endIcon,
      children,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const iconSize = ICON_SIZES[size]
    const isDisabled = disabled || loading

    const renderIcon = (icon: React.ReactNode, side: "left" | "right") => {
      if (!isValidElement<{ size?: number }>(icon)) return null

      return (
        <span className={styles[`button__icon--${side}`]} aria-hidden="true">
          {cloneElement(icon, { size: iconSize })}
        </span>
      )
    }

    const classes = cx(
      styles.button,
      styles[`button--${variant}`],
      outlined && styles["button--outlined"],
      pill && styles["button--pill"],
      block && styles["button--block"],
      styles[`button--${size}`],
      isDisabled && styles["button--disabled"],
      loading && styles["button--loading"],
      className,
    )

    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={classes}
          onClick={
            ((e: React.MouseEvent<HTMLElement>) => {
              // non-button elements don't honor `disabled` — gate here
              if (isDisabled) {
                e.preventDefault()
                return
              }
              ;(onClick as React.MouseEventHandler<HTMLElement> | undefined)?.(e)
            }) as React.MouseEventHandler<HTMLElement>
          }
          aria-disabled={isDisabled || undefined}
          aria-busy={loading || undefined}
          data-size={size}
          data-variant={variant}
          data-disabled={isDisabled}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        className={classes}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        onClick={onClick}
        data-size={size}
        data-variant={variant}
        data-outlined={outlined}
        data-disabled={isDisabled}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : renderIcon(startIcon, "left")}
        {children}
        {!loading && renderIcon(endIcon, "right")}
      </button>
    )
  },
)

Button.displayName = "Button"
