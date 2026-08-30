import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, BookOpen, Compass, Home, LayoutDashboard, Search, Users } from 'lucide-react'
import { Icon, Logo, UserMenu } from '@/ui'
import { useSalir } from './lib/sesion'
import { api, type Yo } from './lib/api'

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-teal font-semibold text-brand-text' : 'text-ink-muted hover:bg-hover hover:text-ink'}`

function Campana() {
  const q = useQuery({ queryKey: ['panel'], queryFn: () => api.get<{ paraMirar: number }>('/api/panel'), staleTime: 30_000 })
  const n = q.data?.paraMirar ?? 0
  const nav = useNavigate()
  return (
    <button type="button" onClick={() => nav('/inicio')} className="relative grid size-9 place-items-center rounded-lg hover:bg-hover" aria-label={`${n} entregas para mirar`}>
      <Icon icon={Bell} size="lg" color="secondary" />
      {n > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{n}</span>}
    </button>
  )
}

export function ShellGuia({ yo, children }: { yo: Yo; children: ReactNode }) {
  const salir = useSalir()
  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="px-5 py-5"><Logo /></div>
          <div className="mx-3 mb-4 flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-lilac text-lg">🏫</span>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{yo.espacios[0]?.nombre}</div><div className="text-xs text-ink-subtle">Tu espacio</div></div>
          </div>
          <nav className="flex flex-col gap-0.5 px-3">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-subtle">Enseñar</p>
            <NavLink to="/inicio" className={item}><Icon icon={LayoutDashboard} size="lg" /> Inicio</NavLink>
            <NavLink to="/grupos" className={item}><Icon icon={Users} size="lg" /> Grupos</NavLink>
            <NavLink to="/actividades" className={item}><Icon icon={BookOpen} size="lg" /> Actividades</NavLink>
            <NavLink to="/lentes" className={item}><Icon icon={Compass} size="lg" /> Lentes</NavLink>
          </nav>
          <div className="mt-auto p-4"><div className="rounded-lg bg-yellow p-4 text-sm"><div className="font-semibold">¿Perdido?</div><p className="mt-1 text-ink-muted">Inicio te dice qué falta y qué mirar hoy.</p></div></div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/90 px-6 backdrop-blur">
            <div className="flex items-center gap-3 md:hidden"><Logo size="sm" /></div>
            <label className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-subtle md:flex"><Icon icon={Search} size="sm" /><input placeholder="Buscar grupos, actividades, aprendices…" className="w-full bg-transparent outline-none placeholder:text-ink-subtle" /><kbd className="rounded border border-line bg-surface px-1.5 font-mono text-[10px]">⌘K</kbd></label>
            <div className="flex items-center gap-2"><Campana /><UserMenu nombre={yo.persona.Nombre} email={yo.persona.Email} subtitulo="Docente" onSalir={salir} /></div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>
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
            <nav className="flex gap-1">
              <NavLink to="/hoy" className={item}><Icon icon={Home} size="md" /> Hoy</NavLink>
              <NavLink to="/progreso" className={item}><Icon icon={Compass} size="md" /> Mi progreso</NavLink>
            </nav>
          </div>
          <UserMenu nombre={yo.persona.Nombre} email={yo.persona.Email} subtitulo="Aprendiz" onSalir={salir} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  )
}
