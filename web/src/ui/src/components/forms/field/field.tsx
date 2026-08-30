import React, { createContext, useContext, useEffect, useId, useState } from "react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import styles from "./field.module.css"

export type FieldStatusVariant = "error" | "success" | "warning" | "hint"

interface FieldContextValue {
  controlId: string
  statusId: string
  descriptionId: string
  status: FieldStatusVariant | undefined
  describedBy: string | undefined
  setHasStatus: (has: boolean) => void
  setHasDescription: (has: boolean) => void
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useField() {
  const ctx = useContext(FieldContext)
  if (!ctx) throw new Error("Field.* must be used within <Field>")
  return ctx
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field-level status: drives `aria-invalid` on the control and the default Field.Status color. */
  status?: FieldStatusVariant
}

export function Field({ status, className, children, ...props }: FieldProps) {
  const baseId = useId()
  const [hasStatus, setHasStatus] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)

  const controlId = `${baseId}-control`
  const statusId = `${baseId}-status`
  const descriptionId = `${baseId}-description`
  const describedBy = [hasDescription ? descriptionId : null, hasStatus ? statusId : null].filter(Boolean).join(" ") || undefined

  return (
    <FieldContext.Provider value={{ controlId, statusId, descriptionId, status, describedBy, setHasStatus, setHasDescription }}>
      <div className={cx(styles.field, className)} {...props}>
        {children}
      </div>
    </FieldContext.Provider>
  )
}

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

function FieldLabel({ htmlFor, className, ...props }: FieldLabelProps) {
  const { controlId } = useField()
  return <label htmlFor={htmlFor ?? controlId} className={cx(styles.label, className)} {...props} />
}

export interface FieldControlProps extends React.HTMLAttributes<HTMLElement> {}

/** Injects `id`, `aria-invalid` and `aria-describedby` onto its single child (Slot — no wrapper element). */
function FieldControl(props: FieldControlProps) {
  const { controlId, status, describedBy } = useField()
  return <Slot id={controlId} aria-invalid={status === "error" || undefined} aria-describedby={describedBy} {...props} />
}

export interface FieldStatusProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Overrides the Field-level status for this message line. */
  status?: FieldStatusVariant
}

function FieldStatus({ status, className, ...props }: FieldStatusProps) {
  const { statusId, status: fieldStatus, setHasStatus } = useField()
  const resolved = status ?? fieldStatus ?? "hint"

  useEffect(() => {
    setHasStatus(true)
    return () => setHasStatus(false)
  }, [setHasStatus])

  return <p id={statusId} className={cx(styles.status, styles[`status-${resolved}`], className)} {...props} />
}

export interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  const { descriptionId, setHasDescription } = useField()

  useEffect(() => {
    setHasDescription(true)
    return () => setHasDescription(false)
  }, [setHasDescription])

  return <p id={descriptionId} className={cx(styles.description, className)} {...props} />
}

Field.Label = FieldLabel
Field.Control = FieldControl
Field.Status = FieldStatus
Field.Description = FieldDescription

Field.displayName = "Field"
FieldLabel.displayName = "Field.Label"
FieldControl.displayName = "Field.Control"
FieldStatus.displayName = "Field.Status"
FieldDescription.displayName = "Field.Description"
