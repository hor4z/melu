import React, { useEffect, useId, useRef } from "react"
import { Check, Minus } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import { useComposedRefs } from "../../../core/compose_refs"
import { useControllableState } from "../../../hooks/use_controllable_state"
import styles from "./checkbox.module.css"

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type" | "checked" | "defaultChecked" | "value"
> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  indeterminate?: boolean
  size?: "sm" | "md"
  /** Secondary line rendered under the label. */
  description?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      defaultChecked = false,
      onCheckedChange,
      indeterminate = false,
      size = "md",
      description,
      disabled,
      className,
      children,
      onChange,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const [isChecked, setChecked] = useControllableState<boolean>({
      value: checked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    })
    const autoId = useId()
    const id = idProp ?? autoId
    const descriptionId = `${autoId}-description`
    const inputRef = useRef<HTMLInputElement>(null)
    const composedRef = useComposedRefs(ref, inputRef)

    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate
    }, [indeterminate])

    const iconSize = size === "sm" ? 12 : 14

    const control = (
      <span className={styles.controlWrap}>
        <input
          ref={composedRef}
          type="checkbox"
          id={id}
          checked={isChecked}
          disabled={disabled}
          aria-describedby={description ? descriptionId : undefined}
          className={styles.input}
          onChange={(e) => {
            onChange?.(e)
            if (!e.defaultPrevented) setChecked(e.target.checked)
          }}
          {...props}
        />
        <span className={styles.box} aria-hidden="true">
          {indeterminate ? <Icon icon={Minus} size={iconSize} /> : isChecked ? <Icon icon={Check} size={iconSize} /> : null}
        </span>
      </span>
    )

    return (
      <span className={cx(styles.field, styles[size], disabled && styles.disabled, className)}>
        {control}
        {(children || description) && (
          <label htmlFor={id} className={styles.body}>
            {children && <span className={styles.label}>{children}</span>}
            {description && (
              <span id={descriptionId} className={styles.description}>
                {description}
              </span>
            )}
          </label>
        )}
      </span>
    )
  },
)

Checkbox.displayName = "Checkbox"
