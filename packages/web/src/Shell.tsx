import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, BookOpen, Check, Compass, Home, LayoutDashboard, Plus, School, Users } from 'lucide-react'
import {
  Button, Card, Chip, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, Field, Icon, Input, Logo, Logomark, MenuButton,
  RadioGroup, RadioGroupItem, Sidebar, SidebarHeader, SidebarItem, SidebarLabel, SidebarNav,
  SidebarToggle, Text, cn, focusRing,
} from '@melu/ui'
import { UserMenu } from './blocks/Product'
import { useSignOut } from './lib/session'
import { useSpace } from './lib/space'
import { api, type Space, type SpaceKind, type Me } from './lib/api'
import { SPACE_KINDS } from './lib/composition'
import { Modal } from './blocks/Modal'

// Los destinos del docente, en el orden en que se visitan.
const DESTINOS: [string, string, typeof LayoutDashboard][] = [
  ['/home', 'Inicio', LayoutDashboard],
  ['/focus', 'Cómo vienen', Activity],
  ['/groups', 'Grupos', Users],
  ['/activities', 'Actividades', BookOpen],
  ['/lenses', 'Lentes', Compass],
]

// Si el riel queda abierto o cerrado lo decide quien lo usa, no el componente: se guarda acá,
// al lado del espacio elegido, y así sobrevive a recargar la página.
const RIEL = 'melu.sidebar'

// El menú del aprendiz es horizontal y va en la cabecera: dos destinos no justifican un riel.
const destinoArriba = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors', focusRing,
    isActive ? 'bg-teal font-semibold text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink')

/** Picks which space you work in. Everything below is filtered by this. */
function SpacePicker() {
  const { space, spaces, change } = useSpace()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger>
          <MenuButton compact chevron="updown"
            leading={<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>}
            description={spaces.length > 1 ? `${spaces.length} espacios` : 'Tu espacio'}>
            {space?.name ?? 'Sin espacio'}
          </MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent minWidth={240}>
          <DropdownMenuLabel>Espacios</DropdownMenuLabel>
          {spaces.map((e) => (
            <DropdownMenuItem key={e.id} onClick={() => change(e.id)}
              icon={<span className="grid size-4 place-items-center">{e.id === space?.id && <Icon icon={Check} size="sm" className="text-accent" />}</span>}>
              {e.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<Icon icon={Plus} size="sm" />} onClick={() => setCreating(true)}>Crear un espacio nuevo</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewSpace isOpen={creating} onClose={() => setCreating(false)} />
    </>
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
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo espacio" description="Un espacio es quien organiza: una escuela, un club, un centro de apoyo, o vos."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button form="new-space" type="submit" loading={create.isPending}>Crear</Button></>}>
      <form id="new-space" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
        <Field label="Nombre"><Input placeholder="Taller de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
        <Field asGroup label="Qué es">
          <RadioGroup value={kind} onValueChange={(v) => setKind(v as SpaceKind)} orientation="horizontal">
            {(Object.entries(SPACE_KINDS) as [SpaceKind, string][]).map(([v, l]) => (
              <RadioGroupItem key={v} value={v}>{l}</RadioGroupItem>
            ))}
          </RadioGroup>
        </Field>
        {create.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
      </form>
    </Modal>
  )
}

export function GuideShell({ me, children }: { me: Me; children: ReactNode }) {
  const nav = useNavigate()
  const signOut = useSignOut()
  const { space, spaces, change } = useSpace()
  const [changing, setChanging] = useState(false)
  const [riel, setRiel] = useState(() => localStorage.getItem(RIEL) !== 'cerrado')
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex">
        <Sidebar
          className="hidden md:flex" expanded={riel}
          onExpandedChange={(v) => { setRiel(v); localStorage.setItem(RIEL, v ? 'abierto' : 'cerrado') }}
        >
          <SidebarHeader>
            {riel && <Logo />}
            <SidebarToggle />
          </SidebarHeader>
          <SidebarNav>
            <SidebarLabel>Enseñar</SidebarLabel>
            {DESTINOS.map(([to, nombre, icono]) => (
              <SidebarItem key={to} asChild label={nombre} icon={<Icon icon={icono} size="lg" />}>
                <NavLink to={to} />
              </SidebarItem>
            ))}
          </SidebarNav>
        </Sidebar>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-4 border-b border-line bg-surface/90 px-6 backdrop-blur">
            {/* La marca abajo de md, donde no hay riel; y también con el riel doblado, donde no
                entra al lado del botón. El `mr-auto` es lo que empuja el resto a la derecha. */}
            <div className="mr-auto flex items-center gap-3 md:hidden"><Logo size="sm" /></div>
            {!riel && <Logomark size={26} className="mr-auto hidden md:block" />}
            <div className="flex items-center gap-4">
              <SpacePicker />
              <UserMenu name={me.person.name} email={me.person.email} avatar={me.person.avatarUrl}
                onProfile={() => nav('/profile')}
                onChangeSpace={spaces.length > 1 ? () => setChanging(true) : undefined} onSignOut={signOut} />
            </div>
          </header>
          {/* El tope es generoso a propósito: estas pantallas son tablas y grillas, y a 1152 px
              dejaban aire al costado en cualquier monitor. Sigue habiendo tope para que una fila
              no se vuelva ilegible de tan larga en una pantalla enorme; la pantalla que necesita
              menos ancho lo pide ella (el editor). */}
          <main className="mx-auto max-w-[120rem] px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>

      <Modal isOpen={changing} onClose={() => setChanging(false)} title="Cambiar de espacio" description="Los grupos, las actividades y el panel se filtran por el espacio elegido."
        footer={<Button variant="ghost" onClick={() => setChanging(false)}>Cerrar</Button>}>
        <ul className="flex flex-col gap-2">
          {spaces.map((e) => (
            <li key={e.id}>
              <Card asChild interactive padding="sm" variant={e.id === space?.id ? 'teal' : 'default'}>
                <button type="button" onClick={() => { change(e.id); setChanging(false) }} className="w-full flex-row items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/70"><Icon icon={School} size="lg" /></span>
                  <span className="min-w-0 flex-1 text-left"><span className="block truncate font-medium">{e.name}</span><span className="block text-xs text-ink-subtle">{SPACE_KINDS[e.kind] ?? e.kind}</span></span>
                  {e.id === space?.id && <Chip size="sm" color="accent">Acá estás</Chip>}
                </button>
              </Card>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}

export function LearnerShell({ me, children }: { me: Me; children: ReactNode }) {
  const nav = useNavigate()
  const signOut = useSignOut()
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Logo />
            {/* The text drops below sm: the logo, the links and the account menu do not fit
                en 375 px con las etiquetas puestas, y el desborde empujaba el menú fuera de la
                pantalla. Los iconos se distinguen y el activo ya tiene fondo. */}
            <nav className="flex gap-1">
              <NavLink to="/today" className={destinoArriba}><Icon icon={Home} size="md" /> <span className="hidden sm:inline">Hoy</span></NavLink>
              <NavLink to="/progress" className={destinoArriba}><Icon icon={Compass} size="md" /> <span className="hidden sm:inline">Mi progreso</span></NavLink>
            </nav>
          </div>
          <UserMenu name={me.person.name} email={me.person.email} avatar={me.person.avatarUrl}
            onProfile={() => nav('/profile')} onSignOut={signOut} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
