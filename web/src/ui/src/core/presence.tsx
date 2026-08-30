import React, { cloneElement, isValidElement, useEffect, useRef, useState } from "react"
import { composeRefs } from "./compose_refs"

export type PresenceState = "open" | "closed"

/**
 * Keeps a node mounted through its exit animation. Returns `isPresent` (whether
 * to render) and a `ref` to attach to the animated node. When `present` flips to
 * false, unmount waits for a CSS animation (if any) to finish.
 */
export function usePresence(present: boolean) {
  const [isPresent, setIsPresent] = useState(present)
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (present) {
      setIsPresent(true)
      return
    }
    const node = ref.current
    if (!node) {
      setIsPresent(false)
      return
    }
    const styles = getComputedStyle(node)
    const hasAnimation = styles.animationName !== "none" && parseFloat(styles.animationDuration) > 0

    if (!hasAnimation) {
      setIsPresent(false)
      return
    }

    let done = false
    const finish = (e?: AnimationEvent) => {
      if (done) return
      if (e && e.target !== node) return
      done = true
      setIsPresent(false)
    }
    node.addEventListener("animationend", finish)
    node.addEventListener("animationcancel", finish)
    // safety fallback (~ animation duration + delay + slack)
    const ms = (parseFloat(styles.animationDuration) + parseFloat(styles.animationDelay || "0")) * 1000 + 80
    const timer = setTimeout(() => finish(), ms)

    return () => {
      node.removeEventListener("animationend", finish)
      node.removeEventListener("animationcancel", finish)
      clearTimeout(timer)
    }
  }, [present])

  return { isPresent, ref, state: (present ? "open" : "closed") as PresenceState }
}

export interface PresenceProps {
  present: boolean
  children: React.ReactElement<{ ref?: React.Ref<unknown>; "data-state"?: string }>
}

/**
 * Declarative wrapper: renders the child while present or exiting, injecting a
 * `data-state="open"|"closed"` attribute and the presence ref.
 */
export function Presence({ present, children }: PresenceProps) {
  const { isPresent, ref, state } = usePresence(present)
  if (!isPresent || !isValidElement(children)) return null

  // React 19: ref lives on props.ref (element.ref is a deprecated compat getter)
  const childRef = (children.props as { ref?: React.Ref<unknown> }).ref ?? (children as { ref?: React.Ref<unknown> }).ref
  return cloneElement(children, {
    ref: composeRefs(ref, childRef as React.Ref<HTMLElement>),
    "data-state": state,
  })
}

Presence.displayName = "Presence"
