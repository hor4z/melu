import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type Me } from './api'

export function useMe() {
  return useQuery({
    queryKey: ['yo'],
    queryFn: async () => {
      try { return await api.get<Me>('/api/me') }
      catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e }
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return async () => { await api.post('/api/auth/logout'); qc.setQueryData(['yo'], null) }
}
