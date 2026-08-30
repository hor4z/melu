import React, { createContext, useContext, useEffect, useId, useState } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import { Portal as CorePortal } from "../../../core/portal"
import { usePresence } from "../../../core/presence"
import { FocusScope } from "../../../core/focus_scope"
import { DismissableLayer } from "../../../core/dismissable_layer"
import { useScrollLock } from "../../../core/use_scroll_lock"
import { useComposedRefs } from "../../../core/compose_refs"
import { useControllableState } from "../../../hooks/use_controllable_state"
import { Button, type ButtonProps } from "../../buttons/button/button"
import dialogStyles from "../dialog/dialog.module.css"
import styles from "./alert_dialog.module.css"

interface AlertDialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  isPresent: boolean
  presenceRef: React.RefObject<HTMLElement | null>
  state: "open" | "closed"
  titleId: string
  descriptionId: string
  setHasTitle: (v: boolean) => void
  setHasDescription: (v: boolean) => void
  hasTitle: boolean
  hasDescription: boolean
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null)

function useAlertDialog() {
  const ctx = useContext(AlertDialogContext)
  if (!ctx) throw new Error("AlertDialog.* must be used within <AlertDialog.Root>")
  return ctx
}

export interface AlertDialogRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

/**
 * An interruptive confirmation dialog. Unlike Dialog it does NOT dismiss on
 * outside click; Escape cancels. Use for destructive/irreversible actions.
 */
export function AlertDialogRoot({ open, defaultOpen = false, onOpenChange, children }: AlertDialogRootProps) {
  const [isOpen, setOpen] = useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const { isPresent, ref: presenceRef, state } = usePresence(isOpen)
  const [hasTitle, setHasTitle] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  useScrollLock(isOpen)

  return (
    <AlertDialogContext.Provider
      value={{
        open: isOpen,
        setOpen,
        isPresent,
        presenceRef,
        state,
        titleId,
        descriptionId,
        hasTitle,
        hasDescription,
        setHasTitle,
        setHasDescription,
      }}
    >
      {children}
    </AlertDialogContext.Provider>
  )
}

export interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function AlertDialogTrigger({ children, asChild = false, onClick, ...props }: AlertDialogTriggerProps) {
  const { setOpen, open } = useAlertDialog()
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) setOpen(true)
  }
  if (asChild) {
    return (
      <Slot aria-haspopup="dialog" aria-expanded={open} onClick={handleClick as unknown as React.MouseEventHandler<HTMLElement>} {...props}>
        {children}
      </Slot>
    )
  }
  return (
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

export function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  const { isPresent } = useAlertDialog()
  if (!isPresent) return null
  return <CorePortal>{children}</CorePortal>
}

export function AlertDialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state } = useAlertDialog()
  return <div data-state={state} className={cx(dialogStyles.overlay, className)} {...props} />
}

export interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AlertDialogContent({ className, children, ...props }: AlertDialogContentProps) {
  const { state, setOpen, titleId, descriptionId, hasTitle, hasDescription, presenceRef } = useAlertDialog()
  const composedRef = useComposedRefs<HTMLDivElement>(presenceRef as React.Ref<HTMLDivElement>)

  return (
    <div className={dialogStyles.positioner}>
      {/* Escape cancels via the shared layer stack; outside pointerdown is
          deliberately inert (interruptive dialogs require an explicit choice). */}
      <DismissableLayer asChild disableOutsideDismiss onDismiss={() => setOpen(false)}>
        <FocusScope asChild trapped loop returnFocus>
          <div
            ref={composedRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={hasTitle ? titleId : undefined}
            aria-describedby={hasDescription ? descriptionId : undefined}
            tabIndex={-1}
            data-state={state}
            className={cx(dialogStyles.dialog, styles.content, className)}
            {...props}
          >
            {children}
          </div>
        </FocusScope>
      </DismissableLayer>
    </div>
  )
}

export function AlertDialogTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId, setHasTitle } = useAlertDialog()
  useEffect(() => {
    setHasTitle(true)
    return () => setHasTitle(false)
  }, [setHasTitle])
  return (
    <h2 id={titleId} className={cx(dialogStyles.title, className)} {...props}>
      {children}
    </h2>
  )
}

export function AlertDialogDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId, setHasDescription } = useAlertDialog()
  useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])
  return (
    <p id={descriptionId} className={cx(dialogStyles.description, className)} {...props}>
      {children}
    </p>
  )
}

export interface AlertDialogActionProps extends ButtonProps {}

/** The confirming action — closes the dialog after the consumer's onClick. */
export function AlertDialogAction({ onClick, variant = "destructive", ...props }: AlertDialogActionProps) {
  const { setOpen } = useAlertDialog()
  return (
    <Button
      variant={variant}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

export interface AlertDialogCancelProps extends ButtonProps {}

export function AlertDialogCancel({ onClick, variant = "ghost", ...props }: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialog()
  return (
    <Button
      variant={variant}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

function AlertDialogHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(dialogStyles.header, className)} {...props}>
      {children}
    </div>
  )
}

function AlertDialogBody({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(dialogStyles.body, className)} {...props}>
      {children}
    </div>
  )
}

function AlertDialogFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(dialogStyles.footer, className)} {...props}>
      {children}
    </div>
  )
}

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
  Header: AlertDialogHeader,
  Body: AlertDialogBody,
  Footer: AlertDialogFooter,
})

AlertDialogRoot.displayName = "AlertDialog.Root"
AlertDialogTrigger.displayName = "AlertDialog.Trigger"
AlertDialogPortal.displayName = "AlertDialog.Portal"
AlertDialogOverlay.displayName = "AlertDialog.Overlay"
AlertDialogContent.displayName = "AlertDialog.Content"
AlertDialogTitle.displayName = "AlertDialog.Title"
AlertDialogDescription.displayName = "AlertDialog.Description"
AlertDialogAction.displayName = "AlertDialog.Action"
AlertDialogCancel.displayName = "AlertDialog.Cancel"
