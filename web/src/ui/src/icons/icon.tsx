import type { ComponentPropsWithoutRef } from "react"
import type { LucideIcon } from "lucide-react"

// Astryx-aligned size scale: 12 / 14 / 16 / 20 / 24
const SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const

// Semantic color roles — icons adapt to theme via the token layer.
const COLOR_ROLES = {
  current: "currentColor",
  primary: "var(--text)",
  secondary: "var(--text-muted)",
  subtle: "var(--text-subtle)",
  disabled: "var(--text-disabled)",
  accent: "var(--accent)",
  info: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
} as const

export type IconColor = keyof typeof COLOR_ROLES

export interface IconProps extends Omit<ComponentPropsWithoutRef<LucideIcon>, "ref" | "size" | "color"> {
  /** Any lucide-react icon component — lucide is the kit's official icon set. */
  icon: LucideIcon
  size?: keyof typeof SIZES | number
  strokeWidth?: number
  /** Semantic role (theme-aware) or any CSS color. Defaults to currentColor. */
  color?: IconColor | (string & {})
}

/**
 * Standardizes lucide icons across the kit: fixed size scale (12–24px),
 * consistent stroke, and semantic theme-aware colors ("primary", "accent",
 * "danger", …) with `currentColor` by default.
 */
export function Icon({ icon: LucideComp, size = "md", strokeWidth = 2, color = "current", ...props }: IconProps) {
  const px = typeof size === "number" ? size : SIZES[size]
  const resolved = color in COLOR_ROLES ? COLOR_ROLES[color as IconColor] : color
  return <LucideComp size={px} strokeWidth={strokeWidth} color={resolved} aria-hidden="true" {...props} />
}
