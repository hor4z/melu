// La figura de quien no tiene foto, y el catálogo de partes con las que se arma.
//
// Vive aparte de `avatar.tsx` porque son dos trabajos distintos: aquel pinta un cuadradito con
// una foto adentro, este sabe de estilos y de partes. Y porque el catálogo lo recorre el
// armador de avatares, que no necesita el componente para nada.
//
// Se dibuja acá y no se pide a un servidor. Las figuras salen del nombre de la persona, y
// mandar los nombres de los chicos a un servicio de terceros para que devuelva un dibujo es un
// precio que no vale la pena pagar por un avatar.
import { createAvatar, type StyleOptions } from '@dicebear/core'
import { bigSmile } from '@dicebear/collection'

// Un solo estilo. La librería trae treinta y pico y es tentador ofrecerlos todos, pero cada uno
// que se suma es otra pantalla de opciones que recorrer, y el bundle los paga a unos cuarenta
// kilobytes cada uno. Con uno alcanza para que cada uno tenga su cara.
const STYLES = { bigSmile } as const

export type ArtStyle = keyof typeof STYLES
export const ART_STYLES = Object.keys(STYLES) as ArtStyle[]

/** Cómo se llama el estilo en la pantalla. En español, que lo lee una persona. */
export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  bigSmile: 'Una figura',
}

/**
 * Las partes que se ofrecen, en el orden en el que se muestran. Es un recorte de lo que la
 * librería sabe dibujar: acepta también probabilidades y accesorios sueltos, y ofrecer todo
 * deja una pantalla que nadie termina de recorrer. Estas son las que cambian la cara.
 */
export const ART_PARTS: Record<ArtStyle, string[]> = {
  bigSmile: ['eyes', 'mouth', 'hair', 'hairColor', 'skinColor', 'accessories'],
}

/** El nombre de cada parte, en español. Una sola tabla para los cuatro estilos. */
export const ART_PART_LABELS: Record<string, string> = {
  eyes: 'Ojos', mouth: 'Boca', hair: 'Pelo', hairColor: 'Color de pelo',
  skinColor: 'Piel', accessories: 'Accesorios',
}

type Schema = { properties?: Record<string, { enum?: string[]; default?: unknown; items?: { enum?: string[]; pattern?: string } }> }

/**
 * Los valores que puede tomar una parte, leídos del esquema de la librería y no copiados acá.
 *
 * Copiarlos sería una lista que envejece en silencio: el día que la librería suma un peinado,
 * la lista de al lado deja de tenerlo y nadie se entera. Los colores vienen como el `default`
 * de un array de hex, que es la paleta que el estilo trae pensada.
 */
export function artValues(style: ArtStyle, part: string): string[] {
  const prop = (STYLES[style].schema as Schema).properties?.[part]
  if (!prop) return []
  if (prop.items?.enum) return prop.items.enum
  if (prop.enum) return prop.enum
  // Un array de colores: el default es la paleta.
  if (Array.isArray(prop.default)) return prop.default.filter((v): v is string => typeof v === 'string')
  return []
}

/** Si la parte se elige mirando un color y no una forma. Cambia cómo la dibuja el selector. */
export function isColorPart(part: string) {
  return part.toLowerCase().includes('color')
}

/**
 * Qué tan cerca se dibuja. Es nuestro y nunca viene de afuera: lo usan las miniaturas del
 * armador para acercarse a la parte que se está eligiendo.
 */
export type ArtView = { scale?: number; translateX?: number; translateY?: number }

/**
 * El SVG, como string, listo para meter en el DOM.
 *
 * Todas las opciones de la librería son arrays: pasar `['variant03']` es "quiero esta", y no
 * pasar nada es "elegí vos a partir de la semilla", que es lo que hace que la figura de alguien
 * que nunca tocó nada siga siendo siempre la misma.
 *
 * Se recorren las partes del estilo y no las claves que llegan, que no es lo mismo: el avatar de
 * una persona viaja desde la base, y la lista de partes es el filtro que impide que una clave
 * que no es una parte (`scale`, sin ir más lejos) llegue al dibujante como si lo fuera.
 */
export function avatarArt(style: ArtStyle | undefined, seed: string, options?: Record<string, string>, view?: ArtView) {
  const s = style ?? 'bigSmile'
  const picked: StyleOptions<Record<string, unknown>> = { seed, ...view }
  for (const k of ART_PARTS[s]) {
    const v = options?.[k]
    if (v) (picked as Record<string, unknown>)[k] = [v]
  }
  return createAvatar(STYLES[s], picked).toString()
}
