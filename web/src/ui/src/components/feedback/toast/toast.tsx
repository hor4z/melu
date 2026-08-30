import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import { Info, CircleCheck, TriangleAlert, CircleX, X, type LucideIcon } from "lucide-react"
import { cx } from "../../../utils/cx"
import { Icon } from "../../../icons/icon"
import { Portal } from "../../../core/portal"
import styles from "./toast.module.css"

type ToastVariant = "info" | "success" | "warning" | "danger"

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
}

export interface ToastOptions {
  title: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
  /** Auto-dismiss delay in ms; pass 0 to disable. */
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx
}

export interface ToastProviderProps {
  children: React.ReactNode
  /** Corner of the screen for the viewport. */
  placement?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
}

export function ToastProvider({ children, placement = "bottom-right" }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      seq.current += 1
      const id = `toast-${seq.current}`
      const duration = options.duration ?? 4000
      setItems((prev) => [...prev, { ...options, id }])
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {items.length > 0 && (
        <Portal containerId="toast-root">
          <div className={cx(styles.viewport, styles[placement])} role="region" aria-label="Notificaciones">
            {items.map((t) => {
              const IconComp = VARIANT_ICON[t.variant ?? "info"]
              return (
                <div key={t.id} className={cx(styles.toast, styles[t.variant ?? "info"])} role="status">
                  <span className={styles.icon} aria-hidden="true">
                    <Icon icon={IconComp} size="md" />
                  </span>
                  <div className={styles.content}>
                    <p className={styles.title}>{t.title}</p>
                    {t.description && <p className={styles.description}>{t.description}</p>}
                  </div>
                  <button type="button" className={styles.close} aria-label="Cerrar" onClick={() => dismiss(t.id)}>
                    <Icon icon={X} size="sm" />
                  </button>
                </div>
              )
            })}
          </div>
        </Portal>
      )}
    </ToastContext.Provider>
  )
}

ToastProvider.displayName = "ToastProvider"
