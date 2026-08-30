import React, { forwardRef, useEffect, useRef } from "react"
import { composeRefs } from "./compose_refs"
import { Slot } from "./slot"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  )
}

export interface FocusScopeProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  /** Trap Tab focus inside the scope. */
  trapped?: boolean
  /** Loop from last→first (and back) when trapped. */
  loop?: boolean
  /** Restore focus to the previously focused element on unmount. */
  returnFocus?: boolean
}

/** Contains keyboard focus within its subtree while mounted. */
export const FocusScope = forwardRef<HTMLDivElement, FocusScopeProps>(
  ({ asChild = false, trapped = true, loop = true, returnFocus = true, ...props }, forwardedRef) => {
    const nodeRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      const node = nodeRef.current
      if (!node) return
      const previouslyFocused = document.activeElement as HTMLElement | null

      // autofocus first focusable (or the container)
      const focusables = getFocusable(node)
      if (focusables.length > 0) focusables[0].focus()
      else {
        node.setAttribute("tabindex", "-1")
        node.focus()
      }

      // Listen on the scope node (not document): the handler only fires while
      // focus is inside THIS scope, so stacked scopes (dialog over dialog)
      // never fight over the same Tab press.
      const onKeyDown = (event: KeyboardEvent) => {
        if (!trapped || event.key !== "Tab") return
        const items = getFocusable(node)
        if (items.length === 0) {
          event.preventDefault()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement

        if (event.shiftKey && active === first) {
          if (loop) {
            event.preventDefault()
            last.focus()
          }
        } else if (!event.shiftKey && active === last) {
          if (loop) {
            event.preventDefault()
            first.focus()
          }
        }
      }

      node.addEventListener("keydown", onKeyDown)
      return () => {
        node.removeEventListener("keydown", onKeyDown)
        if (returnFocus && previouslyFocused && typeof previouslyFocused.focus === "function") {
          previouslyFocused.focus()
        }
      }
    }, [trapped, loop, returnFocus])

    const Comp = asChild ? Slot : "div"
    return <Comp ref={composeRefs(forwardedRef, nodeRef)} {...props} />
  },
)

FocusScope.displayName = "FocusScope"
