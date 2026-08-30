import React from "react"
import { X } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import styles from "./chip.module.css"

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger" | "outline"
  size?: "sm" | "md"
  /** Renders a small remove (X) button. */
  onRemove?: () => void
}

export const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ variant = "neutral", size = "md", onRemove, className, children, ...props }, ref) => (
    <span ref={ref} className={cx(styles.chip, styles[variant], styles[`size-${size}`], className)} {...props}>
      {children}
      {onRemove && (
        <button type="button" aria-label="Quitar" className={styles.remove} onClick={onRemove}>
          <Icon icon={X} size={size === "sm" ? 12 : 14} />
        </button>
      )}
    </span>
  ),
)

Chip.displayName = "Chip"
