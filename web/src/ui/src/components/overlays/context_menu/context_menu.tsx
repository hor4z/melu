import React, { createContext, useContext, useRef, useState } from "react"
import { cx } from "../../../utils/cx"
import { Portal } from "../../../core/portal"
import { DismissableLayer } from "../../../core/dismissable_layer"
import { RovingFocusGroup, useRovingFocusItem } from "../../../core/roving_focus"
import dropdownStyles from "../dropdown_menu/dropdown.module.css"
import styles from "./context_menu.module.css"

interface ContextMenuContextValue {
  open: boolean
  position: { x: number; y: number }
  openAt: (x: number, y: number) => void
  close: () => void
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null)

function useContextMenu() {
  const ctx = useContext(ContextMenuContext)
  if (!ctx) throw new Error("ContextMenu.* must be used within <ContextMenu.Root>")
  return ctx
}

export interface ContextMenuRootProps {
  children: React.ReactNode
  onOpenChange?: (open: boolean) => void
}

export function ContextMenuRoot({ children, onOpenChange }: ContextMenuRootProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const openAt = (x: number, y: number) => {
    setPosition({ x, y })
    setOpen(true)
    onOpenChange?.(true)
  }
  const close = () => {
    setOpen(false)
    onOpenChange?.(false)
  }

  return <ContextMenuContext.Provider value={{ open, position, openAt, close }}>{children}</ContextMenuContext.Provider>
}

export interface ContextMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {}

/** The right-clickable area. */
export function ContextMenuTrigger({ children, onContextMenu, className, ...props }: ContextMenuTriggerProps) {
  const { openAt } = useContextMenu()
  return (
    <div
      className={className}
      onContextMenu={(e) => {
        onContextMenu?.(e)
        if (e.defaultPrevented) return
        e.preventDefault()
        openAt(e.clientX, e.clientY)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export interface ContextMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ContextMenuContent({ children, className, style, ...props }: ContextMenuContentProps) {
  const { open, position, close } = useContextMenu()
  const contentRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  // clamp to viewport after mount via inline max sizes; basic positioning at pointer
  const clampedStyle: React.CSSProperties = {
    position: "fixed",
    top: Math.min(position.y, window.innerHeight - 8),
    left: Math.min(position.x, window.innerWidth - 168),
    ...style,
  }

  return (
    <Portal containerId="context-menu-root">
      <DismissableLayer asChild onDismiss={close}>
        <RovingFocusGroup asChild orientation="vertical" loop>
          <div
            ref={contentRef}
            role="menu"
            style={clampedStyle}
            className={cx(dropdownStyles.content, styles.content, className)}
            {...props}
          >
            <div className={dropdownStyles.group}>{children}</div>
          </div>
        </RovingFocusGroup>
      </DismissableLayer>
    </Portal>
  )
}

export interface ContextMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  /** Destructive styling. */
  danger?: boolean
}

export function ContextMenuItem({
  children,
  className,
  onClick,
  onKeyDown,
  onFocus,
  disabled = false,
  danger = false,
  id,
  ...props
}: ContextMenuItemProps) {
  const { close } = useContextMenu()
  const autoId = React.useId()
  const roving = useRovingFocusItem(id ?? autoId, { disabled })

  return (
    <div
      role="menuitem"
      aria-disabled={disabled || undefined}
      className={cx(dropdownStyles.item, danger && styles.danger, disabled && styles.disabled, className)}
      {...props}
      {...roving}
      onClick={(e) => {
        if (disabled) return
        onClick?.(e)
        close()
      }}
      onFocus={(e) => {
        onFocus?.(e)
        roving.onFocus()
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        roving.onKeyDown(e)
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault()
          e.currentTarget.click()
        }
      }}
    >
      {children}
    </div>
  )
}

export function ContextMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={cx(dropdownStyles.divider, className)} {...props} />
}

export function ContextMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(dropdownStyles.label, className)} {...props} />
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Label: ContextMenuLabel,
})

ContextMenuRoot.displayName = "ContextMenu.Root"
ContextMenuTrigger.displayName = "ContextMenu.Trigger"
ContextMenuContent.displayName = "ContextMenu.Content"
ContextMenuItem.displayName = "ContextMenu.Item"
ContextMenuSeparator.displayName = "ContextMenu.Separator"
ContextMenuLabel.displayName = "ContextMenu.Label"
