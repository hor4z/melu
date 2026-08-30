// Cliente mínimo. Un solo lugar donde vive fetch.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText)
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  get: <T>(p: string) => req<T>('GET', p),
  post: <T>(p: string, b?: unknown) => req<T>('POST', p, b),
}

// ---- tipos que espejan el dominio de Go ----
export type Persona = { ID: string; Email: string; Nombre: string }
export type Espacio = { id: string; nombre: string; slug: string; tipo: string }
export type Membresia = { espacioId: string; grupoId: string | null; rol: 'guia' | 'aprendiz' | 'acompanante' | 'coordinador' }
export type Grupo = { id: string; espacioId: string; nombre: string; codigo: string; etiquetas: Record<string, string>; aprendices: number }
export type Fase = { clave: string; nombre: string; pide: string }
export type Lente = { clave: string; nombre: string; descripcion: string; fases: Fase[] }
export type Yo = { persona: Persona; espacios: Espacio[]; membresias: Membresia[] }
export type AuthOpciones = { google: boolean; dev: boolean }
