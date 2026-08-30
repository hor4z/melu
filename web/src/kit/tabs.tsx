import { createContext, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn, useControllableState } from './lib'

type Ctx = { value: string; setValue: (v: string) => void; variant: 'line' | 'pill'; base: string }
const TabsCtx = createContext<Ctx | null>(null)
const useTabsCtx = () => {
  const c = useContext(TabsCtx)
  if (!c) throw new Error('Usá los componentes de Tabs dentro de <Tabs>')
  return c
}

export function Tabs({ value, defaultValue = '', onValueChange, variant = 'line', className, children, ...props }: Omit<ComponentPropsWithoutRef<'div'>, 'onChange' | 'defaultValue'> & { value?: string; defaultValue?: string; onValueChange?: (v: string) => void; variant?: 'line' | 'pill' }) {
  const [val, setVal] = useControllableState({ value, defaultValue, onChange: onValueChange })
  const base = `tabs-${defaultValue || 'x'}`
  return (
    <TabsCtx.Provider value={{ value: val, setValue: setVal, variant, base }}>
      <div className={cn('flex flex-col gap-4', className)} {...props}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabsList({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  const t = useTabsCtx()
  const mover = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'Home' ? items[0] : e.key === 'End' ? items[items.length - 1]
      : items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length]
    next?.focus(); next?.click()
  }
  return (
    <div role="tablist" onKeyDown={mover}
      className={cn('flex flex-wrap items-center', t.variant === 'line' ? 'gap-1 border-b border-line' : 'gap-1 rounded-lg bg-muted p-1', className)} {...props}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children, disabled, ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'value'> & { value: string; children: ReactNode }) {
  const t = useTabsCtx()
  const activo = t.value === value
  return (
    <button type="button" role="tab" id={`${t.base}-t-${value}`} aria-controls={`${t.base}-p-${value}`} aria-selected={activo}
      tabIndex={activo ? 0 : -1} disabled={disabled} onClick={() => t.setValue(value)}
      className={cn('inline-flex items-center gap-2 whitespace-nowrap px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-focus/30 disabled:opacity-45',
        t.variant === 'line'
          ? cn('-mb-px h-10 border-b-2', activo ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink')
          : cn('h-8 rounded-md', activo ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'),
        className)}
      {...props}>{children}</button>
  )
}

export function TabsContent({ value, className, ...props }: ComponentPropsWithoutRef<'div'> & { value: string }) {
  const t = useTabsCtx()
  if (t.value !== value) return null
  return <div role="tabpanel" id={`${t.base}-p-${value}`} aria-labelledby={`${t.base}-t-${value}`} tabIndex={0} className={cn('outline-none', className)} {...props} />
}
