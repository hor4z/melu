import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BookOpen, Check, ChevronsUpDown, Compass, Home, LayoutDashboard, Plus, School, Search, Users } from 'lucide-react'
import {
  Button, Card, Chip, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  Field, Icon, Input, Logo, Text, UserMenu, cn,
} from '@/kit'
import { useSalir } from './lib/sesion'
import { useEspacio } from './lib/espacio'
import { api, type Espacio, type Panel, type Yo } from './lib/api'
import { Modal } from './bloques/Modal'

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-teal font-semibold text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink'}`

function Campana({ espacioId }: { espacioId: string }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['panel', espacioId], queryFn: () => api.get<Panel>(`/api/panel?espacio=${espacioId}`), staleTime: 30_000 })
  const n = q.data?.paraMirar ?? 0
  return (
    <button type="button" onClick={() => nav('/inicio')} className="relative grid size-9 place-items-center rounded-lg hover:bg-hover" aria-label={`${n} entregas para mirar`}>
      <Icon icon={Bell} size="lg" color="muted" />
      {n > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{n}</span>}
    </button>
  )
}

/** Elige en qué espacio trabajás. Todo lo que ves abajo se filtra por esto. */
function SelectorEspacio() {
  const { espacio, espacios, cambiar } = useEspacio()
  const [creando, setCreando] = useState(false)
  return (
    <>
      <DropdownMenu placement="bottom-start">
        <DropdownMenu.Trigger asChild>
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{espacio?.nombre ?? 'Sin espacio'}</span>
              <span className="block text-xs text-ink-subtle">{espacios.length > 1 ? `${espacios.length} espacios` : 'Tu espacio'}</span>
            </span>
            <Icon icon={ChevronsUpDown} size="sm" color="subtle" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenuContent minWidth={240}>
          <DropdownMenuLabel>Espacios</DropdownMenuLabel>
          {espacios.map((e) => (
            <DropdownMenuItem key={e.id} onClick={() => cambiar(e.id)}
              icon={<span className="grid size-4 place-items-center">{e.id === espacio?.id && <Icon icon={Check} size="sm" className="text-accent" />}</span>}>
              {e.nombre}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<Icon icon={Plus} size="sm" />} onClick={() => setCreando(true)}>Crear un espacio nuevo</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NuevoEspacio abierto={creando} onCerrar={() => setCreando(false)} />
    </>
  )
}

function NuevoEspacio({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient()
  const { cambiar } = useEspacio()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('personal')
  const crear = useMutation({
    mutationFn: () => api.post<Espacio>('/api/espacios', { nombre, tipo }),
    onSuccess: async (e) => { await qc.invalidateQueries({ queryKey: ['yo'] }); cambiar(e.id); setNombre(''); onCerrar() },
  })
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo espacio" descripcion="Un espacio es quien organiza: una escuela, un club, un centro de apoyo, o vos."
      pie={<><Button variant="ghost" onClick={onCerrar}>Cancelar</Button><Button form="nuevo-espacio" type="submit" loading={crear.isPending}>Crear</Button></>}>
      <form id="nuevo-espacio" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
        <Field label="Nombre"><Input placeholder="Taller de los sábados" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus /></Field>
        <fieldset className="flex flex-wrap gap-2">
          {[['personal', 'Soy yo'], ['apoyo', 'Apoyo / refuerzo'], ['club', 'Club / taller'], ['escuela', 'Escuela']].map(([v, l]) => (
            <label key={v} className={cn('cursor-pointer rounded-md border-2 px-3 py-1.5 text-sm font-medium', tipo === v ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}>
              <input type="radio" className="sr-only" name="tipo-espacio" value={v} checked={tipo === v} onChange={() => setTipo(v)} />{l}
            </label>
          ))}
        </fieldset>
        {crear.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
      </form>
    </Modal>
  )
}

export function ShellGuia({ yo, children }: { yo: Yo; children: ReactNode }) {
  const salir = useSalir()
  const { espacio, espacios, cambiar } = useEspacio()
  const [cambiando, setCambiando] = useState(false)
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="px-5 py-5"><Logo /></div>
          <div className="px-2"><SelectorEspacio /></div>
          <nav className="mt-3 flex flex-col gap-0.5 px-3">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">Enseñar</p>
            <NavLink to="/inicio" className={item}><Icon icon={LayoutDashboard} size="lg" /> Inicio</NavLink>
            <NavLink to="/grupos" className={item}><Icon icon={Users} size="lg" /> Grupos</NavLink>
            <NavLink to="/actividades" className={item}><Icon icon={BookOpen} size="lg" /> Actividades</NavLink>
            <NavLink to="/lentes" className={item}><Icon icon={Compass} size="lg" /> Lentes</NavLink>
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
              <Campana espacioId={espacio?.id ?? ''} />
              <UserMenu nombre={yo.persona.Nombre} email={yo.persona.Email} subtitulo={espacio?.nombre ?? 'Docente'}
                onCambiarEspacio={espacios.length > 1 ? () => setCambiando(true) : undefined} onSalir={salir} />
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>

      <Modal abierto={cambiando} onCerrar={() => setCambiando(false)} titulo="Cambiar de espacio" descripcion="Los grupos, las actividades y el panel se filtran por el espacio elegido."
        pie={<Button variant="ghost" onClick={() => setCambiando(false)}>Cerrar</Button>}>
        <ul className="flex flex-col gap-2">
          {espacios.map((e) => (
            <li key={e.id}>
              <Card asChild interactive padding="sm" variant={e.id === espacio?.id ? 'teal' : 'default'}>
                <button type="button" onClick={() => { cambiar(e.id); setCambiando(false) }} className="w-full flex-row items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/70"><Icon icon={School} size="lg" /></span>
                  <span className="min-w-0 flex-1 text-left"><span className="block truncate font-medium">{e.nombre}</span><span className="block text-xs text-ink-subtle">{e.tipo}</span></span>
                  {e.id === espacio?.id && <Chip size="sm" color="accent">Acá estás</Chip>}
                </button>
              </Card>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}

export function ShellAprendiz({ yo, children }: { yo: Yo; children: ReactNode }) {
  const salir = useSalir()
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Logo />
            {/* El texto se cae abajo de sm: el logo, los enlaces y el menú de cuenta no entran
                en 375 px con las etiquetas puestas, y el desborde empujaba el menú fuera de la
                pantalla. Los iconos se distinguen y el activo ya tiene fondo. */}
            <nav className="flex gap-1">
              <NavLink to="/hoy" className={item}><Icon icon={Home} size="md" /> <span className="hidden sm:inline">Hoy</span></NavLink>
              <NavLink to="/progreso" className={item}><Icon icon={Compass} size="md" /> <span className="hidden sm:inline">Mi progreso</span></NavLink>
            </nav>
          </div>
          <UserMenu nombre={yo.persona.Nombre} email={yo.persona.Email} subtitulo="Aprendiz" onSalir={salir} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
