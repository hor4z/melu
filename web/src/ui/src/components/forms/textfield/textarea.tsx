import React, { useState } from "react"
import { cx } from "../../../utils/cx"
import styles from "./textarea.module.css"

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  /** Invalid state; pass a string to also render the message under the field. */
  error?: boolean | string
  maxHeight?: number
  disabled?: boolean
  rows?: number
  maxLength?: number
  /** Renders a character counter bottom-right inside the field (pairs with maxLength). */
  showCount?: boolean
}

export function Textarea({
  className,
  disabled = false,
  error = false,
  maxHeight = 500,
  rows = 3,
  maxLength,
  showCount = false,
  style,
  id,
  value,
  defaultValue,
  onChange,
  ...props
}: TextareaProps) {
  const [uncontrolledLength, setUncontrolledLength] = useState(() => String(defaultValue ?? "").length)
  const isControlled = value !== undefined
  const length = isControlled ? String(value ?? "").length : uncontrolledLength
  const overLimit = maxLength !== undefined && length >= maxLength

  const errorId = typeof error === "string" && id ? `${id}-error` : undefined

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) setUncontrolledLength(e.target.value.length)
    onChange?.(e)
  }

  return (
    <div className={cx(styles.root, className)}>
      <div className={cx(styles.textarea, { [styles.textarea_error]: !!error })}>
        <textarea
          id={id}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={errorId}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={cx(styles.textarea_input, { [styles.disabled]: disabled, [styles.has_count]: showCount })}
          style={{ maxHeight, ...style }}
          {...props}
        />
        {showCount && (
          <span className={cx(styles.count, { [styles.count_over]: overLimit })} aria-hidden="true">
            {maxLength !== undefined ? `${length}/${maxLength}` : length}
          </span>
        )}
      </div>
      {typeof error === "string" && (
        <span id={errorId} role="alert" className={styles.error_message}>
          {error}
        </span>
      )}
    </div>
  )
}
