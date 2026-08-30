import { ChevronDown, LogOut, RefreshCw, User } from 'lucide-react'
import { Avatar } from '../src/components/data_display/avatar/avatar'
import { Dropdown } from '../src/components/overlays/dropdown_menu/dropdown'
import { Icon } from '../src/icons/icon'

export function UserMenu({ nombre, email, subtitulo, onPerfil, onCambiarEspacio, onSalir }: { nombre: string; email?: string; subtitulo?: string; onPerfil?: () => void; onCambiarEspacio?: () => void; onSalir: () => void }) {
  return (
    <Dropdown placement="bottom-end">
      <Dropdown.Trigger>
        <button type="button" className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-hover" aria-label="Menú de usuario">
          <Avatar name={nombre} size="sm" />
          <span className="hidden text-left leading-tight sm:block"><span className="block text-sm font-medium">{nombre}</span>{subtitulo && <span className="block text-xs text-ink-subtle">{subtitulo}</span>}</span>
          <Icon icon={ChevronDown} size="sm" color="subtle" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Label><div className="px-1 py-1"><div className="text-sm font-semibold">{nombre}</div>{email && <div className="text-xs text-ink-subtle">{email}</div>}</div></Dropdown.Label>
        <Dropdown.Divider />
        {onPerfil && <Dropdown.Item onClick={onPerfil}><span className="flex items-center gap-2"><Icon icon={User} size="sm" /> Mi perfil</span></Dropdown.Item>}
        {onCambiarEspacio && <Dropdown.Item onClick={onCambiarEspacio}><span className="flex items-center gap-2"><Icon icon={RefreshCw} size="sm" /> Cambiar de espacio</span></Dropdown.Item>}
        <Dropdown.Divider />
        <Dropdown.Item onClick={onSalir}><span className="flex items-center gap-2 text-danger"><Icon icon={LogOut} size="sm" /> Salir</span></Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  )
}
