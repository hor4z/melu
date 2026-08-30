import React from "react"
import { cx } from "../../../utils/cx"
import { useControllableState } from "../../../hooks/use_controllable_state"
import styles from "./switch.module.css"

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Controlled checked state (preferred API). */
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** @deprecated use `checked` — kept for backward compatibility. */
  isOn?: boolean
  /** @deprecated use `onCheckedChange` — kept for backward compatibility. */
  onToggle?: () => void
  size?: "sm" | "md"
}

export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  isOn,
  onToggle,
  size = "md",
  disabled,
  className,
  ...props
}: SwitchProps) {
  const [isChecked, setChecked] = useControllableState<boolean>({
    value: checked ?? isOn,
    defaultValue: defaultChecked,
    onChange: (next) => {
      onCheckedChange?.(next)
      onToggle?.()
    },
  })

  return (
    <div
      className={cx(
        styles.switch,
        styles[`switch--${size}`],
        {
          [styles["switch--on"]]: isChecked,
          [styles["switch--disabled"]]: disabled,
        },
        className,
      )}
      data-size={size}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={() => setChecked((c) => !c)}
        className={styles.switch__element}
        {...props}
      >
        <span className={styles.switch__track}>
          <span className={styles.switch__thumb} />
        </span>
      </button>
    </div>
  )
}
