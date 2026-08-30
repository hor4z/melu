import React, { createContext, useContext, useId } from "react"
import { cx } from "../../../utils/cx"
import { useControllableState } from "../../../hooks/use_controllable_state"
import { RovingFocusGroup, useRovingFocusItem } from "../../../core/roving_focus"
import styles from "./tabs.module.css"

interface TabsContextValue {
  value: string | undefined
  setValue: (v: string) => void
  baseId: string
  variant: "line" | "segmented"
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("Tabs.* must be used within <Tabs.Root>")
  return ctx
}

export interface TabsRootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** "line" = underline tabs (default); "segmented" = filled track. */
  variant?: "line" | "segmented"
}

export function TabsRoot({ value, defaultValue, onValueChange, variant = "line", className, children, ...props }: TabsRootProps) {
  const [current, setValue] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: (v) => v !== undefined && onValueChange?.(v),
  })
  const baseId = useId()

  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId, variant }}>
      <div className={cx(styles.root, className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function TabsList({ className, children, ...props }: TabsListProps) {
  const { variant } = useTabs()
  return (
    <RovingFocusGroup asChild orientation="horizontal" loop>
      <div role="tablist" className={cx(styles.list, styles[`list--${variant}`], className)} {...props}>
        {children}
      </div>
    </RovingFocusGroup>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ value, className, children, onClick, onFocus, onKeyDown, disabled, ...props }: TabsTriggerProps) {
  const { value: current, setValue, baseId, variant } = useTabs()
  const active = current === value
  const roving = useRovingFocusItem(`${baseId}-tab-${value}`, { disabled })

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`${baseId}-panel-${value}`}
      data-state={active ? "active" : "inactive"}
      disabled={disabled}
      className={cx(styles.trigger, styles[`trigger--${variant}`], className)}
      {...props}
      {...roving}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) setValue(value)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!e.defaultPrevented) roving.onKeyDown(e)
      }}
      onFocus={(e) => {
        onFocus?.(e)
        roving.onFocus()
        // follow-focus selection (standard tabs behavior)
        if (!disabled && e.currentTarget === e.target) setValue(value)
      }}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  /** Keep the panel mounted when inactive (hidden) instead of unmounting. */
  forceMount?: boolean
}

export function TabsContent({ value, forceMount = false, className, children, ...props }: TabsContentProps) {
  const { value: current, baseId } = useTabs()
  const active = current === value
  if (!active && !forceMount) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!active}
      tabIndex={0}
      className={cx(styles.content, className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
})

TabsRoot.displayName = "Tabs.Root"
TabsList.displayName = "Tabs.List"
TabsTrigger.displayName = "Tabs.Trigger"
TabsContent.displayName = "Tabs.Content"
