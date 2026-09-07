import { useState } from 'react'
import { Activity, BookOpen, Compass, LayoutDashboard, Users } from 'lucide-react'
import { Icon, Logo, Logomark, Sidebar, SidebarHeader, SidebarItem, SidebarLabel, SidebarNav, SidebarToggle, Text } from '@melu/ui'

const DESTINOS = [
  ['Inicio', LayoutDashboard], ['Cómo vienen', Activity], ['Grupos', Users],
  ['Actividades', BookOpen], ['Lentes', Compass],
] as const

export default function Demo() {
  const [abierto, setAbierto] = useState(true)
  const [donde, setDonde] = useState('Inicio')

  return (
    // El `h-96` es del ejemplo: en la app el riel mide lo que mide la pantalla.
    <div className="flex h-96 w-full overflow-hidden rounded-lg border border-line">
      <Sidebar expanded={abierto} onExpandedChange={setAbierto} className="h-full">
        <SidebarHeader>{abierto ? <Logo size="sm" /> : <Logomark size={24} />}</SidebarHeader>
        <SidebarNav>
          <SidebarLabel>Enseñar</SidebarLabel>
          {DESTINOS.map(([nombre, icono]) => (
            <SidebarItem
              key={nombre} asChild label={nombre} icon={<Icon icon={icono} size="lg" />}
            >
              {/* En la app esto es un `NavLink`, que pone el `aria-current` solo. */}
              <a
                href="#" aria-current={donde === nombre ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); setDonde(nombre) }}
              />
            </SidebarItem>
          ))}
        </SidebarNav>
        <SidebarToggle />
      </Sidebar>
      <div className="min-w-0 flex-1 p-5">
        <Text variant="muted">Estás en <span className="font-semibold text-ink">{donde}</span>.</Text>
        <Text size="sm" variant="subtle" className="mt-2">Replegalo con el botón de abajo: los nombres se van de la vista pero no del lector, y vuelven como tooltip.</Text>
      </div>
    </div>
  )
}
