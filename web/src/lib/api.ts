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
  put: <T>(p: string, b?: unknown) => req<T>('PUT', p, b),
}

// ---- tipos que espejan el dominio de Go ----
export type Persona = { ID: string; Email: string; Nombre: string }
export type Espacio = { id: string; nombre: string; slug: string; tipo: string }
export type Rol = 'guia' | 'aprendiz' | 'acompanante' | 'coordinador'
export type Membresia = { espacioId: string; grupoId: string | null; rol: Rol }
export type Grupo = { id: string; espacioId: string; nombre: string; codigo: string; etiquetas: Record<string, string>; aprendices: number }
export type Fase = { clave: string; nombre: string; pide: string }
export type Lente = { clave: string; nombre: string; descripcion: string; fases: Fase[] }
export type Yo = { persona: Persona; modo: 'guia' | 'aprendiz' | 'nuevo'; espacios: Espacio[]; membresias: Membresia[] }
export type AuthOpciones = { google: boolean; dev: boolean }

export type TipoBloque =
  | 'parrafo' | 'titulo' | 'lista' | 'destacado'
  | 'pregunta' | 'opciones' | 'chequeo' | 'varias' | 'numerico' | 'completar' | 'ordenar' | 'emparejar'
  | 'evidencia' | 'autoreporte'

export type Bloque = {
  id: string
  tipo: TipoBloque
  texto: string
  opciones?: string[]          // opciones / varias
  correcta?: number            // opciones (y el viejo chequeo)
  correctas?: number[]         // varias
  respuesta?: number           // numerico
  tolerancia?: number          // numerico
  unidad?: string              // numerico
  huecos?: string[]            // completar: lo que va en cada {{hueco}}
  items?: string[]             // ordenar: en el orden correcto
  pares?: { izq: string; der: string }[]  // emparejar
  explicacion?: string         // se muestra después de responder
  pista?: string               // se puede pedir antes
  kind?: 'foto' | 'audio' | 'archivo'  // evidencia
}

/** Lo que pasó en cada bloque: la señal que vale, más rica que la respuesta final. */
export type PasoResultado = { intentos: number; ok: boolean | null; ms: number }
export type Pasos = Record<string, PasoResultado>
export type FaseDoc = { clave: string; nombre: string; pide?: string; bloques: Bloque[] }
export type Documento = { fases: FaseDoc[] }
export type Composicion = {
  experiencia?: string; lente?: string; disciplinas?: string[]
  escenario?: string[]; social?: string; evidencia?: string[]
}
export type Criterio = { id: string; label: string; niveles: string[]; disciplina?: string }
export type Actividad = {
  id: string; espacioId: string | null; titulo: string; esReceta: boolean
  composicion: Composicion; documento: Documento; rubrica: Criterio[]; autores: string[]; updatedAt: string
}
export type Asignacion = {
  id: string; actividadId: string; grupoId: string; titulo: string; composicion: Composicion
  documento?: Documento; rubrica?: Criterio[]; abre: string; cierra: string | null
  entregas: number; entregasTotales: number; grupoNombre?: string; miEstado: 'en_curso' | 'entregada' | 'corregida' | null
}
export type ValorRespuesta = string | number | number[] | string[]
export type Respuestas = Record<string, ValorRespuesta>
export type Puntaje = { id: string; nivel: number }
export type Entrega = {
  id: string; asignacionId: string; aprendizId: string; aprendiz?: string
  estado: 'en_curso' | 'entregada' | 'corregida'; respuestas: Respuestas; artefactos: unknown[]; pasos: Pasos; puntajes: Puntaje[]
  entregadaAt: string | null; updatedAt: string
}
export type Sala = { grupo: Grupo; misiones: Asignacion[] }
export type Mision = { asignacion: Asignacion; entrega: Entrega }
export type Aprendiz = { id: string; nombre: string }
export type GrupoDetalle = { grupo: Grupo; asignaciones: Asignacion[]; aprendices: Aprendiz[] }

export const nuevoId = () => Math.random().toString(36).slice(2, 10)

// ---- panel y progreso ----
export type Senal = { aprendizId: string; aprendiz: string; grupoId: string; grupo: string; tipo: 'abandono' | 'errores' | 'lento' | 'brilla'; detalle: string; sugerencia: string; recetaTitulo?: string; recetaId?: string }
export type PorTipo = { experiencia: string; entregas: number; minutosProm: number; aciertos: number }
export type DiaSerie = { dia: string; abiertas: number; entregadas: number }
export type EntregaResumen = { entregaId: string; asignacionId: string; aprendiz?: string; titulo: string; grupo: string; estado: 'en_curso' | 'entregada' | 'corregida'; minutos: number; aciertos: number; cuando: string }
export type Panel = { espacios: number; grupos: number; aprendices: number; paraMirar: number; minutosProm: number; aciertos: number; serieSemana: DiaSerie[]; senales: Senal[]; porTipo: PorTipo[]; checklist: Record<string, boolean>; entregasRecientes: EntregaResumen[] }
export type Progreso = { hechas: number; enCurso: number; minutos: number; aciertos: number; racha: number; misiones: EntregaResumen[]; experiencias: Record<string, number> }
export type Invitacion = { codigo: string; link: string; qr: string; grupo: string }
