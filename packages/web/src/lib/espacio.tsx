import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Espacio, Yo } from './api'

const CLAVE = 'melu.espacio'

type Ctx = { espacio: Espacio | undefined; espacios: Espacio[]; cambiar: (id: string) => void }
const EspacioCtx = createContext<Ctx>({ espacio: undefined, espacios: [], cambiar: () => {} })

/** En qué espacio está trabajando el guía. Se recuerda entre sesiones. */
export function useEspacio() { return useContext(EspacioCtx) }
/** Atajo para las pantallas que solo necesitan el id. */
export function useEspacioId() { return useContext(EspacioCtx).espacio?.id ?? '' }

export function ProveedorEspacio({ yo, children }: { yo: Yo; children: ReactNode }) {
  const qc = useQueryClient()
  const [id, setId] = useState<string>(() => localStorage.getItem(CLAVE) ?? '')
  const espacios = yo.espacios
  // Si el guardado ya no existe (lo borraron, o entró otra persona), vuelve al primero.
  const espacio = useMemo(() => espacios.find((e) => e.id === id) ?? espacios[0], [espacios, id])

  useEffect(() => { if (espacio && espacio.id !== id) { setId(espacio.id); localStorage.setItem(CLAVE, espacio.id) } }, [espacio, id])

  const cambiar = useCallback((nuevo: string) => {
    setId(nuevo)
    localStorage.setItem(CLAVE, nuevo)
    qc.invalidateQueries()
  }, [qc])

  return <EspacioCtx.Provider value={{ espacio, espacios, cambiar }}>{children}</EspacioCtx.Provider>
}
