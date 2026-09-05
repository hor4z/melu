import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BookOpen, Check, ChevronsUpDown, Compass, Home, LayoutDashboard, Plus, School, Search, Users } from 'lucide-react'
import {
  Button, Card, Chip, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  Field, Icon, Input, Logo, Text, UserMenu, cn,
} from '@/kit'
import { useSignOut } from './lib/session'
import { useSpace } from './lib/space'
import { api, type Space, type SpaceKind, type Dashboard, type Me } from './lib/api'
import { SPACE_KINDS } from './lib/composition'
import { Modal } from './blocks/Modal'

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-teal font-semibold text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink'}`

function NotificationsBell({ spaceId }: { spaceId: string }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['dashboard', spaceId], queryFn: () => api.get<Dashboard>(`/api/dashboard?space=${spaceId}`), staleTime: 30_000 })
  const n = q.data?.toReview ?? 0
  return (
    <button type="button" onClick={() => nav('/home')} className="relative grid size-9 place-items-center rounded-lg hover:bg-hover" aria-label={`${n} entregas para mirar`}>
      <Icon icon={Bell} size="lg" color="muted" />
      {n > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{n}</span>}
    </button>
  )
}

/** Picks which space you work in. Everything below is filtered by this. */
function SpacePicker() {
  const { space, spaces, change } = useSpace()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <DropdownMenu placement="bottom-start">
        <DropdownMenu.Trigger asChild>
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{space?.name ?? 'Sin espacio'}</span>
              <span className="block text-xs text-ink-subtle">{spaces.length > 1 ? `${spaces.length} espacios` : 'Tu espacio'}</span>
            </span>
            <Icon icon={ChevronsUpDown} size="sm" color="subtle" />
          </button>
        </DropdownMenu.Trigger>
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
        <fieldset className="flex flex-wrap gap-2">
          {(Object.entries(SPACE_KINDS) as [SpaceKind, string][]).map(([v, l]) => (
            <label key={v} className={cn('cursor-pointer rounded-md border-2 px-3 py-1.5 text-sm font-medium', kind === v ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}>
              <input type="radio" className="sr-only" name="space-kind" value={v} checked={kind === v} onChange={() => setKind(v)} />{l}
            </label>
          ))}
        </fieldset>
        {create.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
      </form>
    </Modal>
  )
}

export function GuideShell({ me, children }: { me: Me; children: ReactNode }) {
  const signOut = useSignOut()
  const { space, spaces, change } = useSpace()
  const [changing, setChanging] = useState(false)
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="px-5 py-5"><Logo /></div>
          <div className="px-2"><SpacePicker /></div>
          <nav className="mt-3 flex flex-col gap-0.5 px-3">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">Enseñar</p>
            <NavLink to="/home" className={item}><Icon icon={LayoutDashboard} size="lg" /> Inicio</NavLink>
            <NavLink to="/groups" className={item}><Icon icon={Users} size="lg" /> Grupos</NavLink>
            <NavLink to="/activities" className={item}><Icon icon={BookOpen} size="lg" /> Actividades</NavLink>
            <NavLink to="/lenses" className={item}><Icon icon={Compass} size="lg" /> Lentes</NavLink>
          </nav>
          <div className="mt-auto p-4">
            <Card variant="yellow" padding="sm">
              <Text size="sm" weight="semibold">¿Perdido?</Text>
              <Text size="sm" variant="muted" className="mt-0.5">Inicio te dice qué falta y qué mirar hoy.</Text>
            </Card>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/90 px-6 backdrop-blur">
            <div className="flex items-center gap-3 md:hidden"><Logo size="sm" /></div>
            <label className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-subtle md:flex">
              <Icon icon={Search} size="sm" />
              <input placeholder="Buscar grupos, actividades, aprendices…" className="w-full bg-transparent outline-none placeholder:text-ink-subtle" />
              <kbd className="rounded border border-line bg-surface px-1.5 font-mono text-[10px]">⌘K</kbd>
            </label>
            <div className="flex items-center gap-2">
              <NotificationsBell spaceId={space?.id ?? ''} />
              <UserMenu name={me.person.Name} email={me.person.Email} subtitle={space?.name ?? 'Docente'}
                onChangeSpace={spaces.length > 1 ? () => setChanging(true) : undefined} onSignOut={signOut} />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</main>
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
              <NavLink to="/today" className={item}><Icon icon={Home} size="md" /> <span className="hidden sm:inline">Hoy</span></NavLink>
              <NavLink to="/progress" className={item}><Icon icon={Compass} size="md" /> <span className="hidden sm:inline">Mi progreso</span></NavLink>
            </nav>
          </div>
          <UserMenu name={me.person.Name} email={me.person.Email} subtitle="Aprendiz" onSignOut={signOut} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
