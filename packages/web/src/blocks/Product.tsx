// Piezas de melu armadas sobre milo. Codifican decisiones de producto (la unidad del panel, el
// copy del menú de cuenta) así que viven acá y no en el design system.
import { Avatar, Card, Dropdown, Icon, Steps, type IconName } from '@milo/ui'
import { cn } from '../lib/cn'

/** La métrica del panel: el rótulo arriba, el número grande y cuánto se movió. */
export function Stat({ label, value, delta, icon, hint, tone = 'up' }: {
  label: string
  value: string | number
  /** Ya formateado, con su signo: lo arma `delta()` de milo. */
  delta?: string
  icon: IconName
  hint?: string
  tone?: 'up' | 'down'
}) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-text-muted">{label}</span>
        <Icon name={icon} size={16} className="icon-muted" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="tabular text-heading">{value}</span>
        {delta && <span className={cn('text-label', tone === 'up' ? 'text-ok-ink' : 'text-bad-ink')}>{delta}</span>}
      </div>
      {hint && <span className="text-meta text-text-muted">{hint}</span>}
    </Card>
  )
}

/** Los pasos de un alta, en orden. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return <Steps label="Pasos" current={current} steps={steps.map((label) => ({ label }))} />
}

/** El avatar que abre el menú de la cuenta. */
export function UserMenu({ name, email, avatar, onSettings, onChangeSpace, onSignOut }: {
  name: string
  email?: string
  avatar?: string
  onSettings?: () => void
  onChangeSpace?: () => void
  onSignOut: () => void
}) {
  return (
    <Dropdown
      align="end"
      width={230}
      label={email ? `${name} · ${email}` : name}
      trigger={({ onClick, ref, 'aria-expanded': expanded }) => (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-expanded={expanded}
          aria-label={`Cuenta de ${name}`}
          className="touch-target rounded-full"
        >
          <Avatar name={name} src={avatar} size={34} />
        </button>
      )}
      items={[
        ...(onSettings ? [{ label: 'Ajustes', icon: 'settings' as const, onSelect: onSettings }] : []),
        ...(onChangeSpace ? [{ label: 'Cambiar de espacio', icon: 'sync' as const, onSelect: onChangeSpace }] : []),
        { label: 'Salir', icon: 'logout' as const, danger: true, onSelect: () => void onSignOut() },
      ]}
    />
  )
}
