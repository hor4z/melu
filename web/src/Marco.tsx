import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { useSalir } from './lib/sesion'
import type { Yo } from './lib/api'

const enlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-muted text-primary font-medium' : 'text-secondary hover:bg-muted'}`

export function Marco({ yo, children }: { yo: Yo; children: ReactNode }) {
  const salir = useSalir()
  return (
    <div className="min-h-screen">
      <header className="border-b border-default bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
          <Text weight="bold" size="lg">melu</Text>
          <nav className="flex gap-1">
            <NavLink to="/grupos" className={enlace}>Grupos</NavLink>
            <NavLink to="/lentes" className={enlace}>Lentes</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Text size="sm" color="secondary">{yo.persona.Nombre}</Text>
            <Button label="Salir" size="sm" variant="secondary" onClick={salir} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
