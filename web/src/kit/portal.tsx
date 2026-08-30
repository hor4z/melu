import type { ReactNode } from 'react'
import { FloatingPortal } from '@floating-ui/react'

/**
 * Saca el contenido del árbol del DOM y lo cuelga del final del body.
 * Es lo que evita que un menú quede recortado por un `overflow: hidden`
 * o tapado por un `z-index` de un padre. Además deja guardias de foco
 * para que el tabulador no se escape del elemento flotante.
 */
export function Portal({ children, id, root }: { children: ReactNode; id?: string; root?: HTMLElement | null }) {
  return <FloatingPortal id={id} root={root}>{children}</FloatingPortal>
}
