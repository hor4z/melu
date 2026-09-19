import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button, Dropdown, Field, Icon, IconButton, NavItemBody, Page, RadioGroup, Row, TextField, Tooltip,
  navItemClass, usePrefs, type IconName,
} from '@milo/ui'
import { Logo, Logomark } from './brand/logo'
import { UserMenu } from './blocks/Product'
import { useSignOut } from './lib/session'
import { useSpace } from './lib/space'
import { api, type Space, type SpaceKind, type Me } from './lib/api'
import { SPACE_KINDS } from './lib/composition'
import { Modal } from './blocks/Modal'

// Los destinos del docente, en el orden en que se visitan: primero qué pasa, después el
// trabajo del día, después la gente y el material.
//
// "Corregir" estaba en la aplicación y no en el panel: se llegaba solo por el "ver todas" de
// Inicio, así que la pantalla donde se pasa más tiempo era la única sin puerta de entrada.
const DESTINOS: [string, string, IconName][] = [
  ['/home', 'Inicio', 'dashboard'],
  // "Entregas", igual que el título de esa pantalla. Un destino que se llama distinto en el
  // panel y adentro obliga a comprobar que llegaste a donde querías.
  ['/submissions', 'Entregas', 'inbox'],
  ['/progress', 'Cómo vienen', 'analytics'],
  ['/groups', 'Grupos', 'group'],
  ['/activities', 'Actividades', 'menu_book'],
]

// Material de consulta, no un destino diario: se abre cuando aparece la duda y se cierra. Con
// los otros cinco arriba, competía por el ojo cada vez que alguien buscaba sus grupos.
const REFERENCIA: [string, string, IconName][] = [
  ['/lenses', 'Lentes', 'explore'],
]

const KIND_OPTIONS = (Object.entries(SPACE_KINDS) as [SpaceKind, string][]).map(([value, label]) => ({ value, label }))

/** El riel: un item por destino, con la caja del sistema. */
function RailItem({ to, label, icon, collapsed }: { to: string; label: string; icon: IconName; collapsed: boolean }) {
  const item = (
    <NavLink to={to} className={({ isActive }) => navItemClass({ active: isActive, collapsed })} aria-label={collapsed ? label : undefined}>
      {({ isActive }) => <NavItemBody icon={icon} label={label} active={isActive} collapsed={collapsed} />}
    </NavLink>
  )
  return collapsed ? <Tooltip label={label}>{item}</Tooltip> : item
}

/** Elige en qué espacio se trabaja. Todo lo de abajo se filtra por este. */
function SpacePicker({ onNew }: { onNew: () => void }) {
  const { space, spaces, change } = useSpace()
  return (
    <Dropdown
      align="start"
      width={260}
      label="Espacio"
      trigger={({ onClick, ref, 'aria-expanded': expanded }) => (
        <button
          ref={ref} type="button" onClick={onClick} aria-expanded={expanded}
          className="flex h-10 items-center gap-2 rounded-[var(--radius-lg)] px-2 text-body hover:bg-surface-muted"
        >
          <Icon name="school" size={20} className="icon-muted" />
          <span className="max-w-40 truncate font-semibold">{space?.name ?? 'Sin espacio'}</span>
          <Icon name="keyboard_arrow_down" size={18} className="icon-muted" />
        </button>
      )}
      items={[
        ...spaces.map((e) => ({
          label: e.name,
          icon: (e.id === space?.id ? 'check' : 'folder') as IconName,
          onSelect: () => change(e.id),
        })),
        { label: 'Crear un espacio nuevo', icon: 'create_new_folder' as IconName, onSelect: onNew },
      ]}
    />
  )
}

function NewSpace({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { change } = useSpace()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SpaceKind>('personal')
  const create = useMutation({
    mutationFn: () => api.post<Space>('/api/spaces', { name, kind }),
    onSuccess: async (e) => { await qc.invalidateQueries({ queryKey: ['me'] }); change(e.id); setName(''); onClose() },
  })
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Nuevo espacio"
      description="Un espacio es quien organiza: una escuela, un club, un centro de apoyo, o vos."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="brand" form="new-space" type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creando' : 'Crear'}
        </Button>
      </>}
    >
      <form id="new-space" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <Field label="Nombre">
          <TextField placeholder="Taller de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <RadioGroup label="Qué es" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        {create.isError && <span className="text-body text-bad-ink">No se pudo crear.</span>}
      </form>
    </Modal>
  )
}

export function GuideShell({ me, children }: { me: Me; children: ReactNode }) {
  const nav = useNavigate()
  const signOut = useSignOut()
  const { space, spaces, change } = useSpace()
  const { prefs, set } = usePrefs()
  const [changing, setChanging] = useState(false)
  const [creating, setCreating] = useState(false)
  const collapsed = prefs.sidebarCollapsed

  return (
    <div className="shell">
      <aside className="shell-rail" data-collapsed={collapsed}>
        <div className="flex h-10 items-center justify-between">
          {collapsed ? <Logomark size={26} className="mx-auto" /> : <Logo />}
        </div>
        <nav className="flex flex-col gap-[var(--nav-item-gap)]" aria-label="Enseñar">
          {!collapsed && <span className="px-2 pt-2 text-meta text-text-muted">Enseñar</span>}
          {DESTINOS.map(([to, label, icon]) => (
            <RailItem key={to} to={to} label={label} icon={icon} collapsed={collapsed} />
          ))}
          {!collapsed && <span className="px-2 pt-4 text-meta text-text-muted">Referencia</span>}
          {REFERENCIA.map(([to, label, icon]) => (
            <RailItem key={to} to={to} label={label} icon={icon} collapsed={collapsed} />
          ))}
        </nav>
        <div className="mt-auto">
          <IconButton
            icon={collapsed ? 'chevron_right' : 'chevron_left'}
            label={collapsed ? 'Abrir el riel' : 'Doblar el riel'}
            variant="ghost" size="sm"
            onClick={() => set('sidebarCollapsed', !collapsed)}
          />
        </div>
      </aside>

      <div className="shell-body" data-collapsed={collapsed}>
        <header className="shell-top">
          <div className="md:hidden"><Logo size="sm" /></div>
          <SpacePicker onNew={() => setCreating(true)} />
          <div className="ml-auto flex items-center gap-2">
            <UserMenu
              name={me.person.name} email={me.person.email} avatar={me.person.avatarUrl}
              onProfile={() => nav('/profile')}
              onChangeSpace={spaces.length > 1 ? () => setChanging(true) : undefined}
              onSignOut={signOut}
            />
          </div>
        </header>
        <main className="shell-main"><Page wide>{children}</Page></main>
      </div>

      <NewSpace isOpen={creating} onClose={() => setCreating(false)} />

      <Modal
        isOpen={changing} onClose={() => setChanging(false)} title="Cambiar de espacio"
        description="Los grupos, las actividades y el panel se filtran por el espacio elegido."
        footer={<Button variant="ghost" onClick={() => setChanging(false)}>Cerrar</Button>}
      >
        <div className="flex flex-col gap-2">
          {spaces.map((e) => (
            <Row key={e.id} label={e.name} hint={SPACE_KINDS[e.kind] ?? e.kind}>
              {e.id === space?.id
                ? <span className="text-label text-brand-ink">Acá estás</span>
                : <Button size="sm" variant="muted" onClick={() => { change(e.id); setChanging(false) }}>Ir</Button>}
            </Row>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export function LearnerShell({ me, children }: { me: Me; children: ReactNode }) {
  const nav = useNavigate()
  const signOut = useSignOut()
  return (
    <div className="shell">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Logo />
            {/* El texto se cae abajo de sm: el logo, los destinos y el menú de la cuenta no
                entran en 375 px con las etiquetas puestas. El icono se distingue y el activo
                ya tiene fondo. */}
            <nav className="flex gap-1" aria-label="Dónde ir">
              <NavLink to="/today" className={({ isActive }) => navItemClass({ active: isActive })}>
                {({ isActive }) => <NavItemBody icon="home" label="Hoy" active={isActive} />}
              </NavLink>
              <NavLink to="/progress" className={({ isActive }) => navItemClass({ active: isActive })}>
                {({ isActive }) => <NavItemBody icon="explore" label="Mi progreso" active={isActive} />}
              </NavLink>
            </nav>
          </div>
          <UserMenu
            name={me.person.name} email={me.person.email} avatar={me.person.avatarUrl}
            onProfile={() => nav('/profile')} onSignOut={signOut}
          />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
