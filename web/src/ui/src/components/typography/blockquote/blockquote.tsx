import React, { forwardRef } from "react"
import { cx } from "../../../utils/cx"
import styles from "./blockquote.module.css"

export interface BlockquoteProps extends React.BlockquoteHTMLAttributes<HTMLQuoteElement> {
  /** Source URL of the quote (native <blockquote cite> attribute). */
  cite?: string
}

export const Blockquote = forwardRef<HTMLQuoteElement, BlockquoteProps>(({ cite, className, ...props }, ref) => {
  return <blockquote ref={ref} cite={cite} className={cx(styles.blockquote, className)} {...props} />
})

Blockquote.displayName = "Blockquote"
