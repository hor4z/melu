import React, { forwardRef, isValidElement, cloneElement } from "react"
import { cx } from "../../../utils/cx"
import styles from "./button_icon.module.css"

const ICON_SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
}

export interface ButtonIconProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "neutral" | "secondary" | "tertiary" | "white" | "ghost"
  naked?: boolean
  outlined?: boolean
  /** Circular shape. */
  pill?: boolean
}

export const ButtonIcon = forwardRef<HTMLButtonElement, ButtonIconProps>(
  (
    {
      size = "md",
      variant = "primary",
      naked = false,
      outlined = false,
      pill = false,
      disabled = false,
      children,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const iconSize = ICON_SIZES[size]

    const renderedChildren = isValidElement<{ size?: number }>(children) ? cloneElement(children, { size: iconSize }) : children

    return (
      <button
        ref={ref}
        type="button"
        className={cx(
          styles["button-icon"],
          styles[`button-icon--${variant}`],
          styles[`button-icon--${size}`],
          pill && styles["button-icon--pill"],
          naked
            ? [styles["button-icon--naked"], styles[`button-icon--${variant}`]]
            : [styles[`button-icon--${variant}`], outlined && styles["button-icon--outlined"]],
          outlined && styles["button-icon--outlined"],
          disabled && styles["button-icon--disabled"],
          className,
        )}
        disabled={disabled}
        onClick={onClick}
        data-size={size}
        data-variant={variant}
        data-outlined={outlined}
        data-disabled={disabled}
        {...props}
      >
        <span aria-hidden="true">{renderedChildren}</span>
      </button>
    )
  },
)

ButtonIcon.displayName = "ButtonIcon"
