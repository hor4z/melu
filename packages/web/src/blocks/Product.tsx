// Piezas de melu armadas sobre milo. Codifican decisiones de producto (la unidad del panel, el
// copy del menú de cuenta) así que viven acá y no en el design system.
import { Avatar, Card, Dropdown, Icon, Steps, type IconName } from '@milo/ui'
import { cn } from '../lib/cn'

/** La métrica del panel: el rótulo arriba con su glifo, y el número grande abajo. Las medidas
 *  son las del dashboard del sistema: 20 de padding, 12 de aire, el número en display. */
export function Stat({ label, value, aside, icon, tone = 'up' }: {
  label: string
  value: string | number
  /** Lo que va al lado del número, chico: una cuenta que lo apoya. */
  aside?: string
  icon: IconName
  tone?: 'up' | 'down'
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body text-text-muted">{label}</span>
        <Icon name={icon} size={16} className="icon-muted" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="tabular text-display font-bold">{value}</span>
        {aside && <span className={cn('text-meta font-semibold', tone === 'up' ? 'text-ok-ink' : 'text-warn-ink')}>{aside}</span>}
      </div>
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
