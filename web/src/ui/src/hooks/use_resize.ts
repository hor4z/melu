import { useEffect } from "react"

export function useResize(cb: () => void) {
  useEffect(() => {
    const handleResize = () => {
      cb()
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [cb])
}
