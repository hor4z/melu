import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Copy } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, DoodleGroup, DoodleWave, Field, Heading, Icon, Input, Logo, Text, cn } from '@melu/ui'
import { Stepper } from '../blocks/Product'
import { api, type Activity, type Space, type SpaceKind, type Group, type Invite, type Me } from '../lib/api'
import { SPACE_KINDS } from '../lib/composition'
import { useSignOut } from '../lib/session'
import { CompositionChips } from '../blocks/Chips'

// First time: you are nothing yet. You pick where to come in.
export function Welcome({ me }: { me: Me }) {
  const [door, setDoor] = useState<'ensenio' | 'aprendo' | null>(null)
  const signOut = useSignOut()
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-8 py-5"><Logo /><Button variant="ghost" size="sm" onClick={signOut}>Salir ({me.person.Email})</Button></header>
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-6">
        {!door && (
          <>
            <div className="mb-10 text-center">
              <Heading level={1} size="display">Hola, {me.person.Name.split(' ')[0]}. ¿Qué venís a hacer?</Heading>
              <Text variant="muted" className="mt-2">Elegí una puerta. Después podés ser las dos cosas.</Text>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Door illustration={<DoodleWave size={96} className="text-ink" />} tint="bg-teal" title="Enseño" text="Armo actividades y las doy a un grupo: mi aula, mi taller, mis alumnos particulares. Veo cómo les va y qué les cuesta." onClick={() => setDoor('ensenio')} />
              <Door illustration={<DoodleGroup size={150} className="text-ink" />} tint="bg-yellow" title="Aprendo" text="Mi docente me dio un código de seis letras. Quiero ver mis misiones y hacerlas." onClick={() => setDoor('aprendo')} />
            </div>
          </>
        )}
        {door === 'ensenio' && <Onboarding onBack={() => setDoor(null)} />}
        {door === 'aprendo' && <Join onBack={() => setDoor(null)} />}
      </div>
    </div>
  )
}

function Door({ illustration, tint, title, text, onClick }: { illustration: React.ReactNode; tint: string; title: string; text: string; onClick: () => void }) {
  return (
    <Card asChild interactive>
      <button type="button" onClick={onClick} className="text-left">
        <CardMedia className={`h-40 ${tint}`}>{illustration}</CardMedia>
        <CardContent className="flex flex-1 flex-col gap-2 p-6">
          <Heading size="xl">{title}</Heading>
          <Text size="sm" variant="muted">{text}</Text>
          <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-semibold">Seguir <Icon icon={ArrowRight} size="sm" /></span>
        </CardContent>
      </button>
    </Card>
  )
}

// Teacher onboarding in three steps: space → group (with an invite) → first assigned activity.
function Onboarding({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SpaceKind>('personal')
  const [groupName, setGroupName] = useState('')
  const [space, setSpace] = useState<Space | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [inv, setInv] = useState<Invite | null>(null)
  const [copied, setCopied] = useState(false)
  const recipes = useQuery({ queryKey: ['activities'], queryFn: () => api.get<{ recipes: Activity[]; mine: Activity[] }>('/api/activities'), enabled: step === 2 })

  const create = useMutation({
    mutationFn: async () => {
      const e = await api.post<Space>('/api/spaces', { name, kind })
      const g = await api.post<Group>('/api/groups', { spaceId: e.id, name: groupName || 'Mi primer grupo' })
      const i = await api.get<Invite>(`/api/groups/${g.id}/invite`)
      return { e, g, i }
    },
    onSuccess: ({ e, g, i }) => { setSpace(e); setGroup(g); setInv(i); setStep(1) },
  })
  const assign = useMutation({
    mutationFn: async (recipeId: string) => { const a = await api.post<Activity>('/api/activities', { spaceId: space!.id, fromRecipe: recipeId }); await api.post(`/api/activities/${a.id}/assign`, { groupId: group!.id }); return a },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
  const finish = () => qc.invalidateQueries({ queryKey: ['me'] })

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={['Tu espacio', 'Invitá a los chicos', 'Primera actividad']} current={step} />

      {step === 0 && (
        <Card asChild padding="lg"><form className="grid gap-6 lg:grid-cols-[1fr_260px]" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <div className="flex flex-col gap-5">
            <div><Heading size="xl">Tu espacio y tu primer grupo</Heading><Text variant="muted">El espacio es quien organiza (vos, tu escuela, tu club). El grupo es la gente que aprende junta.</Text></div>
            <Field label="Nombre del espacio"><Input placeholder="Taller de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
            <fieldset className="flex flex-wrap gap-2">
              {(Object.entries(SPACE_KINDS) as [SpaceKind, string][]).map(([v, l]) => (
                <label key={v} className={cn('cursor-pointer rounded-md border-2 px-3 py-1.5 text-sm font-medium', kind === v ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}><input type="radio" className="sr-only" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} />{l}</label>
              ))}
            </fieldset>
            <Field label="Tu primer grupo"><Input placeholder="4° A · Matemática" value={groupName} onChange={(e) => setGroupName(e.target.value)} required /></Field>
            {create.isError && <Text size="sm" variant="danger">No se pudo crear. Probá de nuevo.</Text>}
            <div className="flex gap-2"><Button type="submit" loading={create.isPending}>Crear y seguir</Button><Button variant="ghost" onClick={onBack}>Volver</Button></div>
          </div>
          <Card variant="teal" padding="md" className="text-sm"><div className="font-semibold">Después vas a poder</div><ul className="mt-2 list-disc space-y-1 pl-4 text-ink-muted"><li>Crear más grupos y espacios.</li><li>Invitar a otros docentes a coeditar.</li><li>Cambiar todo esto.</li></ul></Card>
        </form></Card>
      )}

      {step === 1 && inv && (
        <Card padding="lg" className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="flex flex-col gap-5">
            <div><h2 className="font-display text-2xl font-semibold">Invitá a los chicos a «{group?.name}»</h2><Text variant="muted">Entran con Google y escriben este código, o escanean el QR. Sin registros, sin contraseñas.</Text></div>
            <Card variant="yellow" padding="md" className="flex-row flex-wrap items-center gap-6">
              <div><div className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Código del grupo</div><div className="font-mono text-4xl font-semibold tracking-[0.3em]">{inv.code}</div></div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" startIcon={<Icon icon={copied ? Check : Copy} />} onClick={() => { navigator.clipboard.writeText(inv.link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }}>{copied ? 'Copiado' : 'Copiar link'}</Button>
                <Text size="xs" variant="muted" mono>{inv.link}</Text>
              </div>
            </Card>
            <div className="flex gap-2"><Button onClick={() => setStep(2)}>Ya lo compartí, seguir</Button><Button variant="ghost" onClick={() => setStep(2)}>Lo hago después</Button></div>
          </div>
          <Card padding="sm" className="items-center gap-2"><img src={inv.qr} alt="QR para unirse" className="size-44" /><Text size="xs" variant="muted">Escanear con el celular</Text></Card>
        </Card>
      )}

      {step === 2 && (
        <Card padding="lg" className="gap-5">
          <div><Heading size="xl">Elegí una primera actividad</Heading><Text variant="muted">Son recetas: combinaciones que funcionan. Se asigna al grupo ya mismo y la podés editar después como un documento.</Text></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data?.recipes.slice(0, 6).map((r) => (
              <Card key={r.id} asChild interactive padding="sm">
                <button type="button" disabled={assign.isPending} onClick={() => assign.mutate(r.id)} className="gap-2 text-left disabled:opacity-60">
                  <span className="font-semibold">{r.title}</span><CompositionChips c={r.composition} compact /><span className="line-clamp-2 text-xs text-ink-muted">{r.document.phases[0]?.blocks.find((b) => b.type === 'paragraph')?.text}</span>
                </button>
              </Card>
            ))}
          </div>
          <div className="flex gap-2"><Button variant="ghost" onClick={finish}>Saltar, voy a Inicio</Button></div>
        </Card>
      )}
    </div>
  )
}

function Join({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const joinIt = useMutation({ mutationFn: () => api.post<Group>('/api/join', { code: code.trim() }), onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }) })
  return (
    <Card asChild padding="lg"><form className="mx-auto grid max-w-2xl gap-6 sm:grid-cols-[1fr_200px]" onSubmit={(e) => { e.preventDefault(); joinIt.mutate() }}>
      <div className="flex flex-col gap-5">
        <div><Heading size="xl">El código de tu grupo</Heading><Text variant="muted">Te lo da tu docente. Son seis letras y números, tipo <span className="font-mono font-semibold">DEMO4A</span>. Si te mandaron un link, con tocarlo alcanza.</Text></div>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123"
          className="w-full rounded-lg border-2 border-line bg-surface px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] uppercase outline-none focus:border-ink" />
        {joinIt.isError && <Text size="sm" variant="danger">Ese código no existe. Revisalo con tu docente.</Text>}
        <div className="flex gap-2"><Button type="submit" loading={joinIt.isPending} disabled={code.length < 6}>Entrar al grupo</Button><Button variant="ghost" onClick={onBack}>Volver</Button></div>
      </div>
      <Card variant="yellow" padding="none" className="place-items-center justify-center"><DoodleGroup size={170} className="text-ink" /></Card>
    </form></Card>
  )
}
