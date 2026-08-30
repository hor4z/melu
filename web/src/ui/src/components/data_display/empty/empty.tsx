import React, { createContext, useContext } from "react"
import type { LucideIcon } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import styles from "./empty.module.css"

interface EmptyContextValue {
  src?: string
}

const EmptyContext = createContext<EmptyContextValue | null>(null)

function useEmpty() {
  const ctx = useContext(EmptyContext)
  if (!ctx) {
    throw new Error("Empty.* must be used inside <Empty />")
  }
  return ctx
}

interface EmptyRootProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  /** Convenience: renders a 28px lucide icon inside a 56px raised circle on top. */
  icon?: LucideIcon
  children: React.ReactNode
}

export function Empty({ src, icon, children, className = "", ...props }: EmptyRootProps) {
  return (
    <EmptyContext.Provider value={{ src }}>
      <div className={cx(styles.empty, className)} {...props}>
        {icon && (
          <div className={styles.icon_circle} aria-hidden="true">
            <Icon icon={icon} size={28} />
          </div>
        )}
        {children}
      </div>
    </EmptyContext.Provider>
  )
}

function EmptyAsset({ className = "", ...props }: React.HTMLAttributes<HTMLImageElement>) {
  const { src } = useEmpty()
  if (!src) return null
  return <img alt="Empty State Image" src={src} className={cx(styles.asset, className)} {...props} />
}

interface MediaProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

/** Generic top slot for an icon or illustration — renders children centered, sizing is up to the consumer. */
function EmptyMedia({ children, className = "", ...props }: MediaProps) {
  return (
    <div className={cx(styles.media, className)} {...props}>
      {children}
    </div>
  )
}

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

function EmptyContent({ children, className = "", ...props }: ContentProps) {
  return (
    <div className={cx(styles.content, className)} {...props}>
      {children}
    </div>
  )
}

interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode
}

function EmptyTitle({ children, className = "", ...props }: TitleProps) {
  return (
    <h1 className={cx(styles.title, className)} {...props}>
      {children}
    </h1>
  )
}

interface DescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode
}

function EmptyDescription({ children, className = "", ...props }: DescriptionProps) {
  return (
    <p className={cx(styles.description, className)} {...props}>
      {children}
    </p>
  )
}

interface ActionProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

function EmptyAction({ children, className = "", ...props }: ActionProps) {
  return (
    <div className={cx(styles.action, className)} {...props}>
      {children}
    </div>
  )
}

Empty.Icon = EmptyAsset
Empty.Media = EmptyMedia
Empty.Content = EmptyContent
Empty.Title = EmptyTitle
Empty.Description = EmptyDescription
Empty.Action = EmptyAction

Empty.displayName = "Empty.Root"
EmptyAsset.displayName = "Empty.Icon"
EmptyMedia.displayName = "Empty.Media"
EmptyContent.displayName = "Empty.Content"
EmptyTitle.displayName = "Empty.Title"
EmptyDescription.displayName = "Empty.Description"
EmptyAction.displayName = "Empty.Action"

/** Astryx-style alias for the same component. */
export const EmptyState = Empty
