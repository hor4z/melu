import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import { RovingFocusGroup } from "../../../core/roving_focus"
import styles from "./toolbar.module.css"

const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

const ToolbarRoot = forwardRef<HTMLDivElement, ToolbarProps>(({ className, onKeyDown, ...props }, ref) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    // let text controls keep their caret navigation
    if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return

    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (items.length === 0) return
    const idx = items.indexOf(document.activeElement as HTMLElement)

    event.preventDefault()
    let next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : idx + (event.key === "ArrowRight" ? 1 : -1)
    if (next < 0) next = items.length - 1
    if (next >= items.length) next = 0
    items[next].focus()
  }

  return (
    <RovingFocusGroup asChild orientation="horizontal" loop>
      <div
        ref={ref}
        role="toolbar"
        aria-orientation="horizontal"
        className={cx(styles.toolbar, className)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </RovingFocusGroup>
  )
})

export interface ToolbarGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

function ToolbarGroup({ className, ...props }: ToolbarGroupProps) {
  return <div role="group" className={cx(styles.group, className)} {...props} />
}

export interface ToolbarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

function ToolbarSeparator({ className, ...props }: ToolbarSeparatorProps) {
  return <div role="separator" aria-orientation="vertical" className={cx(styles.separator, className)} {...props} />
}

export const Toolbar = Object.assign(ToolbarRoot, {
  Group: ToolbarGroup,
  Separator: ToolbarSeparator,
})

ToolbarRoot.displayName = "Toolbar"
ToolbarGroup.displayName = "Toolbar.Group"
ToolbarSeparator.displayName = "Toolbar.Separator"
