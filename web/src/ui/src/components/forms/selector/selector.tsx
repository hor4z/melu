import React, { Children, createContext, isValidElement, useContext, useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import { Portal } from "../../../core/portal"
import { DismissableLayer } from "../../../core/dismissable_layer"
import { RovingFocusGroup, useRovingFocusItem } from "../../../core/roving_focus"
import { usePopper } from "../../../core/popper"
import { useControllableState } from "../../../hooks/use_controllable_state"
import styles from "./selector.module.css"

type Size = "sm" | "md" | "lg"

interface SelectorContextValue {
  multiple: boolean
  values: string[]
  toggleValue: (v: string) => void
  close: () => void
  size: Size
  listboxId: string
}

const SelectorContext = createContext<SelectorContextValue | null>(null)

function useSelector() {
  const ctx = useContext(SelectorContext)
  if (!ctx) throw new Error("Selector.Option must be used within <Selector>")
  return ctx
}

/* ------------------------------------------------------------------ *
 * Option
 * ------------------------------------------------------------------ */
export interface SelectorOptionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "value"> {
  value: string
  description?: React.ReactNode
  endContent?: React.ReactNode
  disabled?: boolean
}

function SelectorOption({ value, description, endContent, disabled = false, className, children, onClick, ...props }: SelectorOptionProps) {
  const { multiple, values, toggleValue, close } = useSelector()
  const selected = values.includes(value)
  const roving = useRovingFocusItem(`opt-${value}`, { disabled })

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-selected={selected || undefined}
      className={cx(styles.option, disabled && styles.option_disabled, className)}
      {...props}
      {...roving}
      onClick={(e) => {
        if (disabled) return
        onClick?.(e)
        toggleValue(value)
        if (!multiple) close()
      }}
      onKeyDown={(e) => {
        roving.onKeyDown(e)
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault()
          e.currentTarget.click()
        }
      }}
    >
      <span className={styles.option_check} aria-hidden="true">
        {selected && <Icon icon={Check} size="sm" color="accent" />}
      </span>
      <span className={styles.option_text}>
        <span className={styles.option_label}>{children}</span>
        {description && <span className={styles.option_description}>{description}</span>}
      </span>
      {endContent && <span className={styles.option_end}>{endContent}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Shared root implementation
 * ------------------------------------------------------------------ */
interface BaseProps {
  placeholder?: string
  label?: React.ReactNode
  description?: React.ReactNode
  error?: boolean | string
  required?: boolean
  disabled?: boolean
  clearable?: boolean
  size?: Size
  children: React.ReactNode
  className?: string
}

/** Walk children to map option values to their labels (for the trigger text). */
function collectLabels(children: React.ReactNode, map: Map<string, React.ReactNode>) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = child.props as SelectorOptionProps & { children?: React.ReactNode }
    if (child.type === SelectorOption && props.value !== undefined) {
      map.set(props.value, props.children)
    } else if (props.children) {
      collectLabels(props.children, map)
    }
  })
}

function SelectorBase({
  multiple,
  values,
  setValues,
  placeholder = "Seleccionar…",
  label,
  description,
  error = false,
  required = false,
  disabled = false,
  clearable = false,
  size = "md",
  children,
  className,
}: BaseProps & {
  multiple: boolean
  values: string[]
  setValues: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerId = useId()
  const listboxId = useId()
  const errorId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { anchorRef, floatingRef, floatingStyles } = usePopper({ placement: "bottom-start", offset: 6 })
  const [menuWidth, setMenuWidth] = useState<number>()

  const labels = useMemo(() => {
    const map = new Map<string, React.ReactNode>()
    collectLabels(children, map)
    return map
  }, [children])

  const toggleValue = (v: string) => {
    if (multiple) {
      setValues(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
      return
    }
    setValues([v])
  }

  const openMenu = () => {
    if (disabled) return
    setMenuWidth(triggerRef.current?.offsetWidth)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // focus the selected (or first) option when the menu opens
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const listbox = document.getElementById(listboxId)
      const target = listbox?.querySelector<HTMLElement>("[data-selected]") ?? listbox?.querySelector<HTMLElement>('[role="option"]')
      target?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, listboxId])

  const hasValue = values.length > 0
  const errorMessage = typeof error === "string" ? error : undefined

  return (
    <div className={cx(styles.field, className)}>
      {label && (
        <label htmlFor={triggerId} className={styles.label}>
          {label}
          {required && <span className={styles.required}> · Requerido</span>}
        </label>
      )}
      {description && <span className={styles.description}>{description}</span>}

      <button
        ref={(node) => {
          triggerRef.current = node
          anchorRef(node)
        }}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={errorMessage ? errorId : undefined}
        disabled={disabled}
        data-state={open ? "open" : "closed"}
        className={cx(styles.trigger, styles[`trigger_${size}`], !!error && styles.trigger_error)}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault()
            openMenu()
          }
        }}
      >
        <span className={cx(styles.trigger_value, !hasValue && styles.trigger_placeholder)}>
          {!hasValue
            ? placeholder
            : multiple
              ? values.map((v) => (
                  <span key={v} className={styles.tag}>
                    {labels.get(v) ?? v}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label="Quitar"
                      className={styles.tag_remove}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleValue(v)
                      }}
                    >
                      <Icon icon={X} size={10} />
                    </span>
                  </span>
                ))
              : (labels.get(values[0]) ?? values[0])}
        </span>
        {clearable && hasValue && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Limpiar selección"
            className={styles.clear}
            onClick={(e) => {
              e.stopPropagation()
              setValues([])
            }}
          >
            <Icon icon={X} size="sm" />
          </span>
        )}
        <span className={cx(styles.chevron, open && styles.chevron_open)} aria-hidden="true">
          <Icon icon={ChevronDown} size="sm" color="secondary" />
        </span>
      </button>

      {errorMessage && (
        <span id={errorId} role="alert" className={styles.error}>
          {errorMessage}
        </span>
      )}

      {open && (
        <Portal containerId="selector-root">
          <DismissableLayer
            asChild
            onDismiss={close}
            onPointerDownOutside={(event) => {
              // the trigger toggles by itself
              if (triggerRef.current?.contains(event.target as Node)) event.preventDefault()
            }}
          >
            <RovingFocusGroup asChild orientation="vertical" loop>
              <div
                ref={floatingRef as React.Ref<HTMLDivElement>}
                id={listboxId}
                role="listbox"
                aria-multiselectable={multiple || undefined}
                style={{ ...floatingStyles, minWidth: menuWidth }}
                className={styles.listbox}
              >
                <SelectorContext.Provider value={{ multiple, values, toggleValue, close, size, listboxId }}>
                  {children}
                </SelectorContext.Provider>
              </div>
            </RovingFocusGroup>
          </DismissableLayer>
        </Portal>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Selector — single value
 * ------------------------------------------------------------------ */
export interface SelectorProps extends BaseProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function Selector({ value, defaultValue, onValueChange, ...props }: SelectorProps) {
  const [current, setCurrent] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (v) => v !== undefined && onValueChange?.(v),
  })
  return (
    <SelectorBase multiple={false} values={current === undefined ? [] : [current]} setValues={(next) => setCurrent(next[0])} {...props} />
  )
}

/* ------------------------------------------------------------------ *
 * MultiSelector — multiple values (tags in the trigger)
 * ------------------------------------------------------------------ */
export interface MultiSelectorProps extends BaseProps {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export function MultiSelector({ value, defaultValue = [], onValueChange, ...props }: MultiSelectorProps) {
  const [current, setCurrent] = useControllableState<string[]>({
    value,
    defaultValue,
    onChange: (v) => onValueChange?.(v),
  })
  return <SelectorBase multiple values={current} setValues={setCurrent} {...props} />
}

Selector.Option = SelectorOption
MultiSelector.Option = SelectorOption

Selector.displayName = "Selector"
MultiSelector.displayName = "MultiSelector"
SelectorOption.displayName = "Selector.Option"

export { SelectorOption }
