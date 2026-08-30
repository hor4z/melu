import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./list.module.css"

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {}

export function List({ className, ...props }: ListProps) {
  return <ul className={cx(styles.list, className)} {...props} />
}

export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Adds hover affordance for clickable rows. */
  interactive?: boolean
}

function ListItem({ interactive = false, className, ...props }: ListItemProps) {
  return <li className={cx(styles.item, interactive && styles.interactive, className)} {...props} />
}

function ListItemText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.text, className)} {...props} />
}

function ListItemTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.title, className)} {...props} />
}

function ListItemDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.description, className)} {...props} />
}

function ListItemAction({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.action, className)} {...props} />
}

List.Item = ListItem
List.ItemText = ListItemText
List.ItemTitle = ListItemTitle
List.ItemDescription = ListItemDescription
List.ItemAction = ListItemAction

List.displayName = "List"
ListItem.displayName = "List.Item"
ListItemText.displayName = "List.ItemText"
ListItemTitle.displayName = "List.ItemTitle"
ListItemDescription.displayName = "List.ItemDescription"
ListItemAction.displayName = "List.ItemAction"
