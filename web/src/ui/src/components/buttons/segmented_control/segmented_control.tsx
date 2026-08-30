import React, { createContext, useContext, useId } from "react"
import { cx } from "../../../utils/cx"
import { useControllableState } from "../../../hooks/use_controllable_state"
import { RovingFocusGroup, useRovingFocusItem } from "../../../core/roving_focus"
import styles from "./segmented_control.module.css"

type Size = "sm" | "md" | "lg"

interface SegmentedControlContextValue {
  value: string | undefined
  setValue: (v: string) => void
  baseId: string
}

const SegmentedControlContext = createContext<SegmentedControlContextValue | null>(null)

function useSegmentedControl() {
  const ctx = useContext(SegmentedControlContext)
  if (!ctx) throw new Error("SegmentedControl.Item must be used within <SegmentedControl>")
  return ctx
}

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: Size
  /** Stretch to the container width, items sharing it equally. */
  block?: boolean
}

export function SegmentedControl({
  value,
  defaultValue,
  onValueChange,
  size = "md",
  block = false,
  className,
  children,
  ...props
}: SegmentedControlProps) {
  const [current, setValue] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (v) => v !== undefined && onValueChange?.(v),
  })
  const baseId = useId()

  return (
    <SegmentedControlContext.Provider value={{ value: current, setValue, baseId }}>
      <RovingFocusGroup asChild orientation="horizontal" loop>
        <div role="radiogroup" className={cx(styles.control, styles[`size-${size}`], block && styles.block, className)} {...props}>
          {children}
        </div>
      </RovingFocusGroup>
    </SegmentedControlContext.Provider>
  )
}

export interface SegmentedControlItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function SegmentedControlItem({ value, className, children, onClick, disabled, ...props }: SegmentedControlItemProps) {
  const { value: current, setValue, baseId } = useSegmentedControl()
  const active = current === value
  const roving = useRovingFocusItem(`${baseId}-item-${value}`, { disabled })

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-state={active ? "on" : "off"}
      disabled={disabled}
      className={cx(styles.item, className)}
      {...roving}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) setValue(value)
      }}
      onFocus={(e) => {
        roving.onFocus()
        // follow-focus selection (standard radio-group behavior)
        if (!disabled && e.currentTarget === e.target) setValue(value)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

SegmentedControl.Item = SegmentedControlItem
SegmentedControl.displayName = "SegmentedControl"
SegmentedControlItem.displayName = "SegmentedControl.Item"
