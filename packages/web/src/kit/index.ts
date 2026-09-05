// melu's kit. Composed components, styled with Tailwind on top of the theme tokens.
// Conventions: `asChild` to lend the styles to another element, `cn()` to merge classes,
// and controlled or uncontrolled state in every one that holds something.
export { cn, Slot, composeRefs, useControllableState, type SlotProps } from './lib'
export { Icon, type IconProps } from './icon'
export { Spinner } from './spinner'
export { Button, ButtonGroup, buttonVariants, type ButtonProps } from './button'
export { IconButton, type IconButtonProps } from './icon-button'
export { Field, FieldLabel, FieldDescription, FieldStatus, Form, FormRow, FormActions, useField, fieldAria, type FieldProps, type FieldState } from './field'
export { Input, Textarea, type InputProps, type TextareaProps } from './input'
export { Switch, type SwitchProps } from './switch'
export { Checkbox, type CheckboxProps } from './checkbox'
export { RadioGroup, RadioGroupItem, RadioCard, type RadioGroupProps, type RadioGroupItemProps } from './radio'
export { Toggle, ToggleGroup, ToggleGroupItem, type ToggleProps, type ToggleGroupProps } from './toggle'
export { SegmentedControl, SegmentedControlItem, type SegmentedControlProps } from './segmented'
export { Slider, type SliderProps } from './slider'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardMedia, type CardProps } from './card'
export { Chip, Badge, type ChipProps } from './chip'
export { Avatar, AvatarGroup, initials, tintOf, type AvatarProps } from './avatar'
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, MoreMenu,
  type DropdownMenuProps, type DropdownMenuItemProps, type MenuOption,
} from './dropdown'
export {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator, NativeSelect,
  type SelectProps, type SelectItemProps,
} from './select'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose, type DialogProps } from './dialog'
export { Tooltip, TooltipTrigger, TooltipContent } from './tooltip'
export { Popover, PopoverAnchor, PopoverTrigger, PopoverContent, PopoverClose } from './popover'
export { Portal } from './portal'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { Alert, Separator, Skeleton, Progress, EmptyState, type AlertProps } from './feedback'
export { Text, Heading, Eyebrow, Kbd, type TextProps, type HeadingProps } from './text'
export { Logo, Logomark, Sparkline, StatTile, ProgressRing, Stepper, Squiggle, Counter, PhotoFrame, UserMenu } from './melu'
export * from './doodles'
export { Character } from './character'
