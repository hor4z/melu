import { cx } from "../../../utils/cx"
import styles from "./scroll_area.module.css"

export default function ScrollArea({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.scroll_area, className)} {...props} />
}
