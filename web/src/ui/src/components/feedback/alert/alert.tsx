import React from "react"
import { Info, CircleCheck, TriangleAlert, CircleX, type LucideIcon } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import styles from "./alert.module.css"

type AlertVariant = "info" | "success" | "warning" | "danger"

const VARIANT_ICON: Record<AlertVariant, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
}

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant
  title?: React.ReactNode
  /** Pass false to hide the leading icon, or a lucide icon to override. */
  icon?: false | LucideIcon
}

export function Alert({ variant = "info", title, icon, className, children, ...props }: AlertProps) {
  const IconComp = icon === false ? null : (icon ?? VARIANT_ICON[variant])
  return (
    <div role="alert" className={cx(styles.alert, styles[variant], className)} {...props}>
      {IconComp && (
        <span className={styles.icon} aria-hidden="true">
          <Icon icon={IconComp} size="md" />
        </span>
      )}
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
    </div>
  )
}

Alert.displayName = "Alert"
