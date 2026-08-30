import React from "react"
import { ChevronDown } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import styles from "./select.module.css"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: "sm" | "md" | "lg"
  error?: boolean
}

/**
 * A styled native <select> — best accessibility for the least code, and closest
 * to the platform. Pass <option>s as children.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = "md", error = false, disabled, className, children, ...props }, ref) => {
    return (
      <div className={cx(styles.wrapper, styles[size], error && styles.error, disabled && styles.disabled, className)}>
        <select ref={ref} disabled={disabled} aria-invalid={error} className={styles.select} {...props}>
          {children}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <Icon icon={ChevronDown} size="sm" />
        </span>
      </div>
    )
  },
)

Select.displayName = "Select"
