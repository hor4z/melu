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
import styles from "./modal.module.css"

interface ModalContextValue {
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

const ModalContext = createContext<ModalContextValue | null>(null)

function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error("Modal.* must be used within <Modal.Root>")
  return ctx
}

export interface ModalRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  overlay?: boolean
  children?: React.ReactNode
}

export function ModalRoot({ open, defaultOpen = false, onOpenChange, overlay = true, children }: ModalRootProps) {
  const [isOpen, setOpen] = useControllableState<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const { isPresent, ref: presenceRef, state } = usePresence(isOpen)
  const [hasTitle, setHasTitle] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  useScrollLock(isOpen)

  return (
    <ModalContext.Provider
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
    </ModalContext.Provider>
  )
}

export interface ModalTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function ModalTrigger({ children, asChild = false, onClick, ...props }: ModalTriggerProps) {
  const { setOpen, open } = useModal()
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

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const { isPresent } = useModal()
  if (!isPresent) return null
  return <CorePortal>{children}</CorePortal>
}

export function ModalOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { state, overlay } = useModal()
  return <div data-state={state} className={cx(styles.overlay, !overlay && styles.overlay_transparent, className)} {...props} />
}

export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "custom"
}

export function ModalContent({ className, children, size = "md", ...props }: ModalContentProps) {
  const { state, setOpen, titleId, descriptionId, hasTitle, hasDescription, presenceRef } = useModal()
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
            className={cx(styles.modal, size !== "custom" && styles[size], className)}
            {...props}
          >
            {children}
          </div>
        </FocusScope>
      </DismissableLayer>
    </div>
  )
}

export interface ModalCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export function ModalClose({ children, asChild = false, onClick, className, ...props }: ModalCloseProps) {
  const { setOpen } = useModal()

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
      <ButtonIcon size="sm" variant="ghost" aria-label="Cerrar modal" onClick={handleClick} {...props}>
        <Icon icon={X} size="lg" />
      </ButtonIcon>
    </div>
  )
}

export function ModalTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId, setHasTitle } = useModal()
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

export function ModalDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId, setHasDescription } = useModal()
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

export const ModalHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cx(styles.header, className)} {...props}>
    {children}
  </div>
)

export const ModalBody = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cx(styles.body, className)} {...props}>
    {children}
  </div>
)

export const ModalFooter = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cx(styles.footer, className)} {...props}>
    {children}
  </div>
)

export const Modal = Object.assign(ModalRoot, {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Portal: ModalPortal,
  Overlay: ModalOverlay,
  Content: ModalContent,
  Close: ModalClose,
  Title: ModalTitle,
  Description: ModalDescription,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
})

ModalRoot.displayName = "Modal.Root"
ModalTrigger.displayName = "Modal.Trigger"
ModalPortal.displayName = "Modal.Portal"
ModalOverlay.displayName = "Modal.Overlay"
ModalContent.displayName = "Modal.Content"
ModalClose.displayName = "Modal.Close"
ModalTitle.displayName = "Modal.Title"
ModalDescription.displayName = "Modal.Description"
ModalHeader.displayName = "Modal.Header"
ModalBody.displayName = "Modal.Body"
ModalFooter.displayName = "Modal.Footer"
