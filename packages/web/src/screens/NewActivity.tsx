import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Breadcrumb, Button, Card, Chip, Field, Icon, PageHeader, TextField, Textarea } from '@milo/ui'
import { Stepper } from '../blocks/Product'
import { api, type Activity, type Composition, type Lens } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { CompositionChips } from '../blocks/Chips'
import { SETTINGS, EXPERIENCES, SOCIAL } from '../lib/composition'
import { Cover } from '../blocks/Cover'

// El asistente: plantilla, ajustar, editor. Nunca un formulario en blanco para arrancar.
export function NewActivity() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['activities', spaceId], queryFn: () => api.get<{ recipes: Activity[]; mine: Activity[] }>(`/api/activities?space=${spaceId}`) })
  const lenses = useQuery({ queryKey: ['lenses'], queryFn: () => api.get<Lens[]>('/api/lenses') })
  const [step, setStep] = useState(0)
  const [base, setBase] = useState<Activity | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [comp, setComp] = useState<Composition>({ experience: 'challenge', lens: 'no_lens', setting: ['screen'], social: 'alone', disciplines: [] })
  const [disc, setDisc] = useState('')
  const [query, setQuery] = useState<string>('')
  const spaceTemplates = q.data?.mine.filter((a) => a.isRecipe) ?? []
  const everyOne = [...spaceTemplates, ...(q.data?.recipes ?? [])]
  const shown = query ? everyOne.filter((r) => r.composition.experience === query || r.composition.lens === query) : everyOne

  const create = useMutation({
    mutationFn: () => api.post<Activity>('/api/activities', base
      ? { spaceId, fromRecipe: base.id, title, description }
      : { spaceId, title, description, composition: { ...comp, disciplines: disc.split(',').map((s) => s.trim()).filter(Boolean), evidence: [] } }),
    onSuccess: (a) => nav(`/activities/${a.id}`),
  })
  // Copiar una plantilla arranca con su descripción puesta: es un punto de partida para
  // editar, no un campo en blanco que hay que volver a pensar.
  const pick = (r: Activity | null) => { setBase(r); if (r) { setTitle(r.title); setDescription(r.description); setComp(r.composition); setDisc((r.composition.disciplines ?? []).join(', ')) } else { setTitle(''); setDescription('') } setStep(1) }
  const set = (k: keyof Composition, v: string) => setComp((c) => ({ ...c, [k]: v }))
  const toggleEsc = (v: string) => setComp((c) => ({ ...c, setting: (c.setting ?? []).includes(v) ? (c.setting ?? []).filter((x) => x !== v) : [...(c.setting ?? []), v] }))
  const lensPhases = lenses.data?.find((l) => l.key === comp.lens)?.phases ?? []

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Actividades', onClick: () => nav('/activities') }, { label: 'Nueva actividad' }]} />
      <PageHeader
        title={step === 0 ? 'Empezá desde una plantilla' : 'Ajustá la composición'}
        subtitle={step === 0
          ? 'Cada plantilla es una combinación que funciona: qué hacen, cómo se recorre, dónde, con quién. La copiás y la hacés tuya.'
          : 'Seis decisiones. Lo que elijas acá define las fases y qué evidencia vuelve. Todo se puede cambiar después.'}
        actions={<Stepper steps={['Plantilla', 'Ajustar', 'Editar']} current={step} />}
      />

      {step === 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={!query} onClick={() => setQuery('')}>Todas</Chip>
            {Object.entries(EXPERIENCES).filter(([k]) => everyOne.some((r) => r.composition.experience === k)).map(([k, l]) => (
              <Chip key={k} active={query === k} onClick={() => setQuery(query === k ? '' : k)}>{l}</Chip>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card interactive className="p-0">
              <button type="button" onClick={() => pick(null)} className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-[var(--radius-xl)] bg-surface-muted">
                  <Icon name="note_add" size={26} className="icon-muted" />
                </span>
                <span className="text-body font-semibold">En blanco</span>
                <span className="text-body text-text-muted">Elegís los ejes y escribís todo vos.</span>
              </button>
            </Card>
            {shown.map((r) => (
              <Card key={r.id} interactive className="p-0">
                <button type="button" onClick={() => pick(r)} className="flex w-full gap-3 p-3 text-left">
                  <Cover title={r.title} className="size-16 shrink-0 rounded-[var(--radius-lg)]" size={34} />
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-body font-semibold">{r.title}</span>
                      {r.spaceId && <Chip size="sm" color="purple">Mía</Chip>}
                    </span>
                    <CompositionChips c={r.composition} compact />
                    <span className="line-clamp-2 text-body text-text-muted">{r.description}</span>
                    <span className="text-meta text-text-muted">{r.document.phases.map((f) => f.name).join(' → ')}</span>
                  </span>
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <form className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <Card className="flex flex-col gap-6 p-5">
            <Field label="Título">
              <TextField placeholder="Puente de espagueti" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
            </Field>
            <Field label="Descripción" required hint="De qué se trata, para reconocerla en la lista sin abrirla.">
              <Textarea placeholder="Construir un puente que aguante un libro, con lo que haya en el aula." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </Field>
            <AxisRow title="Experiencia" hint="qué van a hacer" options={EXPERIENCES} value={[comp.experience ?? '']} onPick={(v) => set('experience', v)} />
            <AxisRow title="Lente" hint="cómo se recorre; trae las fases" options={Object.fromEntries((lenses.data ?? []).map((l) => [l.key, l.name]))} value={[comp.lens ?? '']} onPick={(v) => set('lens', v)} />
            {lensPhases.length > 1 && (
              <div className="-mt-3 flex flex-wrap items-center gap-1.5 text-meta text-text-muted">
                Fases:
                {lensPhases.map((f, i) => (
                  <span key={f.key} className="flex items-center gap-1.5">
                    <Chip size="sm" color="teal">{f.name}</Chip>
                    {i < lensPhases.length - 1 && <Icon name="chevron_right" size={14} className="icon-muted" />}
                  </span>
                ))}
              </div>
            )}
            <AxisRow title="Escenario" hint="dónde ocurre; puede ser más de uno" options={SETTINGS} value={comp.setting ?? []} onPick={toggleEsc} />
            <AxisRow title="Social" hint="con quién" options={SOCIAL} value={[comp.social ?? '']} onPick={(v) => set('social', v)} />
            <Field label="Disciplinas" hint="Separadas por coma; todas las que toque. Opcional.">
              <TextField placeholder="Matemática · medida, Física · fuerzas" value={disc} onChange={(e) => setDisc(e.target.value)} />
            </Field>
            {create.isError && <span className="text-body text-bad-ink">No se pudo crear.</span>}
            <div className="flex flex-wrap gap-2">
              <Button variant="brand" type="submit" disabled={create.isPending || title.trim() === '' || description.trim() === ''}>
                {create.isPending ? 'Creando' : 'Abrir en el editor'}
              </Button>
              <Button variant="ghost" onClick={() => setStep(0)}>Volver a plantillas</Button>
            </div>
          </Card>

          <Card surface="muted" className="flex h-fit flex-col gap-4 p-4">
            <span className="text-meta text-text-muted">Vista previa</span>
            <Cover title={title || base?.title || 'Sin título'} className="h-28 w-full rounded-[var(--radius-xl)]" size={56} />
            <div className="text-title">{title || 'Sin título'}</div>
            <CompositionChips c={{ ...comp, disciplines: disc.split(',').map((s) => s.trim()).filter(Boolean) }} />
            {base && <p className="text-meta text-text-muted">Basada en "{base.title}": {base.document.phases.reduce((n, f) => n + f.blocks.length, 0)} bloques listos para editar.</p>}
          </Card>
        </form>
      )}
    </div>
  )
}

function AxisRow({ title, hint, options, value, onPick }: { title: string; hint: string; options: Record<string, string>; value: string[]; onPick: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-body font-semibold">{title} <span className="font-normal text-text-muted">{hint}</span></legend>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(options).map(([k, l]) => (
          <Chip key={k} active={value.includes(k)} onClick={() => onPick(k)}>{l}</Chip>
        ))}
      </div>
    </fieldset>
  )
}
