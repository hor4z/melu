import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Space, Me } from './api'

const STORAGE_KEY = 'melu.space'

type Ctx = { space: Space | undefined; spaces: Space[]; change: (id: string) => void }
const SpaceCtx = createContext<Ctx>({ space: undefined, spaces: [], change: () => {} })

/** Which space the guide is working in. Remembered between sessions. */
export function useSpace() { return useContext(SpaceCtx) }
/** Shortcut for the screens that only need the id. */
export function useSpaceId() { return useContext(SpaceCtx).space?.id ?? '' }

export function SpaceProvider({ me, children }: { me: Me; children: ReactNode }) {
  const qc = useQueryClient()
  const [id, setId] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const spaces = me.spaces
  // If the stored one is gone (deleted, or someone else signed in), fall back to the first.
  const space = useMemo(() => spaces.find((e) => e.id === id) ?? spaces[0], [spaces, id])

  useEffect(() => { if (space && space.id !== id) { setId(space.id); localStorage.setItem(STORAGE_KEY, space.id) } }, [space, id])

  const change = useCallback((nuevo: string) => {
    setId(nuevo)
    localStorage.setItem(STORAGE_KEY, nuevo)
    qc.invalidateQueries()
  }, [qc])

  return <SpaceCtx.Provider value={{ space, spaces, change }}>{children}</SpaceCtx.Provider>
}
