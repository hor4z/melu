import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Icon, MenuButton } from '@melu/ui'
import { School } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <DropdownMenu placement="bottom-end">
        <DropdownMenuTrigger>
          <MenuButton leading={<Avatar name="Horacio Rivero" size="sm" />} description="Docente">Horacio</MenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent><DropdownMenuItem>Mi perfil</DropdownMenuItem><DropdownMenuItem>Salir</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>

      <div className="w-60 rounded-lg border border-line p-2">
        <DropdownMenu placement="bottom-start">
          <DropdownMenuTrigger>
            <MenuButton block chevron="updown" description="2 espacios"
              leading={<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>}>
              Escuela 12
            </MenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent minWidth={220}><DropdownMenuItem>Escuela 12</DropdownMenuItem><DropdownMenuItem>Taller de los sábados</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
