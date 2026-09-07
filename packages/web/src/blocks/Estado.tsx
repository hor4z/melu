// Lo que se ve mientras la pantalla llega, y lo que se ve si no llega.
//
// Media plataforma cortaba con `if (!q.data) return null`: mientras la respuesta viajaba, la
// pantalla era el fondo vacío, y si la respuesta no venía, seguía siendo el fondo vacío para
// siempre. Las dos cosas se leen igual (nada) y ninguna de las dos dice nada. Acá viven las
// dos formas, para que ninguna pantalla tenga que decidirlo de nuevo.
import type { ReactNode } from 'react'
import { Alert, Button, Skeleton } from '@melu/ui'
import { ApiError } from '../lib/api'

/**
 * La silueta de una pantalla: un título y unos bloques. No imita ninguna en particular a
 * propósito, porque lo que tiene que decir es "esto está viniendo" y no "esto va a ser así".
 */
export function Cargando({ bloques = 2 }: { bloques?: number }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {Array.from({ length: bloques }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  )
}

/**
 * Cuando no llegó. Dice qué pasó de verdad: un enlace a algo que ya no existe y una conexión
 * caída no son lo mismo, y ofrecer "probar de nuevo" contra un 404 es mandar a alguien a
 * insistirle a una puerta que no está.
 */
export function NoLlego({ que, error, onRetry, children }: { que: string; error?: unknown; onRetry: () => void; children?: ReactNode }) {
  const status = error instanceof ApiError ? error.status : 0
  // Los textos no concuerdan con `que` a propósito: sirve para "el grupo" y para "las entregas",
  // y una frase que dependa del género y del número se rompe en la mitad de las pantallas.
  if (status === 404) {
    return (
      <Alert variant="warning" title={`No encontramos ${que}`}>
        Revisá el enlace: puede estar mal escrito, o apuntar a algo que ya no está.
      </Alert>
    )
  }
  if (status === 403) {
    return <Alert variant="warning" title="No tenés acceso">Esto es de otro espacio. Pedile acceso a quien lo creó.</Alert>
  }
  return (
    <Alert
      variant="danger" title={`No pudimos traer ${que}`}
      actions={<Button size="sm" variant="secondary" onClick={onRetry}>Probar de nuevo</Button>}
    >
      {children ?? 'Puede ser la conexión. Los datos están, no se perdió nada.'}
    </Alert>
  )
}
