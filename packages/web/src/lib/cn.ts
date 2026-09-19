import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Junta clases y deja ganar a la última cuando dos utilidades pisan la misma propiedad. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
