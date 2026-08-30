import React from "react"
import { cx } from "../../../utils/cx"
import { usePopoverContext } from "../popover/popover"
import type { PopoverContentProps, PopoverTriggerProps } from "../popover/popover"
import { Popover, type PopoverProps } from "../popover/popover"
import styles from "./dropdown.module.css"

interface DropdownMenuProps extends PopoverProps {
  children: React.ReactNode
}

export function Dropdown({ children, ...props }: DropdownMenuProps) {
  return <Popover {...props}>{children}</Popover>
}

interface DropdownMenuTriggerProps extends PopoverTriggerProps {
  children: React.ReactNode
}

function DropdownTrigger({ children, ...props }: DropdownMenuTriggerProps) {
  return <Popover.Trigger {...props}>{children}</Popover.Trigger>
}

interface DropdownMenuContentProps extends PopoverContentProps {
  children: React.ReactNode
}

function DropdownContent({ children, className, ...props }: DropdownMenuContentProps) {
  return (
    <Popover.Content className={cx(styles.content, className)} {...props}>
      {children}
    </Popover.Content>
  )
}

function DropdownLabel({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(styles.label, className)} {...props}>
      {children}
    </div>
  )
}

function DropdownDivider({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.divider, className)} {...props} />
}

function DropdownGroup({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(styles.group, className)} {...props}>
      {children}
    </div>
  )
}

function DropdownItem({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { close } = usePopoverContext()
  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    onClick?.(e)
    close()
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.currentTarget.click()
    }
  }

  return (
    <div className={cx(styles.item, className)} role="menuitem" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown} {...props}>
      {children}
    </div>
  )
}

function DropdownIconItem({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { close } = usePopoverContext()
  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    onClick?.(e)
    close()
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.currentTarget.click()
    }
  }

  return (
    <div className={cx(styles.item, className)} role="menuitem" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown} {...props}>
      {children}
    </div>
  )
}

Dropdown.Trigger = DropdownTrigger
Dropdown.Content = DropdownContent
Dropdown.Label = DropdownLabel
Dropdown.Divider = DropdownDivider
Dropdown.Group = DropdownGroup
Dropdown.Item = DropdownItem
Dropdown.DropdownIconItem = DropdownIconItem

Dropdown.displayName = "Dropdown"
DropdownTrigger.displayName = "Dropdown.Trigger"
DropdownContent.displayName = "Dropdown.Content"
DropdownLabel.displayName = "Dropdown.Label"
DropdownDivider.displayName = "Dropdown.Divider"
DropdownGroup.displayName = "Dropdown.Group"
DropdownItem.displayName = "Dropdown.Item"
DropdownIconItem.displayName = "Dropdown.IconItem"
