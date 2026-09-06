import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api, ApiError, type Me } from './api'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try { return await api.get<Me>('/api/me') }
      catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e }
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return async () => {
    await api.post('/api/auth/logout')
    forgetEverything(qc)
  }
}

/**
 * Todo lo que quedó de la persona que se va. Sin esto, quien entre después en la misma pestaña
 * ve los datos del anterior (el panel, las entregas, el espacio elegido) hasta que cada query se
 * refresque sola.
 */
export function forgetEverything(qc: QueryClient) {
  // El orden importa. `clear()` primero se lleva también `['me']`, y React Query sigue mostrando
  // lo último que tenía mientras lo vuelve a pedir: la pantalla se queda con la persona anterior
  // hasta que llega la respuesta. Marcando primero que no hay nadie, el guard cambia de una.
  qc.setQueryData(['me'], null)
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
  try { localStorage.removeItem('melu.space') } catch { /* modo privado, o sin permiso */ }
}
