import React, { createContext, useContext, useEffect, useId, useState } from "react"
import { cx } from "../../../utils/cx"
import { useControllableState } from "../../../hooks/use_controllable_state"
import styles from "./radio.module.css"

type RadioSize = "sm" | "md" | "lg"

interface RadioContextValue {
  value: string | undefined
  setValue: (v: string) => void
  name: string
  disabled: boolean
  size: RadioSize
  labelId: string
  descriptionId: string
  errorId: string
  setHasLabel: (present: boolean) => void
  setHasDescription: (present: boolean) => void
  setHasError: (present: boolean) => void
}
const RadioContext = createContext<RadioContextValue | null>(null)

function useRadio(part: string) {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error(`${part} must be used within <RadioGroup>`)
  return ctx
}

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  /** Layout of the items. Horizontal lays items on a wrapping row. */
  orientation?: "vertical" | "horizontal"
  /** Control size inherited by every item (an item can override it). */
  size?: RadioSize
}

export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  orientation = "vertical",
  size = "md",
  className,
  children,
  ...props
}: RadioGroupProps) {
  const [current, setValue] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (v) => v !== undefined && onValueChange?.(v),
  })
  const name = useId()
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`
  const errorId = `${baseId}-error`

  const [hasLabel, setHasLabel] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const [hasError, setHasError] = useState(false)

  const describedBy = [hasDescription ? descriptionId : null, hasError ? errorId : null].filter(Boolean).join(" ") || undefined

  return (
    <RadioContext.Provider
      value={{
        value: current,
        setValue,
        name,
        disabled,
        size,
        labelId,
        descriptionId,
        errorId,
        setHasLabel,
        setHasDescription,
        setHasError,
      }}
    >
      <div
        role="radiogroup"
        data-orientation={orientation}
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        className={cx(styles.group, className)}
        {...props}
      >
        {children}
      </div>
    </RadioContext.Provider>
  )
}

export interface RadioGroupLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Appends a " · Required" hint after the label text. */
  required?: boolean
}

function RadioGroupLabel({ required = false, className, children, ...props }: RadioGroupLabelProps) {
  const { labelId, setHasLabel } = useRadio("RadioGroup.Label")

  useEffect(() => {
    setHasLabel(true)
    return () => setHasLabel(false)
  }, [setHasLabel])

  return (
    <span id={labelId} className={cx(styles.groupLabel, className)} {...props}>
      {children}
      {required && <span className={styles.requiredMark}> · Required</span>}
    </span>
  )
}

export type RadioGroupDescriptionProps = React.HTMLAttributes<HTMLSpanElement>

function RadioGroupDescription({ className, children, ...props }: RadioGroupDescriptionProps) {
  const { descriptionId, setHasDescription } = useRadio("RadioGroup.Description")

  useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])

  return (
    <span id={descriptionId} className={cx(styles.groupDescription, className)} {...props}>
      {children}
    </span>
  )
}

export type RadioGroupErrorProps = React.HTMLAttributes<HTMLDivElement>

function RadioGroupError({ className, children, ...props }: RadioGroupErrorProps) {
  const { errorId, setHasError } = useRadio("RadioGroup.Error")

  useEffect(() => {
    setHasError(true)
    return () => setHasError(false)
  }, [setHasError])

  return (
    <div id={errorId} role="alert" className={cx(styles.groupError, className)} {...props}>
      {children}
    </div>
  )
}

export interface RadioGroupItemProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "size" | "type" | "checked" | "defaultChecked"
> {
  value: string
  /** Secondary line rendered under the item label. */
  description?: React.ReactNode
  /** Right-aligned auxiliary content (e.g. a price). */
  endContent?: React.ReactNode
  /** Control size; defaults to the group's `size`. */
  size?: RadioSize
}

function RadioGroupItem({
  value,
  description,
  endContent,
  size,
  className,
  children,
  disabled,
  onChange,
  id: idProp,
  ...props
}: RadioGroupItemProps) {
  const group = useRadio("RadioGroup.Item")
  const autoId = useId()
  const id = idProp ?? autoId
  const descriptionId = `${autoId}-description`
  const checked = group.value === value
  const isDisabled = disabled || group.disabled
  const resolvedSize = size ?? group.size

  const control = (
    <span className={styles.controlWrap}>
      <input
        type="radio"
        id={id}
        name={group.name}
        value={value}
        checked={checked}
        disabled={isDisabled}
        aria-describedby={description ? descriptionId : undefined}
        className={styles.input}
        onChange={(e) => {
          onChange?.(e)
          if (!e.defaultPrevented) group.setValue(value)
        }}
        {...props}
      />
      <span className={styles.control} aria-hidden="true">
        <span className={styles.dot} />
      </span>
    </span>
  )

  return (
    <span className={cx(styles.item, styles[resolvedSize], isDisabled && styles.disabled, className)}>
      {control}
      {(children || description) && (
        <label htmlFor={id} className={styles.body}>
          {children && <span className={styles.itemLabel}>{children}</span>}
          {description && (
            <span id={descriptionId} className={styles.itemDescription}>
              {description}
            </span>
          )}
        </label>
      )}
      {endContent && <span className={styles.endContent}>{endContent}</span>}
    </span>
  )
}

RadioGroup.Item = RadioGroupItem
RadioGroup.Label = RadioGroupLabel
RadioGroup.Description = RadioGroupDescription
RadioGroup.Error = RadioGroupError
RadioGroup.displayName = "RadioGroup"
RadioGroupItem.displayName = "RadioGroup.Item"
RadioGroupLabel.displayName = "RadioGroup.Label"
RadioGroupDescription.displayName = "RadioGroup.Description"
RadioGroupError.displayName = "RadioGroup.Error"
