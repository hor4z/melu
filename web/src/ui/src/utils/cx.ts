import { type ClassValue, clsx } from "clsx"

/**
 * Class-name joiner for the kit. clsx-only — no tailwind-merge: kit components
 * style themselves with hashed CSS-module class names that never collide, so
 * conflict resolution would be a no-op.
 */
export function cx(...inputs: ClassValue[]) {
  return clsx(inputs)
}
