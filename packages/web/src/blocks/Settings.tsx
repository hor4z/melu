// Los ajustes en un modal y no en una página, como los arma el sistema: un riel con las
// secciones a la izquierda y filas a la derecha.
//
// La pieza `SettingsModal` de milo no se usa tal cual a propósito: trae secciones que melu
// todavía no puede honrar (cerrar otras sesiones, descargar el registro de accesos, borrar la
// cuenta) y su campo editable guarda en su propio estado, así que el nombre no llegaría nunca al
// servidor. Acá está el mismo mueble con las mismas piezas, y cada control hace algo de verdad.
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button, Chip, Field, Icon, Modal, ModalBody, ModalFooter, ModalTitle, NavItemBody, Row,
  Segmented, TextField, navItemClass, usePrefs, type IconName,
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
    <Modal open={open} onClose={onClose} width={640} label="Ajustes">
      <ModalTitle>Ajustes</ModalTitle>
      <ModalBody>
        <div className="grid gap-5 sm:grid-cols-[168px_minmax(0,1fr)]">
          <nav className="flex gap-1 sm:flex-col" aria-label="Secciones de los ajustes">
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

          <div className="min-w-0">
            {seccion === 'general' && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre"><TextField value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} /></Field>
                  <Field label="Apellido"><TextField value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} /></Field>
                </div>
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
              </div>
            )}

            {seccion === 'perfil' && (
              <div className="flex flex-col gap-4">
                {/* El apodo gana sobre el nombre: es como te vamos a llamar. */}
                <Field label="Cómo te llamamos" hint="Si lo dejás vacío, usamos tu nombre.">
                  <TextField value={nick} onChange={(e) => setNick(e.target.value)} maxLength={60} placeholder={first || 'Cómo te dicen'} />
                </Field>
                <Row label="Así te ven">
                  <span className="text-body font-semibold">{shown || 'Sin nombre'}</span>
                </Row>
                <Row label="Rol" hint="Lo define quien coordina el espacio.">
                  <span className="flex flex-wrap gap-1.5">
                    {roles.length === 0
                      ? <Chip size="sm">Sin rol</Chip>
                      : roles.map((r) => <Chip key={r} size="sm" color="green">{ROLES[r] ?? r}</Chip>)}
                  </span>
                </Row>
                {me.spaces.length === 0
                  ? <Row label="Espacios" hint="Todavía no estás en ninguno."><span /></Row>
                  : me.spaces.map((e) => (
                    <Row key={e.id} label={e.name} hint={SPACE_KINDS[e.kind] ?? e.kind}>
                      <span className="text-body text-text-muted">{rolesOf(e.id).map((r) => ROLES[r] ?? r).join(', ')}</span>
                    </Row>
                  ))}
              </div>
            )}

            {seccion === 'cuenta' && (
              <div className="flex flex-col gap-4">
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
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        {shown === '' && <span className="mr-auto text-body text-bad-ink">Poné al menos un nombre o un apodo.</span>}
        {save.isError && <span className="mr-auto text-body text-bad-ink">No se pudo guardar. Probá de nuevo.</span>}
        {save.isSuccess && !dirty && (
          <span className="mr-auto flex items-center gap-1 text-body text-ok-ink"><Icon name="check" size={16} /> Guardado</span>
        )}
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button variant="brand" disabled={!dirty || shown === '' || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Guardando' : 'Guardar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
