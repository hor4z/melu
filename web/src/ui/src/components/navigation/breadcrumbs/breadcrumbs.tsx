import React, { Children, Fragment, isValidElement } from "react"
import { ChevronRight } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Slot } from "../../../core/slot"
import { Icon } from "../../../icons/icon"
import styles from "./breadcrumbs.module.css"

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {}

export function Breadcrumbs({ className, children, ...props }: BreadcrumbsProps) {
  const items = Children.toArray(children).filter(isValidElement)

  return (
    <nav aria-label="Breadcrumb" className={cx(styles.breadcrumbs, className)} {...props}>
      <ol className={styles.list}>
        {items.map((child, index) => (
          <Fragment key={child.key ?? index}>
            {index > 0 && (
              <li aria-hidden="true" className={styles.separator}>
                <Icon icon={ChevronRight} size="sm" />
              </li>
            )}
            {child}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

export interface BreadcrumbsItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Marks the current page: plain text with `aria-current="page"` instead of a link. */
  current?: boolean
  /** Merge props onto a custom link element (e.g. a router <Link>). */
  asChild?: boolean
}

function BreadcrumbsItem({ current = false, asChild = false, className, children, ...props }: BreadcrumbsItemProps) {
  const linkProps = {
    "aria-current": current ? ("page" as const) : undefined,
    className: cx(styles.link, current && styles.current, className),
    ...props,
  }

  return (
    <li className={styles.item}>
      {asChild ? (
        <Slot {...linkProps}>{children}</Slot>
      ) : current ? (
        <span {...linkProps}>{children}</span>
      ) : (
        <a {...linkProps}>{children}</a>
      )}
    </li>
  )
}

Breadcrumbs.Item = BreadcrumbsItem
Breadcrumbs.displayName = "Breadcrumbs"
BreadcrumbsItem.displayName = "Breadcrumbs.Item"
