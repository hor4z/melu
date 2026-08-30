import { useCallback } from "react"
import type { Ref, RefCallback } from "react"

type PossibleRef<T> = Ref<T> | undefined

function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === "function") {
    return ref(value)
  }
  if (ref !== null && ref !== undefined) {
    ;(ref as React.MutableRefObject<T>).current = value
  }
}

/**
 * Merge several refs into one callback ref. Supports cleanup-returning callback
 * refs (React 19) and object refs. Used everywhere `asChild` forwards a ref.
 */
export function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => setRef(ref, node))
    // Because this callback returns a cleanup, React 19 will NOT call it again
    // with null — so the cleanup itself must detach every ref: run returned
    // cleanups, and reset object/plain-callback refs to null.
    return () => {
      for (let i = 0; i < cleanups.length; i++) {
        const cleanup = cleanups[i]
        if (typeof cleanup === "function") cleanup()
        else setRef(refs[i], null as T)
      }
    }
  }
}

/** Hook form: stable composed ref across renders for the given refs. */
export function useComposedRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(composeRefs(...refs), refs)
}
