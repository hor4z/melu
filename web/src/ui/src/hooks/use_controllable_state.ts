import { useCallback, useRef, useState } from "react"

interface UseControllableStateParams<T> {
  /** Controlled value. When provided (not undefined), the component is controlled. */
  value?: T
  /** Initial value for the uncontrolled case. */
  defaultValue: T
  /** Called on every change with the next value. */
  onChange?: (next: T) => void
}

type SetStateAction<T> = T | ((prev: T) => T)

/**
 * Radix-style controllable state: controlled when `value` is provided, otherwise
 * internally managed starting from `defaultValue`. `onChange` always fires.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateParams<T>): [T, (next: SetStateAction<T>) => void] {
  const [uncontrolled, setUncontrolled] = useState<T>(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? (value as T) : uncontrolled

  // keep the latest onChange without re-creating the setter identity
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      const current = isControlled ? (value as T) : uncontrolled
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next

      // onChange only fires on actual changes (prevents double-fire when e.g.
      // follow-focus and click both set the same value).
      if (Object.is(resolved, current)) return
      if (!isControlled) setUncontrolled(resolved)
      onChangeRef.current?.(resolved)
    },
    [isControlled, value, uncontrolled],
  )

  return [current, setValue]
}
