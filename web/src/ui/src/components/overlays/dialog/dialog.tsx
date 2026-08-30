import React, { createContext, useContext, useEffect, useId, useState } from "react"
import { X } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import { Portal as CorePortal } from "../../../core/portal"
import { usePresence } from "../../../core/presence"
import { FocusScope } from "../../../core/focus_scope"
import { DismissableLayer } from "../../../core/dismissable_layer"
import { useScrollLock } from "../../../core/use_scroll_lock"
import { useComposedRefs } from "../../../core/compose_refs"
import { useControllableState } from "../../../hooks/use_controllable_state"
import { ButtonIcon } from "../../buttons/button_icon/button_icon"
import { Icon } from "../../../icons/icon"
import styles from "./dialog.module.css"

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  isPresent: boolean
  presenceRef: React.RefObject<HTMLElement | null>
  state: "open" | "closed"
  titleId: string
  descriptionId: string
  hasTitle: boolean
  hasDescription: boolean
  setHasTitle: (v: boolean) => void
  setHasDescription: (v: boolean) => void
  overlay: boolean
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error("Dialog.* must be used within <Dialog.Root>")
  return ctx
}

export interface DialogRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** When false, the backdrop is transparent. */
  overlay?: boolean
  children?: React.ReactNode
}

export function DialogRoot({ open, defaultOpen = false, onOpenChange, overlay = true, children }: DialogRootProps) {
  const [isOpen, setOpen] = useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const { isPresent, ref: presenceRef, state } = usePresence(isOpen)
  const [hasTitle, setHasTitle] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  useScrollLock(isOpen)

  return (
    <DialogContext.Provider
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
        overlay,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function DialogTrigger({ children, asChild = false, onClick, ...props }: DialogTriggerProps) {
  const { setOpen, open } = useDialog()
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      {...(!asChild ? { type: "button" as const } : {})}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e)
        if (!e.defaultPrevented) setOpen(true)
      }}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  const { isPresent } = useDialog()
  if (!isPresent) return null
  return <CorePortal>{children}</CorePortal>
}

export function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state, overlay } = useDialog()
  return <div data-state={state} className={cx(styles.overlay, !overlay && styles.overlay_transparent, className)} {...props} />
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const { state, setOpen, titleId, descriptionId, hasTitle, hasDescription, presenceRef } = useDialog()
  const composedRef = useComposedRefs<HTMLDivElement>(presenceRef as React.Ref<HTMLDivElement>)

  return (
    <div className={styles.positioner}>
      <DismissableLayer asChild onDismiss={() => setOpen(false)}>
        <FocusScope asChild trapped loop returnFocus>
          <div
            ref={composedRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={hasTitle ? titleId : undefined}
            aria-describedby={hasDescription ? descriptionId : undefined}
            tabIndex={-1}
            data-state={state}
            className={cx(styles.dialog, className)}
            {...props}
          >
            {children}
          </div>
        </FocusScope>
      </DismissableLayer>
    </div>
  )
}

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function DialogClose({ children, asChild = false, onClick, className, ...props }: DialogCloseProps) {
  const { setOpen } = useDialog()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) setOpen(false)
  }

  if (asChild) {
    return (
      <Slot onClick={handleClick as unknown as React.MouseEventHandler<HTMLElement>} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <div className={cx(styles.close_button, className)}>
      <ButtonIcon size="sm" variant="ghost" aria-label="Cerrar diálogo" onClick={handleClick} {...props}>
        <Icon icon={X} size="lg" />
      </ButtonIcon>
    </div>
  )
}

export function DialogTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId, setHasTitle } = useDialog()
  useEffect(() => {
    setHasTitle(true)
    return () => setHasTitle(false)
  }, [setHasTitle])
  return (
    <h2 id={titleId} className={cx(styles.title, className)} {...props}>
      {children}
    </h2>
  )
}

export function DialogDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId, setHasDescription } = useDialog()
  useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])
  return (
    <p id={descriptionId} className={cx(styles.description, className)} {...props}>
      {children}
    </p>
  )
}

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function DialogHeader({ children, className, ...props }: DialogHeaderProps) {
  return (
    <div className={cx(styles.header, className)} {...props}>
      {children}
    </div>
  )
}

export interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function DialogBody({ children, className, ...props }: DialogBodyProps) {
  return (
    <div className={cx(styles.body, className)} {...props}>
      {children}
    </div>
  )
}

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function DialogFooter({ children, className, ...props }: DialogFooterProps) {
  return (
    <div className={cx(styles.footer, className)} {...props}>
      {children}
    </div>
  )
}

export const Dialog = Object.assign(DialogRoot, {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Close: DialogClose,
  Title: DialogTitle,
  Description: DialogDescription,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
})

DialogRoot.displayName = "Dialog.Root"
DialogTrigger.displayName = "Dialog.Trigger"
DialogPortal.displayName = "Dialog.Portal"
DialogOverlay.displayName = "Dialog.Overlay"
DialogContent.displayName = "Dialog.Content"
DialogClose.displayName = "Dialog.Close"
DialogTitle.displayName = "Dialog.Title"
DialogDescription.displayName = "Dialog.Description"
DialogHeader.displayName = "Dialog.Header"
DialogBody.displayName = "Dialog.Body"
DialogFooter.displayName = "Dialog.Footer"
