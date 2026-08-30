import React, { useId } from "react"
import { cx } from "../../../utils/cx"
import { Checkbox, type CheckboxProps } from "../checkbox/checkbox"
import styles from "./checkbox_list.module.css"

export interface CheckboxListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label rendered above the items. */
  label?: React.ReactNode
  /** Appends a " · Required" hint after the group label. */
  required?: boolean
  /** Group description rendered under the label. */
  description?: React.ReactNode
  /** Error message pill rendered under the items (role=alert). */
  error?: React.ReactNode
}

export function CheckboxList({ label, required = false, description, error, className, children, ...props }: CheckboxListProps) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`
  const errorId = `${baseId}-error`

  const describedBy = [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined

  return (
    <div
      role="group"
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={cx(styles.list, className)}
      {...props}
    >
      {label && (
        <span id={labelId} className={styles.groupLabel}>
          {label}
          {required && <span className={styles.requiredMark}> · Required</span>}
        </span>
      )}
      {description && (
        <span id={descriptionId} className={styles.groupDescription}>
          {description}
        </span>
      )}
      {children}
      {error && (
        <div id={errorId} role="alert" className={styles.groupError}>
          {error}
        </div>
      )}
    </div>
  )
}

export interface CheckboxListItemProps extends CheckboxProps {
  /** Right-aligned auxiliary content (e.g. a count or price). */
  endContent?: React.ReactNode
}

function CheckboxListItem({ endContent, className, ...props }: CheckboxListItemProps) {
  return (
    <span className={cx(styles.item, className)}>
      <Checkbox {...props} />
      {endContent && <span className={styles.endContent}>{endContent}</span>}
    </span>
  )
}

CheckboxList.Item = CheckboxListItem
CheckboxList.displayName = "CheckboxList"
CheckboxListItem.displayName = "CheckboxList.Item"
