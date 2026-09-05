import { Children, Fragment, cloneElement, isValidElement, useCallback, useState, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges classes resolving Tailwind conflicts: the last one wins. */
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
 * Slot: makes a component render its child instead of its own element (`asChild`).
 * The slot props merge with the child's; the child wins on values and the handlers chain.
 */
export type SlotProps = { children?: ReactNode; className?: string; style?: CSSProperties; ref?: Ref<HTMLElement> } & Record<string, unknown>

export function Slot({ children, ref, ...slotProps }: SlotProps) {
  // Un componente como Button siempre rinde tres hijos —icono, contenido, icono— aunque los
  // iconos sean undefined. Sin esto, `children` es un arreglo, no un elemento, y el slot
  // devolvía null: `<Button asChild>` no dibujaba nada y no avisaba.
  const nodes = Children.toArray(children)
  const i = nodes.findIndex(isValidElement)
  if (i === -1) return null
  const child = nodes[i] as ReactElement<Record<string, unknown>>
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
  // Lo que rodeaba al hijo pasa a estar adentro: los iconos del botón terminan dentro del <a>,
  // que es donde tienen que estar.
  if (nodes.length > 1) {
    merged.children = (
      <Fragment>
        {nodes.slice(0, i)}
        {childProps.children as ReactNode}
        {nodes.slice(i + 1)}
      </Fragment>
    )
  }
  return cloneElement(child, merged)
}

/** State that works controlled (`value`) or not (`defaultValue`), like the Radix primitives. */
export function useControllableState<T>({ value, defaultValue, onChange }: { value?: T; defaultValue: T; onChange?: (v: T) => void }) {
  const [internal, setInternal] = useState<T>(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const v = typeof next === 'function' ? (next as (p: T) => T)(current) : next
    if (!controlled) setInternal(v)
    if (!Object.is(v, current)) onChange?.(v)
  }, [controlled, current, onChange])
  return [current, set] as const
}
