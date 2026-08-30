import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import styles from "./pagination.module.css"

type PageItem = number | "start-ellipsis" | "end-ellipsis"

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i)

/** "1 … 4 5 6 … 20" — constant item count: first + last + current + siblings + 2 ellipsis slots. */
function paginationRange(page: number, count: number, siblings: number): PageItem[] {
  if (count <= siblings * 2 + 5) return range(1, count)

  const start = Math.max(Math.min(page - siblings, count - siblings * 2 - 2), 3)
  const end = Math.min(Math.max(page + siblings, siblings * 2 + 3), count - 2)

  return [1, start > 3 ? "start-ellipsis" : 2, ...range(start, end), end < count - 2 ? "end-ellipsis" : count - 1, count]
}

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Current page (1-based). */
  page: number
  /** Total number of pages. */
  count: number
  onPageChange: (page: number) => void
  /** Pages shown on each side of the current page. */
  siblings?: number
}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ page, count, onPageChange, siblings = 1, className, ...props }, ref) => {
    const items = paginationRange(page, count, siblings)

    return (
      <nav ref={ref} aria-label="Pagination" className={cx(styles.pagination, className)} {...props}>
        <ul className={styles.list}>
          <li>
            <button
              type="button"
              aria-label="Previous page"
              className={styles.item}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <Icon icon={ChevronLeft} size="sm" />
            </button>
          </li>
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <button
                  type="button"
                  aria-current={item === page ? "page" : undefined}
                  className={cx(styles.item, item === page && styles.current)}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              </li>
            ) : (
              <li key={item}>
                <span aria-hidden="true" className={styles.ellipsis}>
                  …
                </span>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              aria-label="Next page"
              className={styles.item}
              disabled={page >= count}
              onClick={() => onPageChange(page + 1)}
            >
              <Icon icon={ChevronRight} size="sm" />
            </button>
          </li>
        </ul>
      </nav>
    )
  },
)

Pagination.displayName = "Pagination"
