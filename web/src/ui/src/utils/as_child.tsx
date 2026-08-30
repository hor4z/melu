/** Compose two event handlers; the first can preventDefault to skip the second. */
export function composeEventHandlers<E extends { defaultPrevented?: boolean }>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    theirs?.(event)
    if (!event?.defaultPrevented) ours(event)
  }
}

// NOTE: for asChild composition use core/slot.tsx <Slot> — it merges className,
// style, refs and ALL event handlers. (A weaker `renderSlot` helper used to
// live here; it was removed to keep a single asChild implementation.)
