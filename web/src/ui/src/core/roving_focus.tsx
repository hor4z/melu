import React, { createContext, forwardRef, useContext, useEffect, useRef, useState, useCallback } from "react"
import { composeRefs } from "./compose_refs"
import { Slot } from "./slot"

type Orientation = "horizontal" | "vertical" | "both"

interface RovingContextValue {
  orientation: Orientation
  loop: boolean
  currentId: string | null
  setCurrentId: (id: string) => void
  groupRef: React.RefObject<HTMLElement | null>
}

const RovingContext = createContext<RovingContextValue | null>(null)

function useRoving() {
  const ctx = useContext(RovingContext)
  if (!ctx) throw new Error("RovingFocus items must be used within <RovingFocusGroup>")
  return ctx
}

export interface RovingFocusGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  orientation?: Orientation
  loop?: boolean
}

export const RovingFocusGroup = forwardRef<HTMLDivElement, RovingFocusGroupProps>(
  ({ asChild = false, orientation = "horizontal", loop = true, ...props }, forwardedRef) => {
    const groupRef = useRef<HTMLElement | null>(null)
    const [currentId, setCurrentId] = useState<string | null>(null)

    // Establish a single tab stop on mount: the first enabled item. Without
    // this, every item would be tabbable until the group is first focused.
    useEffect(() => {
      if (currentId !== null) return
      const first = groupRef.current?.querySelector<HTMLElement>("[data-roving-item]:not([data-disabled])")
      if (first?.id) setCurrentId(first.id)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const Comp = asChild ? Slot : "div"
    return (
      <RovingContext.Provider value={{ orientation, loop, currentId, setCurrentId, groupRef }}>
        <Comp ref={composeRefs(forwardedRef, groupRef)} {...props} />
      </RovingContext.Provider>
    )
  },
)
RovingFocusGroup.displayName = "RovingFocusGroup"

const NEXT_KEYS: Record<Orientation, string[]> = {
  horizontal: ["ArrowRight"],
  vertical: ["ArrowDown"],
  both: ["ArrowRight", "ArrowDown"],
}
const PREV_KEYS: Record<Orientation, string[]> = {
  horizontal: ["ArrowLeft"],
  vertical: ["ArrowUp"],
  both: ["ArrowLeft", "ArrowUp"],
}

/** Props to spread on a roving item. `id` must be stable and unique in the group. */
export function useRovingFocusItem(id: string, options: { disabled?: boolean } = {}) {
  const { orientation, loop, currentId, setCurrentId, groupRef } = useRoving()
  const isCurrent = currentId === id
  // Fallback (currentId not yet established): everything tabbable for one tick.
  const tabIndex = options.disabled ? -1 : isCurrent || currentId === null ? 0 : -1

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const group = groupRef.current
      if (!group) return
      const items = Array.from(group.querySelectorAll<HTMLElement>("[data-roving-item]:not([data-disabled])"))
      if (items.length === 0) return
      const idx = items.indexOf(event.currentTarget)
      // null = key not handled; -1 is a VALID computed index (ArrowLeft on the
      // first item) that must fall through to the wrap logic below.
      let next: number | null = null
      if (NEXT_KEYS[orientation].includes(event.key)) next = idx + 1
      else if (PREV_KEYS[orientation].includes(event.key)) next = idx - 1
      else if (event.key === "Home") next = 0
      else if (event.key === "End") next = items.length - 1
      if (next === null) return

      event.preventDefault()
      if (next < 0) next = loop ? items.length - 1 : 0
      if (next >= items.length) next = loop ? 0 : items.length - 1
      const target = items[next]
      // focusing fires the target's own onFocus, which records the new currentId
      target.focus()
    },
    [groupRef, orientation, loop],
  )

  return {
    id,
    tabIndex,
    "data-roving-item": "",
    ...(options.disabled ? { "data-disabled": "" } : {}),
    onKeyDown,
    onFocus: () => setCurrentId(id),
  }
}
