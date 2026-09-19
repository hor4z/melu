// Los ajustes en un modal y no en una página, con el mueble del sistema: un riel con las
// secciones a la izquierda y filas a la derecha. Las medidas son las de milo (riel 180, cabecera
// y pie de 56, filas de 56 con su padding de 16/24) y el alto es fijo, así que cambiar de
// sección no mueve la caja.
//
// La pieza `SettingsModal` de milo no se usa tal cual a propósito: trae secciones que melu
// todavía no puede honrar (cerrar otras sesiones, descargar el registro de accesos, borrar la
// cuenta) y su campo editable guarda en su propio estado, así que el nombre no llegaría nunca al
// servidor. Acá está el mismo mueble con las mismas piezas, y cada control hace algo de verdad.
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button, Chip, Modal, NavItemBody, Row, Segmented, TextField, navItemClass, usePrefs,
  type IconName,
} from '@milo/ui'
import { api, type Me } from '../lib/api'
import { ROLES, SPACE_KINDS } from '../lib/composition'

type Seccion = 'general' | 'perfil' | 'cuenta'

const SECCIONES: { id: Seccion; label: string; icon: IconName }[] = [
  { id: 'general', label: 'General', icon: 'tune' },
  { id: 'perfil', label: 'Perfil', icon: 'person' },
  { id: 'cuenta', label: 'Cuenta', icon: 'verified_user' },
]

function splitName(full: string): [string, string] {
  const f = full.trim().split(/\s+/).filter(Boolean)
  return f.length === 0 ? ['', ''] : [f[0], f.slice(1).join(' ')]
}

/** Lo que va a la derecha de una fila cuando es para escribir: ancho fijo, como el control. */
function RowField(props: React.ComponentProps<typeof TextField>) {
  return <span className="w-48 shrink-0"><TextField size="sm" {...props} /></span>
}

export function SettingsDialog({ open, onClose, me, onSignOut }: {
  open: boolean
  onClose: () => void
  me: Me
  onSignOut: () => void
}) {
  const qc = useQueryClient()
  const { prefs, set } = usePrefs()
  const { person } = me
  const guess = splitName(person.name)
  const [seccion, setSeccion] = useState<Seccion>('general')
  const [first, setFirst] = useState(person.firstName ?? guess[0])
  const [last, setLast] = useState(person.lastName ?? guess[1])
  const [nick, setNick] = useState(person.nickname ?? '')

  // Abrirlo de nuevo muestra lo que hay guardado, no lo que quedó tipeado la vez anterior.
  useEffect(() => {
    if (!open) return
    setFirst(person.firstName ?? guess[0])
    setLast(person.lastName ?? guess[1])
    setNick(person.nickname ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person.firstName, person.lastName, person.nickname])

  const save = useMutation({
    mutationFn: () => api.put<Me>('/api/me', { firstName: first.trim(), lastName: last.trim(), nickname: nick.trim() }),
    onSuccess: (up) => qc.setQueryData(['me'], up),
  })

  const shown = nick.trim() || `${first.trim()} ${last.trim()}`.trim()
  const dirty = first.trim() !== (person.firstName ?? guess[0])
    || last.trim() !== (person.lastName ?? guess[1])
    || nick.trim() !== (person.nickname ?? '')
  const rolesOf = (spaceId: string) => [...new Set(me.memberships.filter((m) => m.spaceId === spaceId).map((m) => m.role))]
  const roles = [...new Set(me.memberships.map((m) => m.role))]

  return (
    <Modal open={open} onClose={onClose} width={594} label="Ajustes">
      <div className="flex h-[448px] max-h-[calc(100dvh-2rem)]">
        <nav className="flex w-[180px] shrink-0 flex-col gap-0.5 border-r border-border p-3" aria-label="Secciones de los ajustes">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeccion(s.id)}
              aria-current={s.id === seccion ? 'page' : undefined}
              className={navItemClass({ active: s.id === seccion })}
            >
              <NavItemBody icon={s.icon} label={s.label} active={s.id === seccion} />
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center border-b border-border px-6">
            <h2 className="text-body font-semibold">{SECCIONES.find((s) => s.id === seccion)!.label}</h2>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {seccion === 'general' && (
              <>
                <Row label="Nombre">
                  <RowField value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} aria-label="Nombre" />
                </Row>
                <Row label="Apellido" hint="Para el guía que tiene dos Sofías en el mismo grupo.">
                  <RowField value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} aria-label="Apellido" />
                </Row>
                <Row label="Correo" hint="Es con el que entrás, y no se cambia desde acá.">
                  <span className="text-body text-text-muted">{person.email}</span>
                </Row>
                <Row label="Tema">
                  <Segmented
                    size="sm"
                    label="Tema"
                    value={prefs.theme}
                    onChange={(v) => set('theme', v)}
                    options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]}
                  />
                </Row>
              </>
            )}

            {seccion === 'perfil' && (
              <>
                {/* El apodo gana sobre el nombre: es como te vamos a llamar. */}
                <Row label="Cómo te llamamos" hint="Si lo dejás vacío, usamos tu nombre.">
                  <RowField value={nick} onChange={(e) => setNick(e.target.value)} maxLength={60} placeholder={first || 'Cómo te dicen'} aria-label="Cómo te llamamos" />
                </Row>
                <Row label="Así te ven">
                  <span className="text-body font-semibold">{shown || 'Sin nombre'}</span>
                </Row>
                <Row label="Rol" hint="Lo define quien coordina el espacio.">
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {roles.length === 0
                      ? <Chip size="sm">Sin rol</Chip>
                      : roles.map((r) => <Chip key={r} size="sm" color="green">{ROLES[r] ?? r}</Chip>)}
                  </span>
                </Row>
                {me.spaces.length === 0
                  ? <Row label="Espacios" hint="Todavía no estás en ninguno." />
                  : me.spaces.map((e) => (
                    <Row key={e.id} label={e.name} hint={SPACE_KINDS[e.kind] ?? e.kind}>
                      <span className="text-body text-text-muted">{rolesOf(e.id).map((r) => ROLES[r] ?? r).join(', ')}</span>
                    </Row>
                  ))}
              </>
            )}

            {seccion === 'cuenta' && (
              <>
                <Row label="Ingreso" hint="Se entra con Google y con nada más.">
                  <Chip size="sm" color="blue">Google</Chip>
                </Row>
                <Row label="El riel del costado" hint="Doblado deja los iconos y nada más.">
                  <Segmented
                    size="sm"
                    label="El riel del costado"
                    value={prefs.sidebarCollapsed ? 'doblado' : 'abierto'}
                    onChange={(v) => set('sidebarCollapsed', v === 'doblado')}
                    options={[{ value: 'abierto', label: 'Abierto' }, { value: 'doblado', label: 'Doblado' }]}
                  />
                </Row>
                <Row label="Salir de melu" hint="En esta computadora, y nada más.">
                  <Button size="sm" variant="muted" icon="logout" onClick={() => void onSignOut()}>Salir</Button>
                </Row>
              </>
            )}
          </div>

          <footer className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-border px-6">
            {shown === '' && <span className="mr-auto text-meta text-bad-ink">Poné al menos un nombre o un apodo.</span>}
            {save.isError && <span className="mr-auto text-meta text-bad-ink">No se pudo guardar. Probá de nuevo.</span>}
            <Button size="sm" variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button size="sm" variant="brand" disabled={!dirty || shown === '' || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Guardando' : 'Guardar'}
            </Button>
          </footer>
        </div>
      </div>
    </Modal>
  )
}
