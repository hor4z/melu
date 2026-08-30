import React from "react"
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import styles from "./table.module.css"

export type SortDirection = "asc" | "desc" | false

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Compact row density. */
  dense?: boolean
  /** Zebra striping. */
  striped?: boolean
}

function TableRoot({ dense = false, striped = false, className, children, ...props }: TableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={cx(styles.table, dense && styles.dense, striped && styles.striped, className)} {...props}>
        {children}
      </table>
    </div>
  )
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cx(styles.thead, className)} {...props} />
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx(styles.tbody, className)} {...props} />
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Hover + pointer affordance for clickable rows. */
  interactive?: boolean
  selected?: boolean
}

function TableRow({ interactive = false, selected = false, className, ...props }: TableRowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cx(styles.tr, interactive && styles.interactive, selected && styles.selected, className)}
      {...props}
    />
  )
}

export interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Sort state for sortable columns; renders the sort affordance. */
  sort?: SortDirection
  onSortChange?: (next: SortDirection) => void
  align?: "left" | "center" | "right"
}

function TableHeaderCell({ sort, onSortChange, align = "left", className, children, ...props }: TableHeaderCellProps) {
  const sortable = onSortChange !== undefined
  const ariaSort = sort === "asc" ? "ascending" : sort === "desc" ? "descending" : sortable ? "none" : undefined

  const cycle = () => {
    if (!onSortChange) return
    onSortChange(sort === "asc" ? "desc" : sort === "desc" ? false : "asc")
  }

  return (
    <th aria-sort={ariaSort} className={cx(styles.th, styles[`align_${align}`], className)} {...props}>
      {sortable ? (
        <button type="button" className={styles.sort_button} onClick={cycle}>
          {children}
          <span className={styles.sort_icon} aria-hidden="true">
            {sort === "asc" ? (
              <Icon icon={ArrowUp} size={12} />
            ) : sort === "desc" ? (
              <Icon icon={ArrowDown} size={12} />
            ) : (
              <Icon icon={ChevronsUpDown} size={12} />
            )}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right"
  /** Render with the mono voice (numbers, ids). */
  mono?: boolean
}

function TableCell({ align = "left", mono = false, className, ...props }: TableCellProps) {
  return <td className={cx(styles.td, styles[`align_${align}`], mono && styles.mono, className)} {...props} />
}

function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cx(styles.caption, className)} {...props} />
}

export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
  Caption: TableCaption,
})

TableRoot.displayName = "Table"
TableHeader.displayName = "Table.Header"
TableBody.displayName = "Table.Body"
TableRow.displayName = "Table.Row"
TableHeaderCell.displayName = "Table.HeaderCell"
TableCell.displayName = "Table.Cell"
TableCaption.displayName = "Table.Caption"
