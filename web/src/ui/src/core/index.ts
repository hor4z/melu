// @rant/ui core — shared, unstyled primitives that every component composes.
export { composeRefs, useComposedRefs } from "./compose_refs"
export { Slot, type SlotProps } from "./slot"
export { Presence, usePresence, type PresenceProps, type PresenceState } from "./presence"
export { VisuallyHidden, type VisuallyHiddenProps } from "./visually_hidden"
export { useScrollLock } from "./use_scroll_lock"
export { DismissableLayer, type DismissableLayerProps } from "./dismissable_layer"
export { FocusScope, type FocusScopeProps } from "./focus_scope"
export { RovingFocusGroup, useRovingFocusItem, type RovingFocusGroupProps } from "./roving_focus"
export { usePopper, type UsePopperOptions, type Placement } from "./popper"
export { ThemeProvider, useTheme, type ThemeProviderProps, type ColorScheme, type Direction } from "./theme_provider"

// re-exported existing primitives that belong to the core layer
export { useControllableState } from "../hooks/use_controllable_state"
export { Portal, type PortalProps } from "./portal"
export { composeEventHandlers } from "../utils/as_child"
