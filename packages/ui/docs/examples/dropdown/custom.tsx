import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Icon } from '@melu/ui'
import { LogOut, Repeat, User } from 'lucide-react'

export default function Demo() {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger>
        <button type="button" className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-hover">
          <Avatar name="Horacio Rivero" size="sm" />
          <span className="text-left text-sm leading-tight">
            <span className="block font-medium">Horacio</span>
            <span className="block text-xs text-ink-subtle">Docente</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent minWidth={220}>
        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
        <DropdownMenuItem icon={<Icon icon={User} size="sm" />}>Mi perfil</DropdownMenuItem>
        <DropdownMenuItem icon={<Icon icon={Repeat} size="sm" />} shortcut="⌘E">Cambiar de espacio</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<Icon icon={LogOut} size="sm" />}>Salir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
