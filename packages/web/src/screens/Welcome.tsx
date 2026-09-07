import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Copy } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, DoodleWave, Field, Heading, Icon, Input, Logo, RadioGroup, RadioGroupItem, Text, Textarea } from '@melu/ui'
import { Stepper, UserMenu } from '../blocks/Product'
import { AddLearners } from '../blocks/AddLearners'
import { api, type Activity, type Space, type SpaceKind, type Group, type Me } from '../lib/api'
import { SPACE_KINDS } from '../lib/composition'
import { useSignOut } from '../lib/session'
import { CompositionChips } from '../blocks/Chips'

// First time: nobody has put you anywhere yet. Either you are the one who sets things up, or
// somebody has to add you, and the only thing they need from you is the email you just used.
export function Welcome({ me }: { me: Me }) {
  const [door, setDoor] = useState<'teach' | null>(null)
  const [copied, setCopied] = useState(false)
  const signOut = useSignOut()
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-8 py-5">
        <Logo />
        <UserMenu name={me.person.name} email={me.person.email} avatar={me.person.avatarUrl} onSignOut={signOut} />
      </header>
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-6">
        {!door && (
          <>
            <div className="mb-10 text-center">
              <Heading level={1} size="display">Hola, {me.person.name.split(' ')[0]}. Todavía no tenés nada acá.</Heading>
              <Text variant="muted" className="mt-2">Dos formas de que eso cambie.</Text>
            </div>

            <Door illustration={<DoodleWave size={96} className="text-ink" />} tint="bg-teal" title="Enseño"
              text="Armo actividades y las doy a un grupo: mi aula, mi taller, mis alumnos particulares. Veo cómo les va y qué les cuesta."
              onClick={() => setDoor('teach')} />

            {/* Lo que reemplaza al código: en vez de pedirle al chico que consiga seis letras,
                le mostramos lo único que su docente necesita de él. */}
            <Card variant="yellow" padding="lg" className="mt-5 gap-3">
              <Heading level={2} size="lg">¿Te están por sumar a un grupo?</Heading>
              <Text size="sm" variant="muted">
                Pasale este email a tu docente. Cuando te sume, tus misiones aparecen acá solas :
                no hay nada que escribir.
              </Text>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm">{me.person.email}</code>
                <Button variant="secondary" size="sm" startIcon={<Icon icon={copied ? Check : Copy} size="sm" />}
                  onClick={() => { void navigator.clipboard.writeText(me.person.email); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </Card>
          </>
        )}
        {door === 'teach' && <Onboarding onBack={() => setDoor(null)} />}
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

// Teacher onboarding in three steps: space → group and its people → first assigned activity.
function Onboarding({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SpaceKind>('personal')
  const [groupName, setGroupName] = useState('')
  const [groupAbout, setGroupAbout] = useState('')
  const [space, setSpace] = useState<Space | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const recipes = useQuery({ queryKey: ['activities'], queryFn: () => api.get<{ recipes: Activity[]; mine: Activity[] }>('/api/activities'), enabled: step === 2 })

  const create = useMutation({
    mutationFn: async () => {
      const e = await api.post<Space>('/api/spaces', { name, kind })
      const g = await api.post<Group>('/api/groups', { spaceId: e.id, name: groupName || 'Mi primer grupo', description: groupAbout })
      return { e, g }
    },
    onSuccess: ({ e, g }) => { setSpace(e); setGroup(g); setStep(1) },
  })
  const assign = useMutation({
    mutationFn: async (recipeId: string) => { const a = await api.post<Activity>('/api/activities', { spaceId: space!.id, fromRecipe: recipeId }); await api.post(`/api/activities/${a.id}/assign`, { groupId: group!.id }); return a },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
  const finish = () => qc.invalidateQueries({ queryKey: ['me'] })

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={['Tu espacio', 'Sumá a los chicos', 'Primera actividad']} current={step} />

      {step === 0 && (
        <Card asChild padding="lg"><form className="grid gap-6 lg:grid-cols-[1fr_260px]" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <div className="flex flex-col gap-5">
            <div><Heading size="xl">Tu espacio y tu primer grupo</Heading><Text variant="muted">El espacio es quien organiza (vos, tu escuela, tu club). El grupo es la gente que aprende junta.</Text></div>
            <Field label="Nombre del espacio"><Input placeholder="Taller de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
            <Field asGroup label="Qué es">
              <RadioGroup value={kind} onValueChange={(v) => setKind(v as SpaceKind)} orientation="horizontal">
                {(Object.entries(SPACE_KINDS) as [SpaceKind, string][]).map(([v, l]) => (
                  <RadioGroupItem key={v} value={v}>{l}</RadioGroupItem>
                ))}
              </RadioGroup>
            </Field>
            <Field label="Tu primer grupo"><Input placeholder="4° A · Matemática" value={groupName} onChange={(e) => setGroupName(e.target.value)} required /></Field>
            {/* Lo mismo que se pide para crear un grupo desde adentro: el nombre lo distingue,
                esto cuenta de qué se trata. */}
            <Field label="De qué se trata" required description="Cuándo se juntan, con qué acuerdo, qué están haciendo.">
              <Textarea placeholder="El grado de la mañana. Este trimestre venimos con fracciones." value={groupAbout} onChange={(e) => setGroupAbout(e.target.value)} rows={2} autoGrow />
            </Field>
            {create.isError && <Text size="sm" variant="danger">No se pudo crear. Probá de nuevo.</Text>}
            <div className="flex gap-2"><Button type="submit" loading={create.isPending} disabled={groupAbout.trim() === ''}>Crear y seguir</Button><Button variant="ghost" onClick={onBack}>Volver</Button></div>
          </div>
          <Card variant="teal" padding="md" className="text-sm"><div className="font-semibold">Después vas a poder</div><ul className="mt-2 list-disc space-y-1 pl-4 text-ink-muted"><li>Crear más grupos y espacios.</li><li>Invitar a otros docentes a coeditar.</li><li>Cambiar todo esto.</li></ul></Card>
        </form></Card>
      )}

      {step === 1 && group && (
        <Card padding="lg" className="gap-5">
          <div>
            <Heading level={2} size="xl">Sumá a los chicos</Heading>
            <Text variant="muted">Entran con Google y el grupo ya los espera. Sin códigos, sin contraseñas, sin registros.</Text>
          </div>
          <AddLearners groupId={group.id} groupName={group.name} />
          <div className="flex gap-2 border-t border-line pt-4">
            <Button onClick={() => setStep(2)}>Seguir</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>Lo hago después</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card padding="lg" className="gap-5">
          <div><Heading size="xl">Elegí una primera actividad</Heading><Text variant="muted">Son recetas: combinaciones que funcionan. Se asigna al grupo ya mismo y la podés editar después como un documento.</Text></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data?.recipes.slice(0, 6).map((r) => (
              <Card key={r.id} asChild interactive padding="sm">
                <button type="button" disabled={assign.isPending} onClick={() => assign.mutate(r.id)} className="gap-2 text-left disabled:opacity-60">
                  <span className="font-semibold">{r.title}</span><CompositionChips c={r.composition} compact /><span className="line-clamp-2 text-xs text-ink-muted">{r.description}</span>
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

