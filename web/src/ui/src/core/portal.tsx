import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { createPortal } from "react-dom"

export interface PortalProps {
  children: React.ReactNode
  containerId?: string
}

// Containers are shared across Portal instances by id — refcount them so the
// container is only removed when the LAST portal using it unmounts.
const containerRefCounts = new Map<string, number>()

export const Portal = forwardRef<HTMLElement | null, PortalProps>(({ children, containerId = "portal-root" }, ref) => {
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  useImperativeHandle(ref, () => {
    if (containerRef.current === null) {
      throw new Error("Portal container is not available.")
    }
    return containerRef.current
  }, [mounted])

  useEffect(() => {
    let container = document.getElementById(containerId)

    if (!container) {
      container = document.createElement("div")
      container.setAttribute("id", containerId)
      document.body.appendChild(container)
    }

    containerRefCounts.set(containerId, (containerRefCounts.get(containerId) ?? 0) + 1)
    containerRef.current = container
    setMounted(true)

    return () => {
      const count = (containerRefCounts.get(containerId) ?? 1) - 1
      if (count <= 0) {
        containerRefCounts.delete(containerId)
        if (container && container.parentNode) {
          container.parentNode.removeChild(container)
        }
      } else {
        containerRefCounts.set(containerId, count)
      }
    }
  }, [containerId])

  if (!mounted || !containerRef.current) return null
  return createPortal(children, containerRef.current)
})
