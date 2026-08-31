// Fechas de melu. Un solo lugar donde vive Intl y la aritmética de días.
//
// Regla de oro: **`Dia` ('2026-09-03') es una etiqueta local, no un instante.** Es el día del
// calendario que ve la persona. Cruzarlo a Date sin cuidado corre 24 horas en cualquier zona
// negativa —`new Date('2026-09-03')` se parsea como UTC— así que se pasa siempre por `aFecha()`,
// que parsea al mediodía. Y `aDia()` arma la etiqueta con getFullYear/getMonth/getDate, nunca
// con toISOString(), que también es UTC.

export type Dia = string   // YYYY-MM-DD, día local
export type Hora = string  // HH:MM 24h

const LOCALE = 'es-AR'

// Los Intl se cachean a nivel de módulo: crearlos por render es el costo real de Intl, y una
// lista de un mes los llamaría cientos de veces.
const fmt = {
  diaMes: new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }),
  diaMesAno: new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }),
  semanaLarga: new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }),
  semanaCorta: new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }),
  larga: new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }),
  mesAno: new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }),
}

// «X» para miércoles: es la convención que ya usaba Inicio.tsx y desambigua martes de miércoles.
export const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

const dosDigitos = (n: number) => String(n).padStart(2, '0')
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/* ---------- puentes Date <-> Dia ---------- */

export const aDia = (d: Date): Dia => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`
export const aFecha = (dia: Dia, hora?: Hora): Date => new Date(`${dia}T${hora ?? '12:00'}:00`)
export const hoyDia = (): Dia => aDia(new Date())
export const diaDeIso = (iso: string): Dia => aDia(new Date(iso))
export const horaDeIso = (iso: string): Hora => { const d = new Date(iso); return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}` }

/** Un día y una hora locales, como instante ISO para mandarle al servidor. */
export const aIso = (dia: Dia, hora: Hora): string => new Date(`${dia}T${hora}:00`).toISOString()

/* ---------- aritmética, por etiqueta y no por milisegundos ---------- */

export function sumarDias(dia: Dia, n: number): Dia {
  const d = aFecha(dia)
  d.setDate(d.getDate() + n)
  return aDia(d)
}

export const diasEntre = (a: Dia, b: Dia): number =>
  Math.round((aFecha(b).getTime() - aFecha(a).getTime()) / 86400000)

/** Lunes = 0, para que la semana empiece donde empieza la escuela. */
export const diaSemana = (dia: Dia): number => (aFecha(dia).getDay() + 6) % 7
export const inicioDeSemana = (dia: Dia): Dia => sumarDias(dia, -diaSemana(dia))
export const semanaDe = (dia: Dia): Dia[] => {
  const l = inicioDeSemana(dia)
  return Array.from({ length: 7 }, (_, i) => sumarDias(l, i))
}

/* ---------- comparaciones ---------- */

export const esHoy = (dia: Dia) => dia === hoyDia()
export const esManana = (dia: Dia) => dia === sumarDias(hoyDia(), 1)
export const esPasado = (dia: Dia) => dia < hoyDia()
export const yaPaso = (iso: string) => new Date(iso).getTime() < Date.now()

/* ---------- formato ---------- */

export const nombreDiaCorto = (dia: Dia) => fmt.semanaCorta.format(aFecha(dia)).replace('.', '')
export const formatearDia = (dia: Dia) => fmt.diaMes.format(aFecha(dia))
export const formatearDiaLargo = (dia: Dia) => capitalizar(fmt.larga.format(aFecha(dia)))
export const formatearMesAno = (dia: Dia) => capitalizar(fmt.mesAno.format(aFecha(dia)))
export const formatearHora = (iso: string) => horaDeIso(iso)

/** «Hoy» | «Mañana» | «Ayer» | «jueves» dentro de la semana | «jue 3 sep» | con año si es otro. */
export function formatearDiaRelativo(dia: Dia): string {
  if (esHoy(dia)) return 'Hoy'
  if (esManana(dia)) return 'Mañana'
  if (dia === sumarDias(hoyDia(), -1)) return 'Ayer'
  const d = diasEntre(hoyDia(), dia)
  if (d > 1 && d < 7) return capitalizar(fmt.semanaLarga.format(aFecha(dia)))
  const f = aFecha(dia)
  if (f.getFullYear() !== new Date().getFullYear()) return fmt.diaMesAno.format(f)
  return `${nombreDiaCorto(dia)} ${fmt.diaMes.format(f)}`
}

/** Lo que se le dice al aprendiz sobre su vencimiento. Corto, y sin regaños. */
export function formatearVencimiento(cierra: string | null): string | null {
  if (!cierra) return null
  const dia = diaDeIso(cierra)
  const hora = horaDeIso(cierra)
  if (yaPaso(cierra)) {
    if (esHoy(dia)) return `cerró hoy ${hora}`
    if (dia === sumarDias(hoyDia(), -1)) return 'cerró ayer'
    return `cerró el ${formatearDia(dia)}`
  }
  if (esHoy(dia)) return `vence hoy ${hora}`
  if (esManana(dia)) return `vence mañana ${hora}`
  const d = diasEntre(hoyDia(), dia)
  if (d > 1 && d < 7) return `vence el ${fmt.semanaLarga.format(aFecha(dia))}`
  return `vence el ${formatearDia(dia)}`
}

/** Lo que se le dice cuando todavía no abrió. */
export function formatearApertura(abre: string): string {
  const dia = diaDeIso(abre)
  if (esHoy(dia)) return `se abre hoy ${horaDeIso(abre)}`
  if (esManana(dia)) return 'se abre mañana'
  const d = diasEntre(hoyDia(), dia)
  if (d > 1 && d < 7) return `se abre el ${fmt.semanaLarga.format(aFecha(dia))}`
  return `se abre el ${formatearDia(dia)}`
}

/* ---------- repetición ---------- */

export type Repeticion = { dias: number[]; hora: Hora; plazo: number | null; desde: Dia; hasta: Dia }

/** Los días de la semana en el orden en que se dicen, con nombre. Índice 0 = domingo (time.Weekday). */
export const DIAS_SEMANA = [
  { n: 1, inicial: 'L', nombre: 'lunes' },
  { n: 2, inicial: 'M', nombre: 'martes' },
  { n: 3, inicial: 'X', nombre: 'miércoles' },
  { n: 4, inicial: 'J', nombre: 'jueves' },
  { n: 5, inicial: 'V', nombre: 'viernes' },
  { n: 6, inicial: 'S', nombre: 'sábado' },
  { n: 0, inicial: 'D', nombre: 'domingo' },
] as const

/** Las fechas que produce una regla. Es la previa del formulario: hace visible el error antes
 *  de guardar (te olvidaste el «hasta», o generaste doscientas ocurrencias). */
export function expandir(r: Repeticion, tope = 200): Dia[] {
  if (!r.dias.length || !r.desde || !r.hasta || r.hasta < r.desde) return []
  const out: Dia[] = []
  for (let d = r.desde; d <= r.hasta && out.length <= tope; d = sumarDias(d, 1)) {
    if (r.dias.includes(aFecha(d).getDay())) out.push(d)
  }
  return out
}

export function describirRepeticion(r: Repeticion | null | undefined): string {
  if (!r || !r.dias.length) return 'No se repite'
  const nombres = DIAS_SEMANA.filter((d) => r.dias.includes(d.n)).map((d) => `${d.nombre}s`.replace('ss', 's'))
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0]
  return `Los ${lista} a las ${r.hora}, hasta el ${formatearDia(r.hasta)}`
}
