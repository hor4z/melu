import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Card, Field, Icon, PageHeader, Row, TextField } from '@milo/ui'
import { api, type Me } from '../lib/api'
import { ROLES, SPACE_KINDS } from '../lib/composition'

function splitName(full: string): [string, string] {
  const f = full.trim().split(/\s+/).filter(Boolean)
  return f.length === 0 ? ['', ''] : [f[0], f.slice(1).join(' ')]
}

export function Profile({ me }: { me: Me }) {
  const qc = useQueryClient()
  const { person } = me
  const guess = splitName(person.name)
  const [first, setFirst] = useState(person.firstName ?? guess[0])
  const [last, setLast] = useState(person.lastName ?? guess[1])
  const [nick, setNick] = useState(person.nickname ?? '')

  const shown = nick.trim() || `${first.trim()} ${last.trim()}`.trim()
  const rolesOf = (spaceId: string) => [...new Set(me.memberships.filter((m) => m.spaceId === spaceId).map((m) => m.role))]

  const save = useMutation({
    mutationFn: () => api.put<Me>('/api/me', { firstName: first.trim(), lastName: last.trim(), nickname: nick.trim() }),
    onSuccess: (up) => qc.setQueryData(['me'], up),
  })

  const dirty = first.trim() !== (person.firstName ?? guess[0]) || last.trim() !== (person.lastName ?? guess[1])
    || nick.trim() !== (person.nickname ?? '')
  const canSave = shown !== '' && dirty && !save.isPending

  function revert() {
    setFirst(person.firstName ?? guess[0]); setLast(person.lastName ?? guess[1]); setNick(person.nickname ?? '')
    save.reset()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi perfil"
        subtitle="Cómo te ve el resto."
        actions={<>
          {shown === '' && <span className="text-body text-bad-ink">Poné al menos un nombre o un apodo.</span>}
          {save.isError && <span className="text-body text-bad-ink">No se pudo guardar. Probá de nuevo.</span>}
          {save.isSuccess && !dirty && (
            <span className="flex items-center gap-1 text-body text-ok-ink"><Icon name="check" size={16} /> Guardado</span>
          )}
          {dirty && <Button size="sm" variant="ghost" onClick={revert}>Descartar</Button>}
          <Button size="sm" variant="brand" onClick={() => save.mutate()} disabled={!canSave}>
            {save.isPending ? 'Guardando' : 'Guardar'}
          </Button>
        </>}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="flex flex-col items-center gap-3 p-5 text-center">
            <Avatar name={shown || person.name} src={person.avatarUrl} size={112} />
            <div className="min-w-0">
              <h2 className="break-words text-title">{shown || 'Sin nombre'}</h2>
              <p className="break-all text-body text-text-muted">{person.email}</p>
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-title">Dónde estás</h2>
            {me.spaces.length === 0
              ? <p className="text-body text-text-muted">Todavía no estás en ningún espacio.</p>
              : me.spaces.map((e) => (
                <Row key={e.id} label={e.name} hint={rolesOf(e.id).map((r) => ROLES[r] ?? r).join(', ') || SPACE_KINDS[e.kind] || e.kind}>
                  <Icon name="school" size={20} className="icon-muted" />
                </Row>
              ))}
          </Card>
        </aside>

        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-title">Tu nombre</h2>
            <p className="text-body text-text-muted">
              El apellido es para el guía que tiene dos Sofías en el mismo grupo. El apodo, si lo ponés, gana: es como te vamos a llamar.
            </p>
          </div>
          <div className="flex max-w-lg flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><TextField value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} /></Field>
              <Field label="Apellido"><TextField value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} /></Field>
            </div>
            <Field label="Apodo" hint="Opcional.">
              <TextField value={nick} onChange={(e) => setNick(e.target.value)} maxLength={60} placeholder={first || 'Cómo te dicen'} />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  )
}
