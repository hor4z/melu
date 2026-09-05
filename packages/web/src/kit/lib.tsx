import { cloneElement, isValidElement, useCallback, useState, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une clases resolviendo conflictos de Tailwind: la última gana. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function composeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref && typeof ref === 'object') (ref as { current: T | null }).current = node
    }
  }
}

const isHandler = (key: string) => /^on[A-Z]/.test(key)

/**
 * Slot: hace que un componente rinda a su hijo en lugar de su propio elemento (`asChild`).
 * Las props del slot se mezclan con las del hijo; el hijo gana en valores y los handlers se encadenan.
 */
export type SlotProps = { children?: ReactNode; className?: string; style?: CSSProperties; ref?: Ref<HTMLElement> } & Record<string, unknown>

export function Slot({ children, ref, ...slotProps }: SlotProps) {
  if (!isValidElement(children)) return null
  const child = children as ReactElement<Record<string, unknown>>
  const childProps = child.props
  const merged: Record<string, unknown> = { ...slotProps, ...childProps }

  for (const key of Object.keys(slotProps)) {
    if (!isHandler(key)) continue
    const mine = slotProps[key]
    const theirs = childProps[key]
    if (typeof mine === 'function' && typeof theirs === 'function') {
      merged[key] = (...args: unknown[]) => { (theirs as (...a: unknown[]) => void)(...args); (mine as (...a: unknown[]) => void)(...args) }
    } else if (typeof mine === 'function') {
      merged[key] = mine
    }
  }
  merged.className = cn(slotProps.className, childProps.className as string)
  merged.style = { ...slotProps.style, ...(childProps.style as object) }
  merged.ref = composeRefs(ref, (childProps as { ref?: Ref<HTMLElement> }).ref)
  return cloneElement(child, merged)
}

/** Estado que funciona controlado (`value`) o no (`defaultValue`), como los primitivos de Radix. */
export function useControllableState<T>({ value, defaultValue, onChange }: { value?: T; defaultValue: T; onChange?: (v: T) => void }) {
  const [interno, setInterno] = useState<T>(defaultValue)
  const controlado = value !== undefined
  const actual = controlado ? value : interno
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const v = typeof next === 'function' ? (next as (p: T) => T)(actual) : next
    if (!controlado) setInterno(v)
    if (!Object.is(v, actual)) onChange?.(v)
  }, [controlado, actual, onChange])
  return [actual, set] as const
}
