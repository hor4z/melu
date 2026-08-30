import { useFloating, offset as offsetMw, flip, shift, autoUpdate, type Placement } from "@floating-ui/react"

export interface UsePopperOptions {
  placement?: Placement
  offset?: number
  padding?: number
}

/**
 * Shared positioning primitive over floating-ui with the kit's defaults.
 * Used by Popover, Tooltip, HoverCard, DropdownMenu, ContextMenu, Selector.
 */
export function usePopper({ placement = "bottom", offset = 8, padding = 8 }: UsePopperOptions = {}) {
  const { refs, floatingStyles, update, context } = useFloating({
    placement,
    middleware: [offsetMw(offset), flip({ padding }), shift({ padding })],
    whileElementsMounted: autoUpdate,
  })
  return {
    anchorRef: refs.setReference,
    floatingRef: refs.setFloating,
    floatingStyles,
    update,
    context,
    refs,
  }
}

export type { Placement }
