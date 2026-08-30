import React, { forwardRef } from "react"
import { ArrowUpRight } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import { Icon } from "../../../icons/icon"
import { VisuallyHidden } from "../../../core/visually_hidden"
import styles from "./link.module.css"

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "default" | "muted"
  /** Underline behavior: "auto" underlines on hover only, "always" is persistent, "none" never underlines. */
  underline?: "auto" | "always" | "none"
  /** Opens in a new tab (target="_blank" rel="noreferrer noopener") with a trailing ArrowUpRight icon. */
  external?: boolean
  /** Standalone (non-inline) link: medium weight, inline-flex with icon gap. */
  standalone?: boolean
  /** Render the single child element instead of an <a>, merging behavior. */
  asChild?: boolean
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    { variant = "default", underline = "auto", external = false, standalone = false, asChild = false, className, children, ...props },
    ref,
  ) => {
    const classes = cx(
      styles.link,
      variant !== "default" && styles[variant],
      underline === "always" && styles.underline_always,
      underline === "none" && styles.underline_none,
      standalone && styles.standalone,
      className,
    )

    const externalProps = external ? { target: "_blank", rel: "noreferrer noopener" } : {}

    if (asChild) {
      return (
        <Slot ref={ref as React.Ref<HTMLElement>} className={classes} {...externalProps} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <a ref={ref} className={classes} {...externalProps} {...props}>
        {children}
        {external && (
          <>
            <Icon icon={ArrowUpRight} size={12} className={styles.external_icon} />
            <VisuallyHidden>(abre en una pestaña nueva)</VisuallyHidden>
          </>
        )}
      </a>
    )
  },
)

Link.displayName = "Link"
