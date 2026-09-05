import type { ReactNode } from 'react'
import { FloatingPortal } from '@floating-ui/react'

/**
 * Pulls the content out of the DOM tree and hangs it at the end of the body.
 * This is what keeps a menu from being clipped by an `overflow: hidden`
 * or covered by a parent's `z-index`. It also leaves focus guards
 * so the tab key does not escape the floating element.
 */
export function Portal({ children, id, root }: { children: ReactNode; id?: string; root?: HTMLElement | null }) {
  return <FloatingPortal id={id} root={root}>{children}</FloatingPortal>
}
