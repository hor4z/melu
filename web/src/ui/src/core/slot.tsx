import React, { forwardRef, isValidElement, cloneElement, Children } from "react"
import { composeRefs } from "./compose_refs"
import { cx } from "../utils/cx"

type AnyProps = Record<string, unknown>

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...childProps }

  for (const key in slotProps) {
    const slotValue = slotProps[key]
    const childValue = childProps[key]

    const isHandler = /^on[A-Z]/.test(key)
    if (isHandler) {
      // compose: run the slot's handler, then the child's
      if (slotValue && childValue) {
        merged[key] = (...args: unknown[]) => {
          ;(childValue as (...a: unknown[]) => void)(...args)
          ;(slotValue as (...a: unknown[]) => void)(...args)
        }
      } else {
        merged[key] = slotValue || childValue
      }
    } else if (key === "style") {
      merged.style = { ...(slotValue as object), ...(childValue as object) }
    } else if (key === "className") {
      merged.className = cx(slotValue as string, childValue as string)
    } else {
      // child wins for everything else
      merged[key] = childValue !== undefined ? childValue : slotValue
    }
  }

  return merged
}

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

/**
 * Radix-style Slot: merges its props onto the single child element instead of
 * rendering a wrapper — className/style merge, event handlers compose, refs
 * compose. This is what powers `asChild` across the kit.
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(({ children, ...slotProps }, forwardedRef) => {
  if (!isValidElement(children)) {
    return Children.count(children) > 1 ? Children.only(null) : null
  }

  const child = children as React.ReactElement<AnyProps & { ref?: React.Ref<unknown> }>
  // React 19 exposes the ref on props.ref; element.ref is a deprecated compat
  // getter that warns and will be removed. Prefer props.ref, fall back for <19.
  const childRef = (child.props as { ref?: React.Ref<unknown> }).ref ?? (child as { ref?: React.Ref<unknown> }).ref
  const props = mergeProps(slotProps as AnyProps, child.props as AnyProps)
  props.ref = forwardedRef ? composeRefs(forwardedRef, childRef as React.Ref<HTMLElement>) : childRef

  return cloneElement(child, props)
})

Slot.displayName = "Slot"
