import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, FilePlus2 } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, Chip, Field, FormActions, Eyebrow, Heading, Icon, Input, Stepper, Text, Toggle } from '@/kit'
import { api, type Actividad, type Composicion, type Lente } from '../lib/api'
import { useEspacioId } from '../lib/espacio'
import { ChipsComposicion } from '../bloques/Chips'
import { ESCENARIOS, EXPERIENCIAS, SOCIAL } from '../lib/composicion'
import { Portada } from '../bloques/Portada'

// Wizard: plantilla → ajustar → editor. Nunca un formulario en blanco de entrada.
export function NuevaActividad() {
  const nav = useNavigate()
  const espacioId = useEspacioId()
  const q = useQuery({ queryKey: ['actividades', espacioId], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>(`/api/actividades?espacio=${espacioId}`) })
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  const [paso, setPaso] = useState(0)
  const [base, setBase] = useState<Actividad | null>(null)
  const [titulo, setTitulo] = useState('')
  const [comp, setComp] = useState<Composicion>({ experiencia: 'reto', lente: 'sin_lente', escenario: ['pantalla'], social: 'solo', disciplinas: [] })
  const [disc, setDisc] = useState('')
  const [filtro, setFiltro] = useState<string>('')
  const plantillasEspacio = q.data?.mias.filter((a) => a.esReceta) ?? []
  const todas = [...plantillasEspacio, ...(q.data?.recetas ?? [])]
  const visibles = filtro ? todas.filter((r) => r.composicion.experiencia === filtro || r.composicion.lente === filtro) : todas

  const crear = useMutation({
    mutationFn: () => api.post<Actividad>('/api/actividades', base
      ? { espacioId, desdeReceta: base.id, titulo }
      : { espacioId, titulo, composicion: { ...comp, disciplinas: disc.split(',').map((s) => s.trim()).filter(Boolean), evidencia: [] } }),
    onSuccess: (a) => nav(`/actividades/${a.id}`),
  })
  const elegir = (r: Actividad | null) => { setBase(r); if (r) { setTitulo(r.titulo); setComp(r.composicion); setDisc((r.composicion.disciplinas ?? []).join(', ')) } else { setTitulo('') } setPaso(1) }
  const set = (k: keyof Composicion, v: string) => setComp((c) => ({ ...c, [k]: v }))
  const toggleEsc = (v: string) => setComp((c) => ({ ...c, escenario: (c.escenario ?? []).includes(v) ? (c.escenario ?? []).filter((x) => x !== v) : [...(c.escenario ?? []), v] }))
  const lenteFases = lentes.data?.find((l) => l.clave === comp.lente)?.fases ?? []

  return (
    <div className="flex flex-col gap-6">
      <Link to="/actividades" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Actividades</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Eyebrow>Nueva actividad</Eyebrow><Heading level={1} size="2xl" className="mt-1">{paso === 0 ? 'Empezá desde una plantilla' : 'Ajustá la composición'}</Heading><Text variant="muted">{paso === 0 ? 'Cada plantilla es una combinación que funciona: qué hacen, cómo se recorre, dónde, con quién. La copiás y la hacés tuya.' : 'Seis decisiones. Lo que elijas acá define las fases y qué evidencia vuelve. Todo se puede cambiar después.'}</Text></div>
        <Stepper pasos={['Plantilla', 'Ajustar', 'Editar']} actual={paso} />
      </header>

      {paso === 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Toggle pressed={!filtro} onPressedChange={() => setFiltro('')} variant="outline" size="sm">Todas</Toggle>
            {Object.entries(EXPERIENCIAS).filter(([k]) => todas.some((r) => r.composicion.experiencia === k)).map(([k, l]) => (
              <Toggle key={k} pressed={filtro === k} onPressedChange={() => setFiltro(filtro === k ? '' : k)} variant="outline" size="sm">{l}</Toggle>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card asChild interactive variant="dashed">
              <button type="button" onClick={() => elegir(null)} className="min-h-64 items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-12 place-items-center rounded-xl bg-muted"><Icon icon={FilePlus2} size="xl" /></span>
                <span className="font-semibold">En blanco</span><span className="text-sm text-ink-muted">Elegís los ejes y escribís todo vos.</span>
              </button>
            </Card>
            {visibles.map((r) => (
              <Card key={r.id} asChild interactive>
                <button type="button" onClick={() => elegir(r)} className="text-left">
                  <CardMedia><Portada titulo={r.titulo} className="h-32 w-full" /></CardMedia>
                  <CardContent className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{r.titulo}</span>{r.espacioId && <Chip size="sm" color="lilac">Mía</Chip>}</div>
                    <ChipsComposicion c={r.composicion} compacto />
                    <p className="line-clamp-2 text-sm text-ink-muted">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</p>
                    <Text size="xs" variant="muted">{r.documento.fases.length} fases · {r.documento.fases.map((f) => f.nombre).join(' → ')}</Text>
                  </CardContent>
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      {paso === 1 && (
        <form className="grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <Card padding="lg" className="gap-6">
            <Field label="Título"><Input placeholder="Puente de espagueti" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus /></Field>
            <Eje titulo="Experiencia" pista="qué van a hacer" opciones={EXPERIENCIAS} valor={[comp.experiencia ?? '']} onPick={(v) => set('experiencia', v)} />
            <Eje titulo="Lente" pista="cómo se recorre; trae las fases" opciones={Object.fromEntries((lentes.data ?? []).map((l) => [l.clave, l.nombre]))} valor={[comp.lente ?? '']} onPick={(v) => set('lente', v)} />
            {lenteFases.length > 1 && <div className="-mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">Fases: {lenteFases.map((f, i) => <span key={f.clave} className="flex items-center gap-1.5"><span className="rounded bg-teal px-1.5 py-0.5 font-medium text-brand-text">{f.nombre}</span>{i < lenteFases.length - 1 && '→'}</span>)}</div>}
            <Eje titulo="Escenario" pista="dónde ocurre; puede ser más de uno" opciones={ESCENARIOS} valor={comp.escenario ?? []} onPick={toggleEsc} />
            <Eje titulo="Social" pista="con quién" opciones={SOCIAL} valor={[comp.social ?? '']} onPick={(v) => set('social', v)} />
            <Field label="Disciplinas" description="Separadas por coma; todas las que toque." optional>
              <Input placeholder="Matemática · medida, Física · fuerzas" value={disc} onChange={(e) => setDisc(e.target.value)} />
            </Field>
            {crear.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
            <FormActions><Button type="submit" loading={crear.isPending}>Abrir en el editor</Button><Button variant="ghost" onClick={() => setPaso(0)}>Volver a plantillas</Button></FormActions>
          </Card>
          <Card padding="md" asChild><aside className="gap-4 self-start">
            <Eyebrow>Vista previa</Eyebrow>
            <Portada titulo={titulo || base?.titulo || 'Sin título'} className="h-28 rounded-xl" />
            <div className="font-display text-xl font-semibold">{titulo || 'Sin título'}</div>
            <ChipsComposicion c={{ ...comp, disciplinas: disc.split(',').map((s) => s.trim()).filter(Boolean) }} />
            {base && <Text size="xs" variant="muted">Basada en «{base.titulo}»: {base.documento.fases.reduce((n, f) => n + f.bloques.length, 0)} bloques listos para editar.</Text>}
          </aside></Card>
        </form>
      )}
    </div>
  )
}

function Eje({ titulo, pista, opciones, valor, onPick }: { titulo: string; pista: string; opciones: Record<string, string>; valor: string[]; onPick: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">{titulo} <span className="font-normal text-ink-subtle">— {pista}</span></legend>
      <div className="flex flex-wrap gap-1.5">{Object.entries(opciones).map(([k, l]) => <button key={k} type="button" onClick={() => onPick(k)} className={`rounded-md border-2 px-3 py-1 text-sm font-medium transition ${valor.includes(k) ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}>{l}</button>)}</div>
    </fieldset>
  )
}
