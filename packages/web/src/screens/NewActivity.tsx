import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, FilePlus2 } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, Chip, Field, FormActions, Eyebrow, Heading, Icon, Input, Stepper, Text, Toggle } from '@/kit'
import { api, type Activity, type Composition, type Lens } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { CompositionChips } from '../blocks/Chips'
import { SETTINGS, EXPERIENCES, SOCIAL } from '../lib/composition'
import { Cover } from '../blocks/Cover'

// Wizard: template → adjust → editor. Never a blank form to start with.
export function NewActivity() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['activities', spaceId], queryFn: () => api.get<{ recipes: Activity[]; mine: Activity[] }>(`/api/activities?space=${spaceId}`) })
  const lenses = useQuery({ queryKey: ['lenses'], queryFn: () => api.get<Lens[]>('/api/lenses') })
  const [step, setStep] = useState(0)
  const [base, setBase] = useState<Activity | null>(null)
  const [title, setTitle] = useState('')
  const [comp, setComp] = useState<Composition>({ experience: 'challenge', lens: 'no_lens', setting: ['screen'], social: 'alone', disciplines: [] })
  const [disc, setDisc] = useState('')
  const [query, setQuery] = useState<string>('')
  const spaceTemplates = q.data?.mine.filter((a) => a.isRecipe) ?? []
  const everyOne = [...spaceTemplates, ...(q.data?.recipes ?? [])]
  const shown = query ? everyOne.filter((r) => r.composition.experience === query || r.composition.lens === query) : everyOne

  const create = useMutation({
    mutationFn: () => api.post<Activity>('/api/activities', base
      ? { spaceId, fromRecipe: base.id, title }
      : { spaceId, title, composition: { ...comp, disciplines: disc.split(',').map((s) => s.trim()).filter(Boolean), evidence: [] } }),
    onSuccess: (a) => nav(`/activities/${a.id}`),
  })
  const pick = (r: Activity | null) => { setBase(r); if (r) { setTitle(r.title); setComp(r.composition); setDisc((r.composition.disciplines ?? []).join(', ')) } else { setTitle('') } setStep(1) }
  const set = (k: keyof Composition, v: string) => setComp((c) => ({ ...c, [k]: v }))
  const toggleEsc = (v: string) => setComp((c) => ({ ...c, setting: (c.setting ?? []).includes(v) ? (c.setting ?? []).filter((x) => x !== v) : [...(c.setting ?? []), v] }))
  const lensPhases = lenses.data?.find((l) => l.key === comp.lens)?.phases ?? []

  return (
    <div className="flex flex-col gap-6">
      <Link to="/activities" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Actividades</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Eyebrow>Nueva actividad</Eyebrow><Heading level={1} size="2xl" className="mt-1">{step === 0 ? 'Empezá desde una plantilla' : 'Ajustá la composición'}</Heading><Text variant="muted">{step === 0 ? 'Cada plantilla es una combinación que funciona: qué hacen, cómo se recorre, dónde, con quién. La copiás y la hacés tuya.' : 'Seis decisiones. Lo que elijas acá define las fases y qué evidencia vuelve. Todo se puede cambiar después.'}</Text></div>
        <Stepper steps={['Plantilla', 'Ajustar', 'Editar']} current={step} />
      </header>

      {step === 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle pressed={!query} onPressedChange={() => setQuery('')} variant="outline" size="sm">Todas</Toggle>
            {Object.entries(EXPERIENCES).filter(([k]) => everyOne.some((r) => r.composition.experience === k)).map(([k, l]) => (
              <Toggle key={k} pressed={query === k} onPressedChange={() => setQuery(query === k ? '' : k)} variant="outline" size="sm">{l}</Toggle>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card asChild interactive variant="dashed">
              <button type="button" onClick={() => pick(null)} className="min-h-64 items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-xl bg-muted"><Icon icon={FilePlus2} size="xl" /></span>
                <span className="font-semibold">En blanco</span><span className="text-sm text-ink-muted">Elegís los ejes y escribís todo vos.</span>
              </button>
            </Card>
            {shown.map((r) => (
              <Card key={r.id} asChild interactive>
                <button type="button" onClick={() => pick(r)} className="text-left">
                  <CardMedia><Cover title={r.title} className="h-32 w-full" /></CardMedia>
                  <CardContent className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{r.title}</span>{r.spaceId && <Chip size="sm" color="lilac">Mía</Chip>}</div>
                    <CompositionChips c={r.composition} compact />
                    <p className="line-clamp-2 text-sm text-ink-muted">{r.document.phases[0]?.blocks.find((b) => b.type === 'paragraph')?.text}</p>
                    <Text size="xs" variant="muted">{r.document.phases.length} fases · {r.document.phases.map((f) => f.name).join(' → ')}</Text>
                  </CardContent>
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <form className="grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={(e) => { e.preventDefault(); create.mutate() }}>
          <Card padding="lg" className="gap-6">
            <Field label="Título"><Input placeholder="Puente de espagueti" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></Field>
            <AxisRow title="Experiencia" hint="qué van a hacer" options={EXPERIENCES} value={[comp.experience ?? '']} onPick={(v) => set('experience', v)} />
            <AxisRow title="Lente" hint="cómo se recorre; trae las fases" options={Object.fromEntries((lenses.data ?? []).map((l) => [l.key, l.name]))} value={[comp.lens ?? '']} onPick={(v) => set('lens', v)} />
            {lensPhases.length > 1 && <div className="-mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">Fases: {lensPhases.map((f, i) => <span key={f.key} className="flex items-center gap-1.5"><span className="rounded bg-teal px-1.5 py-0.5 font-medium text-brand-text">{f.name}</span>{i < lensPhases.length - 1 && '→'}</span>)}</div>}
            <AxisRow title="Escenario" hint="dónde ocurre; puede ser más de uno" options={SETTINGS} value={comp.setting ?? []} onPick={toggleEsc} />
            <AxisRow title="Social" hint="con quién" options={SOCIAL} value={[comp.social ?? '']} onPick={(v) => set('social', v)} />
            <Field label="Disciplinas" description="Separadas por coma; todas las que toque." optional>
              <Input placeholder="Matemática · medida, Física · fuerzas" value={disc} onChange={(e) => setDisc(e.target.value)} />
            </Field>
            {create.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
            <FormActions><Button type="submit" loading={create.isPending}>Abrir en el editor</Button><Button variant="ghost" onClick={() => setStep(0)}>Volver a plantillas</Button></FormActions>
          </Card>
          <Card padding="md" asChild><aside className="gap-4 self-start">
            <Eyebrow>Vista previa</Eyebrow>
            <Cover title={title || base?.title || 'Sin título'} className="h-28 rounded-xl" />
            <div className="font-display text-xl font-semibold">{title || 'Sin título'}</div>
            <CompositionChips c={{ ...comp, disciplines: disc.split(',').map((s) => s.trim()).filter(Boolean) }} />
            {base && <Text size="xs" variant="muted">Basada en «{base.title}»: {base.document.phases.reduce((n, f) => n + f.blocks.length, 0)} bloques listos para editar.</Text>}
          </aside></Card>
        </form>
      )}
    </div>
  )
}

function AxisRow({ title, hint, options, value, onPick }: { title: string; hint: string; options: Record<string, string>; value: string[]; onPick: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{title} <span className="font-normal text-ink-subtle">— {hint}</span></legend>
      <div className="flex flex-wrap gap-1.5">{Object.entries(options).map(([k, l]) => <button key={k} type="button" onClick={() => onPick(k)} className={`rounded-md border-2 px-3 py-1 text-sm font-medium transition ${value.includes(k) ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}>{l}</button>)}</div>
    </fieldset>
  )
}
