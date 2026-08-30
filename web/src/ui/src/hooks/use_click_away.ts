import { useEffect } from "react"
import type { RefObject } from "react"

export function useClickAway<T extends HTMLElement | null>(ref: RefObject<T>, callback: (event: MouseEvent) => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback(event)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ref, callback])
}
