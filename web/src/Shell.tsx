import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { BookOpen, Compass, Home, LogOut, Users } from 'lucide-react'
import { Avatar, Button, Icon } from '@/ui'
import { useSalir } from './lib/sesion'
import type { Yo } from './lib/api'

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-md bg-brand text-on-brand"><Logomark /></span>
      <span className="text-lg font-semibold tracking-tight text-ink">melu</span>
    </span>
  )
}
// Un zigzag, el mismo gesto que la "m": tres trazos que van y vuelven.
function Logomark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7h10l-8 5h10l-8 5h10" /></svg>
}

function Usuario({ yo }: { yo: Yo }) {
  const salir = useSalir()
  return (
    <div className="flex items-center gap-2">
      <Avatar name={yo.persona.Nombre} size="sm" />
      <span className="hidden text-sm text-ink-muted sm:inline">{yo.persona.Nombre}</span>
      <Button variant="ghost" size="sm" onClick={salir} startIcon={<Icon icon={LogOut} />} aria-label="Salir">Salir</Button>
    </div>
  )
}

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-brand-subtle font-medium text-brand-text' : 'text-ink-muted hover:bg-hover hover:text-ink'}`

export function ShellGuia({ yo, children }: { yo: Yo; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="flex h-14 items-center justify-between px-5">
          <Logo />
          <Usuario yo={yo} />
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface p-3 md:flex">
          <div className="mb-3 flex items-center gap-3 rounded-md px-3 py-2">
            <span className="grid size-9 place-items-center rounded-md bg-lilac text-base">🏫</span>
            <div className="min-w-0"><div className="truncate text-sm font-medium">{yo.espacios[0]?.nombre}</div><div className="text-xs text-ink-subtle">Tu espacio</div></div>
          </div>
          <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-ink-subtle">Enseñar</p>
          <NavLink to="/grupos" className={item}><Icon icon={Users} size="md" /> Grupos</NavLink>
          <NavLink to="/actividades" className={item}><Icon icon={BookOpen} size="md" /> Actividades</NavLink>
          <NavLink to="/lentes" className={item}><Icon icon={Compass} size="md" /> Lentes</NavLink>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}

export function ShellAprendiz({ yo, children }: { yo: Yo; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Logo />
            <NavLink to="/hoy" className={item}><Icon icon={Home} size="md" /> Hoy</NavLink>
          </div>
          <Usuario yo={yo} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
