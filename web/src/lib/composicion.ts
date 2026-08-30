// El catálogo de los seis ejes. Es contenido, no lógica: cambiarlo no toca ningún componente.
export const EXPERIENCIAS: Record<string, string> = {
  practica: 'Práctica', reto: 'Reto', investigacion: 'Investigación', construccion: 'Construcción',
  juego: 'Juego', mision_real: 'Misión real', creacion: 'Creación', debate: 'Debate',
  experimento: 'Experimento', simulacion: 'Simulación', checkin: 'Check-in',
}
export const ESCENARIOS: Record<string, string> = {
  pantalla: 'Pantalla', papel: 'Papel', kit: 'Kit / materiales', impresora_3d: 'Impresora 3D',
  calle: 'Patio / calle', casa: 'Casa', cocina: 'Cocina', robot: 'Robot',
}
export const SOCIAL: Record<string, string> = {
  solo: 'Solo', pareja: 'En pareja', equipo: 'En equipo', grupo: 'Grupo entero', entre_grupos: 'Entre grupos', familia: 'Con la familia',
}
export const EVIDENCIAS: Record<string, string> = {
  respuesta: 'Respuesta', foto: 'Foto', audio: 'Audio 60 s', archivo: 'Archivo / STL / código',
  observacion: 'Rúbrica de observación', coevaluacion: 'Coevaluación', autoreporte: 'Autoreporte',
}

export const TIPOS_BLOQUE: Record<string, { nombre: string; pista: string; semantico: boolean }> = {
  parrafo:     { nombre: 'Texto',        pista: 'Consigna, contexto, explicación', semantico: false },
  titulo:      { nombre: 'Título',       pista: 'Separa partes dentro de una fase', semantico: false },
  lista:       { nombre: 'Lista',        pista: 'Pasos o materiales, uno por línea', semantico: false },
  destacado:   { nombre: 'Destacado',    pista: 'Algo que no se puede pasar por alto', semantico: false },
  pregunta:    { nombre: 'Pregunta',     pista: 'El chico responde escribiendo', semantico: true },
  chequeo:     { nombre: 'Chequeo',      pista: 'Opciones, una correcta', semantico: true },
  evidencia:   { nombre: 'Evidencia',    pista: 'Pide foto, audio o archivo', semantico: true },
  autoreporte: { nombre: 'Autoreporte',  pista: 'Escala de 1 a 5, nunca se califica', semantico: true },
}

export const nombreDe = (cat: Record<string, string>, k?: string) => (k ? cat[k] ?? k : undefined)
