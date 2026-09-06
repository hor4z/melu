import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, School } from 'lucide-react'
import { Avatar, Button, Card, Field, Heading, Icon, Input, Text } from '@melu/ui'
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading level={1} size="2xl">Mi perfil</Heading>
          <Text variant="muted">Cómo te ve el resto.</Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shown === '' && <Text size="sm" variant="danger">Poné al menos un nombre o un apodo.</Text>}
          {save.isError && <Text size="sm" variant="danger">No se pudo guardar. Probá de nuevo.</Text>}
          {save.isSuccess && !dirty && (
            <Text size="sm" className="flex items-center gap-1 text-success"><Icon icon={Check} size="sm" /> Guardado</Text>
          )}
          {dirty && <Button variant="ghost" onClick={revert}>Descartar</Button>}
          <Button onClick={() => save.mutate()} disabled={!canSave} loading={save.isPending}>Guardar</Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card padding="lg" className="items-center gap-3 text-center">
            <Avatar name={shown || person.name} src={person.avatarUrl} className="size-28" />
            <div className="min-w-0">
              <Heading level={2} size="lg" className="break-words">{shown || 'Sin nombre'}</Heading>
              <Text size="sm" variant="muted" className="break-all">{person.email}</Text>
            </div>
          </Card>

          <Card padding="lg" className="gap-3">
            <Heading level={2} size="lg">Dónde estás</Heading>
            <ul className="flex flex-col gap-2">
              {me.spaces.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.name}</span>
                    <span className="block text-xs text-ink-subtle">{rolesOf(e.id).map((r) => ROLES[r] ?? r).join(' · ') || SPACE_KINDS[e.kind] || e.kind}</span>
                  </span>
                </li>
              ))}
              {me.spaces.length === 0 && <Text size="sm" variant="muted">Todavía no estás en ningún espacio.</Text>}
            </ul>
          </Card>
        </aside>

        <Card padding="lg" className="gap-4">
          <div>
            <Heading level={2} size="lg">Tu nombre</Heading>
            <Text variant="muted">
              El apellido es para el guía que tiene dos Sofías en el mismo grupo. El apodo, si lo ponés, gana: es como te vamos a llamar.
            </Text>
          </div>
          <div className="flex max-w-lg flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><Input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} /></Field>
              <Field label="Apellido"><Input value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} /></Field>
            </div>
            <Field label="Apodo" optional>
              <Input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={60} placeholder={first || 'Cómo te dicen'} />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  )
}
