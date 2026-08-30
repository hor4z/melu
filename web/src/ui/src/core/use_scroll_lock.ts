import { useEffect } from "react"

let lockCount = 0
let previous: { overflow: string; paddingRight: string } | null = null

/** Locks body scroll while `locked` is true, compensating for the scrollbar width.
 *  Ref-counted so nested overlays don't fight over the body style. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    if (lockCount === 0) {
      const scrollbar = window.innerWidth - document.documentElement.clientWidth
      previous = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      }
      document.body.style.overflow = "hidden"
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    }
    lockCount += 1

    return () => {
      lockCount -= 1
      if (lockCount === 0 && previous) {
        document.body.style.overflow = previous.overflow
        document.body.style.paddingRight = previous.paddingRight
        previous = null
      }
    }
  }, [locked])
}
