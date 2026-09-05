// El marco del sitio: nav lateral persistente a la izquierda, contenido en el medio,
// y el índice de la página a la derecha. Los tres salen del propio kit — el sitio se
// construye con lo que documenta, que es la única prueba honesta de que sirve.
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Chip, Kbd, Logo, Text, cn } from '@melu/ui'

export type Section = [id: string, label: string]

const NAV: { group: string; items: { to: string; label: string }[] }[] = [
  {
    group: 'El sistema',
    items: [
      { to: '/', label: 'Portada' },
      { to: '/goals', label: 'Objetivos' },
      { to: '/guidelines', label: 'Lineamientos' },
    ],
  },
  {
    group: 'Fundamentos',
    items: [
      { to: '/theme', label: 'Theme' },
      { to: '/icons', label: 'Iconos' },
    ],
  },
  {
    group: 'Piezas',
    items: [{ to: '/components', label: 'Componentes' }],
  },
]

/** El índice de la página, a la derecha. Resalta la sección que se está mirando. */
function OnThisPage({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.[0])

  useEffect(() => {
    const nodes = sections.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!nodes.length) return
    // rootMargin recorta la ventana a una franja fina arriba: así la sección "active" es la que
    // acaba de pasar por el encabezado, y no la que ocupa más pantalla.
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' },
    )
    nodes.forEach((n) => obs.observe(n))
    return () => obs.disconnect()
  }, [sections])

  return (
    <nav aria-label="En esta página" className="sticky top-24 hidden h-fit flex-col gap-0.5 xl:flex">
      <Text size="xs" variant="subtle" className="mb-2 px-3 font-semibold uppercase tracking-wide">En esta página</Text>
      {sections.map(([id, label]) => (
        <a key={id} href={`#${id}`}
          className={cn('rounded-md px-3 py-1 text-sm', active === id ? 'font-medium text-accent' : 'text-ink-muted hover:text-ink')}>
          {label}
        </a>
      ))}
    </nav>
  )
}

export function Layout({ sections = [], children }: { sections?: Section[]; children: ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[92rem] items-center justify-between px-6">
          <NavLink to="/" className="flex items-center gap-3">
            <Logo /><Chip color="accent" size="sm">design system</Chip>
          </NavLink>
          <Text size="sm" variant="muted" className="hidden sm:block">
            Un solo lugar para el color, la tipografía y las piezas
          </Text>
        </div>
      </header>

      <div className="mx-auto grid max-w-[92rem] gap-10 px-6 py-10 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_minmax(0,1fr)_190px]">
        <nav aria-label="Secciones" className="sticky top-24 hidden h-fit flex-col gap-5 lg:flex">
          {NAV.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-0.5">
              <Text size="xs" variant="subtle" className="mb-1 px-3 font-semibold uppercase tracking-wide">{group}</Text>
              {items.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/'}
                  className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm', isActive ? 'bg-hover font-medium text-ink' : 'text-ink-muted hover:bg-hover hover:text-ink')}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
          <Text size="xs" variant="subtle" className="mt-2 px-3">
            <Kbd>make ui</Kbd> lo levanta
          </Text>
        </nav>

        <main className="min-w-0">{children}</main>

        <OnThisPage sections={sections} />
      </div>
    </div>
  )
}
