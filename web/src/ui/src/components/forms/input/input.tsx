import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./input.module.css"

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  startIcon?: React.ReactElement<{ size?: number | string }>
  endIcon?: React.ReactElement<{ size?: number | string }>
  error?: boolean | string
}

export function Input({ startIcon, endIcon, className, error = false, disabled = false, id, ...props }: InputProps) {
  const errorId = typeof error === "string" && id ? `${id}-error` : undefined

  return (
    <div className={cx(className, styles.input, { [styles.input_error]: !!error })}>
      {startIcon && (
        <span className={cx(styles.input_icon, { [styles.disabled]: disabled })} aria-hidden="true">
          {startIcon}
        </span>
      )}

      <input
        id={id}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={cx(styles.input_field, { [styles.disabled]: disabled })}
        {...props}
      />
      {endIcon && (
        <span className={cx(styles.input_icon, { [styles.disabled]: disabled })} aria-hidden="true">
          {endIcon}
        </span>
      )}
      {typeof error === "string" && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}

Input.displayName = "Input"
