import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./card.module.css"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds hover affordance for clickable cards. */
  interactive?: boolean
}

export function Card({ interactive = false, className, ...props }: CardProps) {
  return <div className={cx(styles.card, interactive && styles.interactive, className)} {...props} />
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.header, className)} {...props} />
}

function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.body, className)} {...props} />
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.footer, className)} {...props} />
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx(styles.title, className)} {...props} />
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(styles.description, className)} {...props} />
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter
Card.Title = CardTitle
Card.Description = CardDescription

Card.displayName = "Card"
CardHeader.displayName = "Card.Header"
CardBody.displayName = "Card.Body"
CardFooter.displayName = "Card.Footer"
CardTitle.displayName = "Card.Title"
CardDescription.displayName = "Card.Description"
