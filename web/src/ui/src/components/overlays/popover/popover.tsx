import React, { createContext, useContext, useCallback, useId } from "react"
import type { Placement } from "@floating-ui/react"
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import { DismissableLayer } from "../../../core/dismissable_layer"
import { useControllableState } from "../../../hooks/use_controllable_state"
import { Portal } from "../../../core/portal"
import styles from "./popover.module.css"

export type PopoverPosition = Placement

export interface PopoverContextProps {
  isOpen: boolean
  toggle: () => void
  close: () => void
  position: PopoverPosition
  containerRef: (node: HTMLElement | null) => void
  floatingRef: (node: HTMLElement | null) => void
  floatingStyles: React.CSSProperties
  toggleable: boolean
  triggerRef: React.RefObject<Element | null>
  onClickOutside?: () => void
}

const PopoverContext = createContext<PopoverContextProps | null>(null)

export function usePopoverContext() {
  const context = useContext(PopoverContext)
  if (!context) {
    throw new Error("Popover components must be used within <Popover>")
  }
  return context
}

export interface PopoverProps {
  children: React.ReactNode
  placement?: PopoverPosition
  /** Controlled open state. When provided, the popover is controlled. */
  open?: boolean
  /** Initial open state for the uncontrolled case. */
  defaultOpen?: boolean
  toggleable?: boolean
  onClickOutside?: () => void
  onOpenChange?: (open: boolean) => void
}

export function Popover({
  children,
  placement = "bottom-start",
  open,
  defaultOpen = false,
  toggleable = true,
  onClickOutside,
  onOpenChange,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })

  const { refs, floatingStyles } = useFloating({
    placement: placement,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8, mainAxis: true, crossAxis: true })],
    whileElementsMounted: autoUpdate,
  })

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [setIsOpen])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  return (
    <PopoverContext.Provider
      value={{
        isOpen,
        toggle,
        close,
        position: placement,
        containerRef: refs.setReference,
        floatingRef: refs.setFloating,
        floatingStyles,
        toggleable: toggleable ?? true,
        triggerRef: refs.reference as React.RefObject<Element | null>,
        onClickOutside,
      }}
    >
      {children}
    </PopoverContext.Provider>
  )
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  /** Merge trigger behavior into the single child instead of a wrapper div. */
  asChild?: boolean
}

export const PopoverTrigger = React.forwardRef<HTMLDivElement, PopoverTriggerProps>(
  ({ className, children, disabled = false, asChild = false, onClick, ...props }, ref) => {
    const { toggle, toggleable, containerRef, isOpen } = usePopoverContext()

    const handleClick = (e: React.MouseEvent) => {
      if (disabled) return
      e.stopPropagation()
      if (toggleable) toggle()
    }

    const setRefs = (node: HTMLDivElement | null) => {
      containerRef(node)
      if (ref) {
        if (typeof ref === "function") ref(node)
        else ref.current = node
      }
    }

    const sharedProps = {
      onClick: (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e)
        if (!e.defaultPrevented) handleClick(e)
      },
      "aria-expanded": isOpen,
      "aria-haspopup": true,
      ...props,
    }

    if (asChild) {
      return (
        <Slot ref={setRefs as React.Ref<HTMLElement>} className={className} {...sharedProps}>
          {children}
        </Slot>
      )
    }

    return (
      <div ref={setRefs} className={cx(styles.trigger, className)} {...sharedProps}>
        {children}
      </div>
    )
  },
)

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(({ className, children, style, ...props }, ref) => {
  const id = useId()
  const { isOpen, floatingRef, floatingStyles, close, triggerRef, onClickOutside } = usePopoverContext()

  if (!isOpen) return null

  const setRefs = (node: HTMLDivElement | null) => {
    floatingRef(node)
    if (ref) {
      if (typeof ref === "function") ref(node)
      else ref.current = node
    }
  }

  return (
    <Portal containerId={`${id}-portal`}>
      <DismissableLayer
        asChild
        onDismiss={close}
        onPointerDownOutside={(event) => {
          // ignore pointerdowns on the trigger — the trigger toggles by itself
          const trigger = triggerRef.current
          if (trigger instanceof HTMLElement && trigger.contains(event.target as Node)) {
            event.preventDefault()
            return
          }
          onClickOutside?.()
        }}
      >
        <div
          ref={setRefs}
          style={{ ...floatingStyles, ...style }}
          className={cx(className, styles.content)}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </DismissableLayer>
    </Portal>
  )
})

export interface PopoverCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const PopoverClose = React.forwardRef<HTMLButtonElement, PopoverCloseProps>(
  ({ children, asChild = false, onClick, ...props }, ref) => {
    const { close } = usePopoverContext()
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      if (!e.defaultPrevented) close()
    }

    if (asChild) {
      return (
        <Slot ref={ref as React.Ref<HTMLElement>} onClick={handleClick as unknown as React.MouseEventHandler<HTMLElement>} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button ref={ref} type="button" onClick={handleClick} {...props}>
        {children}
      </button>
    )
  },
)

Popover.Trigger = PopoverTrigger
Popover.Content = PopoverContent
Popover.Close = PopoverClose
Popover.displayName = "Popover"
PopoverContent.displayName = "PopoverContent"
PopoverTrigger.displayName = "PopoverTrigger"
PopoverClose.displayName = "PopoverClose"
