import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type Yo } from './api'

export function useYo() {
  return useQuery({
    queryKey: ['yo'],
    queryFn: async () => {
      try { return await api.get<Yo>('/api/yo') }
      catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e }
    },
  })
}

export function useSalir() {
  const qc = useQueryClient()
  return async () => { await api.post('/api/auth/salir'); qc.setQueryData(['yo'], null) }
}
