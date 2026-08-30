// @rant/ui — tech-agnostic UI kit. Import tokens once via "@rant/ui/tokens/index.css".

// utilities
export { cx } from "./src/utils/cx"
export { Icon, type IconProps } from "./src/icons/icon"

// core primitives (Radix-style building blocks)
export {
  Slot,
  type SlotProps,
  composeRefs,
  useComposedRefs,
  Presence,
  usePresence,
  type PresenceProps,
  VisuallyHidden,
  type VisuallyHiddenProps,
  useScrollLock,
  DismissableLayer,
  type DismissableLayerProps,
  FocusScope,
  type FocusScopeProps,
  RovingFocusGroup,
  useRovingFocusItem,
  type RovingFocusGroupProps,
  usePopper,
  type Placement,
  ThemeProvider,
  useTheme,
  type ThemeProviderProps,
  type ColorScheme,
} from "./src/core"

// hooks
export { useControllableState } from "./src/hooks/use_controllable_state"
export { useClickAway } from "./src/hooks/use_click_away"
export { useResize } from "./src/hooks/use_resize"

// primitives — leaves
export { Button, type ButtonProps } from "./src/components/buttons/button/button"
export { ButtonIcon, type ButtonIconProps } from "./src/components/buttons/button_icon/button_icon"
export { Avatar, type AvatarProps } from "./src/components/data_display/avatar/avatar"
export { Badge, type BadgeProps } from "./src/components/data_display/badge/badge"
export { Empty, EmptyState } from "./src/components/data_display/empty/empty"
export { Input, type InputProps } from "./src/components/forms/input/input"
export { Textarea, type TextareaProps } from "./src/components/forms/textfield/textarea"
export { Switch, type SwitchProps } from "./src/components/forms/switch/switch"
export {
  Toggle,
  ToggleGroup,
  type ToggleProps,
  type ToggleGroupProps,
  type ToggleGroupItemProps,
} from "./src/components/buttons/toggle/toggle"
export { Overlay } from "./src/components/overlays/overlay/overlay"
export { Portal, type PortalProps } from "./src/core/portal"
export { default as ScrollArea } from "./src/components/data_display/scroll_area/scroll_area"
export { Card, type CardProps } from "./src/components/data_display/card/card"
export { Separator, type SeparatorProps } from "./src/components/layout/separator/separator"
export { Skeleton, type SkeletonProps } from "./src/components/data_display/skeleton/skeleton"
export { Spinner, type SpinnerProps } from "./src/components/data_display/spinner/spinner"
export { Alert, type AlertProps } from "./src/components/feedback/alert/alert"
export { Checkbox, type CheckboxProps } from "./src/components/forms/checkbox/checkbox"
export { CheckboxList, type CheckboxListProps, type CheckboxListItemProps } from "./src/components/forms/checkbox_list/checkbox_list"
export { RadioGroup, type RadioGroupProps, type RadioGroupItemProps } from "./src/components/forms/radio/radio"
export { type RadioGroupLabelProps, type RadioGroupDescriptionProps, type RadioGroupErrorProps } from "./src/components/forms/radio/radio"
export { Select, type SelectProps } from "./src/components/forms/select/select"

// feedback / overlays
export { Tooltip, type TooltipProps } from "./src/components/overlays/tooltip/tooltip"
export { ToastProvider, useToast, type ToastOptions, type ToastProviderProps } from "./src/components/feedback/toast/toast"

// primitives — overlays (Radix-style compound)
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  usePopoverContext,
  type PopoverProps,
  type PopoverPosition,
  type PopoverContextProps,
  type PopoverTriggerProps,
  type PopoverContentProps,
  type PopoverCloseProps,
} from "./src/components/overlays/popover/popover"
export { Dropdown } from "./src/components/overlays/dropdown_menu/dropdown"
export {
  Dialog,
  type DialogRootProps,
  type DialogTriggerProps,
  type DialogContentProps,
  type DialogCloseProps,
  type DialogHeaderProps,
  type DialogBodyProps,
  type DialogFooterProps,
} from "./src/components/overlays/dialog/dialog"
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  type ModalRootProps,
  type ModalTriggerProps,
  type ModalContentProps,
  type ModalCloseProps,
} from "./src/components/overlays/modal/modal"

// typography
export { Heading, type HeadingProps } from "./src/components/typography/heading/heading"
export { Text, type TextProps } from "./src/components/typography/text/text"
export { Code, type CodeProps } from "./src/components/typography/code/code"
export { Kbd, type KbdProps } from "./src/components/typography/kbd/kbd"
export { Blockquote, type BlockquoteProps } from "./src/components/typography/blockquote/blockquote"
export { Link, type LinkProps } from "./src/components/typography/link/link"

// layout
export { Stack, HStack, VStack, type StackProps, type HStackProps, type VStackProps } from "./src/components/layout/stack/stack"
export { Grid, GridSpan, type GridProps, type GridSpanProps } from "./src/components/layout/grid/grid"
export { Center, type CenterProps } from "./src/components/layout/center/center"
export { Section, type SectionProps } from "./src/components/layout/section/section"

// navigation
export {
  Tabs,
  type TabsRootProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
} from "./src/components/navigation/tabs/tabs"

// data display (compound)
export {
  Table,
  type TableProps,
  type TableRowProps,
  type TableCellProps,
  type TableHeaderCellProps,
  type SortDirection,
} from "./src/components/data_display/table/table"

// overlays (new)
export {
  AlertDialog,
  type AlertDialogRootProps,
  type AlertDialogTriggerProps,
  type AlertDialogContentProps,
  type AlertDialogActionProps,
  type AlertDialogCancelProps,
} from "./src/components/overlays/alert_dialog/alert_dialog"
export { HoverCard, type HoverCardProps } from "./src/components/overlays/hover_card/hover_card"
export {
  ContextMenu,
  type ContextMenuRootProps,
  type ContextMenuTriggerProps,
  type ContextMenuContentProps,
  type ContextMenuItemProps,
} from "./src/components/overlays/context_menu/context_menu"

// buttons+
export { ButtonGroup, type ButtonGroupProps } from "./src/components/buttons/button_group/button_group"
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedControlItemProps,
} from "./src/components/buttons/segmented_control/segmented_control"

// forms+
export {
  Field,
  type FieldProps,
  type FieldLabelProps,
  type FieldControlProps,
  type FieldStatusProps,
  type FieldDescriptionProps,
  type FieldStatusVariant,
} from "./src/components/forms/field/field"
export {
  Selector,
  MultiSelector,
  SelectorOption,
  type SelectorProps,
  type MultiSelectorProps,
  type SelectorOptionProps,
} from "./src/components/forms/selector/selector"

// data display+
export { StatusDot, type StatusDotProps } from "./src/components/data_display/status_dot/status_dot"
export { ProgressBar, type ProgressBarProps } from "./src/components/data_display/progress_bar/progress_bar"
export { Chip, type ChipProps } from "./src/components/data_display/chip/chip"
export { List, type ListProps, type ListItemProps } from "./src/components/data_display/list/list"

// navigation+
export { Breadcrumbs, type BreadcrumbsProps, type BreadcrumbsItemProps } from "./src/components/navigation/breadcrumbs/breadcrumbs"
export { Pagination, type PaginationProps } from "./src/components/navigation/pagination/pagination"
export { Toolbar, type ToolbarProps, type ToolbarGroupProps, type ToolbarSeparatorProps } from "./src/components/navigation/toolbar/toolbar"

// random
export { ranco } from "./src/random/generate_color"

// melu — primitivas propias sobre el kit
export { Logo, Logomark } from "./melu/logo"
export * from "./melu/doodles"
export { Eyebrow, Sparkline, StatTile, ProgressRing, PhotoFrame, LevelAccordion, Stepper, Subrayado, Contador, type NivelItem } from "./melu/primitivas"
export { UserMenu } from "./melu/user_menu"
