import React from "react"
import { cx } from "../../../utils/cx"
import styles from "./avatar.module.css"
import { ranco } from "../../../random/generate_color"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  src?: string
  size?: "sm" | "md" | "lg"
  clickable?: boolean
  onClick?: () => void
}

export function Avatar({ name = "", src, size = "md", clickable = false, onClick, className, ...props }: AvatarProps) {
  const color = src ? undefined : ranco(name)
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div
      className={cx(styles.avatar, styles[`avatar--${size}`], className)}
      onClick={clickable ? onClick : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : undefined}
      aria-label={`Avatar de ${name}`}
      {...props}
    >
      {src ? (
        <img className={styles.avatar__image} src={src} alt={`Avatar de ${name}`} loading="lazy" />
      ) : (
        <span className={styles.avatar__fallback} aria-hidden="true" style={{ backgroundColor: color }}>
          {initials}
        </span>
      )}
    </div>
  )
}

Avatar.displayName = "Avatar"
