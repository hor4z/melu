import React, { createContext, useContext } from "react"
import { cx } from "../../../utils/cx"
import { useControllableState } from "../../../hooks/use_controllable_state"
import styles from "./toggle.module.css"

type Size = "sm" | "md" | "lg"

/* ------------------------------------------------------------------ *
 * Toggle — a single pressable toggle button (aria-pressed).
 * ------------------------------------------------------------------ */
export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  size?: Size
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed, defaultPressed = false, onPressedChange, size = "md", className, children, onClick, disabled, ...props }, ref) => {
    const [isPressed, setPressed] = useControllableState<boolean>({
      value: pressed,
      defaultValue: defaultPressed,
      onChange: onPressedChange,
    })

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={isPressed}
        disabled={disabled}
        data-state={isPressed ? "on" : "off"}
        className={cx(styles.toggle, styles[`size-${size}`], className)}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented) setPressed((p) => !p)
        }}
        {...props}
      >
        {children}
      </button>
    )
  },
)
Toggle.displayName = "Toggle"

/* ------------------------------------------------------------------ *
 * ToggleGroup — a segmented control (single or multiple selection).
 * ------------------------------------------------------------------ */
interface ToggleGroupContextValue {
  value: string[]
  toggle: (v: string) => void
  size: Size
}
const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null)

function useToggleGroup() {
  const ctx = useContext(ToggleGroupContext)
  if (!ctx) throw new Error("ToggleGroup.Item must be used within <ToggleGroup>")
  return ctx
}

export interface ToggleGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  type?: "single" | "multiple"
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  size?: Size
}

export function ToggleGroup({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  size = "md",
  className,
  children,
  ...props
}: ToggleGroupProps) {
  const toArray = (v: string | string[] | undefined): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v])

  const [selected, setSelected] = useControllableState<string[]>({
    value: value === undefined ? undefined : toArray(value),
    defaultValue: toArray(defaultValue),
    onChange: (next) => onValueChange?.(type === "single" ? (next[0] ?? "") : next),
  })

  const toggle = (v: string) => {
    if (type === "single") {
      setSelected(selected[0] === v ? selected : [v])
      return
    }
    setSelected(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  }

  return (
    <ToggleGroupContext.Provider value={{ value: selected, toggle, size }}>
      <div role="group" className={cx(styles.group, styles[`size-${size}`], className)} {...props}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function ToggleGroupItem({ value, className, children, onClick, ...props }: ToggleGroupItemProps) {
  const { value: selected, toggle } = useToggleGroup()
  const active = selected.includes(value)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-state={active ? "on" : "off"}
      className={cx(styles.item, className)}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) toggle(value)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

ToggleGroup.Item = ToggleGroupItem
ToggleGroup.displayName = "ToggleGroup"
ToggleGroupItem.displayName = "ToggleGroup.Item"
