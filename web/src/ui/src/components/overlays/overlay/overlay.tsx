import { cx } from "../../../utils/cx"
import styles from "./overlay.module.css"

interface OverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function Overlay({ className, children, ...props }: OverlayProps) {
  return (
    <div className={cx(styles.overlay, className)} {...props}>
      {children}
    </div>
  )
}

Overlay.displayName = "Overlay"
