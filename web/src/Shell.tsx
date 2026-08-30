import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav'
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { useSalir } from './lib/sesion'
import type { Yo } from './lib/api'

function Logo() {
  return <span className="grid size-7 place-items-center rounded-md bg-accent-bg font-heading text-sm font-bold text-on-accent">m</span>
}

function Usuario({ yo }: { yo: Yo }) {
  const salir = useSalir()
  return (
    <div className="flex items-center gap-3">
      <Text size="sm" color="secondary">{yo.persona.Nombre}</Text>
      <Button label="Salir" size="sm" variant="ghost" onClick={salir} />
    </div>
  )
}

export function ShellGuia({ yo, children }: { yo: Yo; children: ReactNode }) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const en = (p: string) => pathname === p || pathname.startsWith(p + '/')
  const items: [string, string][] = [['/grupos', 'Grupos'], ['/actividades', 'Actividades'], ['/lentes', 'Lentes']]
  return (
    <AppShell
      height="fill"
      contentPadding={6}
      topNav={<TopNav label="Principal" heading={<TopNavHeading logo={<Logo />} logoLabel="melu" heading="melu" subheading={yo.espacios[0]?.nombre} />} endContent={<Usuario yo={yo} />} />}
      sideNav={
        <SideNav>
          <SideNavSection title="Enseñar" isHeaderHidden>
            {items.map(([p, l]) => <SideNavItem key={p} label={l} isSelected={en(p) || (p === '/actividades' && en('/corregir'))} onClick={() => nav(p)} />)}
          </SideNavSection>
        </SideNav>
      }
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </AppShell>
  )
}

export function ShellAprendiz({ yo, children }: { yo: Yo; children: ReactNode }) {
  return (
    <AppShell height="fill" contentPadding={6}
      topNav={<TopNav label="Principal" heading={<TopNavHeading logo={<Logo />} logoLabel="melu" heading="melu" />} endContent={<Usuario yo={yo} />} />}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </AppShell>
  )
}
