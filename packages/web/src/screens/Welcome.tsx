import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Divider, Field, Icon, Kbd, RadioGroup, TextField, Textarea } from '@milo/ui'
import { Logo } from '../brand/logo'
import { Stepper, UserMenu } from '../blocks/Product'
import { AddLearners } from '../blocks/AddLearners'
import { api, type Activity, type Space, type SpaceKind, type Group, type Me } from '../lib/api'
import { SPACE_KINDS } from '../lib/composition'
import { useSignOut } from '../lib/session'
import { CompositionChips } from '../blocks/Chips'

const KIND_OPTIONS = (Object.entries(SPACE_KINDS) as [SpaceKind, string][]).map(([value, label]) => ({ value, label }))

// La primera vez: nadie te puso todavía en ningún lado. O sos quien arma, o alguien te tiene que
// sumar, y lo único que necesita de vos es el email con el que acabás de entrar.
export function Welcome({ me }: { me: Me }) {
  const [door, setDoor] = useState<'teach' | null>(null)
  const [copied, setCopied] = useState(false)
  const signOut = useSignOut()
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex items-center justify-between px-8 py-5">
        <Logo />
        <UserMenu name={me.person.name} email={me.person.email} avatar={me.person.avatarUrl} onSignOut={signOut} />
      </header>
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-6">
        {!door && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-display">Hola, {me.person.name.split(' ')[0]}. Todavía no tenés nada acá.</h1>
              <p className="mt-2 text-reading text-text-muted">Dos formas de que eso cambie.</p>
            </div>

            <Card interactive className="p-0">
              <button type="button" onClick={() => setDoor('teach')} className="flex w-full items-start gap-4 p-6 text-left">
                <span className="mark grid size-14 shrink-0 place-items-center rounded-[var(--radius-xl)]">
                  <Icon name="school" size={28} className="icon-muted" />
                </span>
                <span className="flex flex-col gap-2">
                  <span className="text-title">Enseño</span>
                  <span className="text-body text-text-muted">
                    Armo actividades y las doy a un grupo: mi aula, mi taller, mis alumnos particulares.
                    Veo cómo les va y qué les cuesta.
                  </span>
                  <span className="flex items-center gap-1 text-body font-semibold">Seguir <Icon name="arrow_forward" size={16} /></span>
                </span>
              </button>
            </Card>

            {/* Lo que reemplaza al código: en vez de pedirle al chico que consiga seis letras,
                le mostramos lo único que su docente necesita de él. */}
            <Card surface="muted" className="mt-5 flex flex-col gap-3 p-5">
              <h2 className="text-title">¿Te están por sumar a un grupo?</h2>
              <p className="text-body text-text-muted">
                Pasale este email a tu docente. Cuando te sume, tus misiones aparecen acá solas:
                no hay nada que escribir.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Kbd>{me.person.email}</Kbd>
                <Button
                  variant="muted" size="sm" icon={copied ? 'check' : 'content_copy'}
                  onClick={() => { void navigator.clipboard.writeText(me.person.email); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                >
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

// El alta del docente en tres pasos: espacio, grupo con su gente, primera actividad asignada.
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
        <Card className="p-5">
          <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
            <div>
              <h2 className="text-title">Tu espacio y tu primer grupo</h2>
              <p className="text-body text-text-muted">El espacio es quien organiza (vos, tu escuela, tu club). El grupo es la gente que aprende junta.</p>
            </div>
            <Field label="Nombre del espacio">
              <TextField placeholder="Taller de los sábados" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
            <RadioGroup label="Qué es" value={kind} onChange={setKind} options={KIND_OPTIONS} />
            <Field label="Tu primer grupo">
              <TextField placeholder="4° A · Matemática" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
            </Field>
            {/* Lo mismo que se pide para crear un grupo desde adentro: el nombre lo distingue,
                esto cuenta de qué se trata. */}
            <Field label="De qué se trata" required hint="Cuándo se juntan, con qué acuerdo, qué están haciendo.">
              <Textarea placeholder="El grado de la mañana. Este trimestre venimos con fracciones." value={groupAbout} onChange={(e) => setGroupAbout(e.target.value)} rows={2} />
            </Field>
            {create.isError && <span className="text-body text-bad-ink">No se pudo crear. Probá de nuevo.</span>}
            <div className="flex gap-2">
              <Button variant="brand" type="submit" disabled={create.isPending || groupAbout.trim() === ''}>
                {create.isPending ? 'Creando' : 'Crear y seguir'}
              </Button>
              <Button variant="ghost" onClick={onBack}>Volver</Button>
            </div>
          </form>
        </Card>
      )}

      {step === 1 && group && (
        <Card className="flex flex-col gap-5 p-5">
          <div>
            <h2 className="text-title">Sumá a los chicos</h2>
            <p className="text-body text-text-muted">Entran con Google y el grupo ya los espera. Sin códigos, sin contraseñas, sin registros.</p>
          </div>
          <AddLearners groupId={group.id} groupName={group.name} />
          <Divider />
          <div className="flex gap-2">
            <Button variant="brand" onClick={() => setStep(2)}>Seguir</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>Lo hago después</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="flex flex-col gap-5 p-5">
          <div>
            <h2 className="text-title">Elegí una primera actividad</h2>
            <p className="text-body text-text-muted">Son recetas: combinaciones que funcionan. Se asigna al grupo ya mismo y la podés editar después como un documento.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data?.recipes.slice(0, 6).map((r) => (
              <Card key={r.id} interactive className="p-0">
                <button type="button" disabled={assign.isPending} onClick={() => assign.mutate(r.id)} className="flex w-full flex-col gap-2 p-3 text-left disabled:opacity-60">
                  <span className="text-body font-semibold">{r.title}</span>
                  <CompositionChips c={r.composition} compact />
                  <span className="line-clamp-2 text-meta text-text-muted">{r.description}</span>
                </button>
              </Card>
            ))}
          </div>
          <div><Button variant="ghost" onClick={finish}>Saltar, voy a Inicio</Button></div>
        </Card>
      )}
    </div>
  )
}
