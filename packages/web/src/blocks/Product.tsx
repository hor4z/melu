// Piezas de melu armadas sobre el design system. Codifican decisiones de producto —la
// unidad del panel, el copy del menú de cuenta— así que viven acá y no en @melu/ui.
import type { ReactNode } from 'react'
import { LogOut, RefreshCw, User } from 'lucide-react'
import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Icon, MenuButton, Sparkline, cn } from '@melu/ui'

/** Metric with a tint, a big number and a trend. The dashboard's unit. */
export function StatTile({ label, value, unit, delta, series, tint = 'bg-teal', icon, hint }: {
  label: string; value: string | number; unit?: string; delta?: number; series?: number[]; tint?: string; icon?: ReactNode; hint?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 overflow-hidden rounded-xl p-5', tint)}>
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-lg bg-white/70 text-ink">{icon}</span>
        {typeof delta === 'number' && (
          <span className={cn('rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums', delta >= 0 ? 'text-success' : 'text-danger')}>
            {delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-ink-muted">{label}</div>
          <div className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {value}{unit && <span className="ml-1 text-base font-medium text-ink-muted">{unit}</span>}
          </div>
          {hint && <div className="mt-0.5 text-xs text-ink-subtle">{hint}</div>}
        </div>
        {series && <Sparkline data={series} className="text-ink/70" />}
      </div>
    </div>
  )
}
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Pasos">
      {steps.map((p, i) => (
        <li key={p} className="flex items-center gap-2">
          <span className={cn('grid size-7 place-items-center rounded-full text-xs font-bold',
            i < current ? 'bg-accent text-white' : i === current ? 'bg-solid text-on-solid' : 'border-2 border-line text-ink-subtle')}>
            {i < current ? '✓' : i + 1}
          </span>
          <span className={cn('text-sm', i === current ? 'font-semibold' : 'text-ink-muted')}>{p}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-line" />}
        </li>
      ))}
    </ol>
  )
}
/** Avatar that opens the account menu. */
export function UserMenu({ name, email, subtitle, onProfile, onChangeSpace, onSignOut }: {
  name: string; email?: string; subtitle?: string; onProfile?: () => void; onChangeSpace?: () => void; onSignOut: () => void
}) {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger>
        <MenuButton compact aria-label="Menú de la cuenta" leading={<Avatar name={name} size="sm" />} description={subtitle}>
          {name}
        </MenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent minWidth={230}>
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold normal-case tracking-normal text-ink">{name}</span>
          {email && <span className="block text-xs font-normal normal-case tracking-normal text-ink-subtle">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onProfile && <DropdownMenuItem icon={<Icon icon={User} size="sm" />} onClick={onProfile}>Mi perfil</DropdownMenuItem>}
        {onChangeSpace && <DropdownMenuItem icon={<Icon icon={RefreshCw} size="sm" />} onClick={onChangeSpace}>Cambiar de espacio</DropdownMenuItem>}
        {(onProfile || onChangeSpace) && <DropdownMenuSeparator />}
        <DropdownMenuItem icon={<Icon icon={LogOut} size="sm" />} onClick={onSignOut}>Salir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
