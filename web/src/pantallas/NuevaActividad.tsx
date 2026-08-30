import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, FilePlus2 } from 'lucide-react'
import { Button, Eyebrow, Icon, Input, Stepper, Text } from '@/ui'
import { api, type Actividad, type Composicion, type Lente, type Yo } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'
import { ESCENARIOS, EXPERIENCIAS, SOCIAL } from '../lib/composicion'
import { Portada } from '../bloques/Portada'

// Wizard: plantilla → ajustar → editor. Nunca un formulario en blanco de entrada.
export function NuevaActividad({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['actividades'], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>('/api/actividades') })
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  const [paso, setPaso] = useState(0)
  const [base, setBase] = useState<Actividad | null>(null)
  const [titulo, setTitulo] = useState('')
  const [comp, setComp] = useState<Composicion>({ experiencia: 'reto', lente: 'sin_lente', escenario: ['pantalla'], social: 'solo', disciplinas: [] })
  const [disc, setDisc] = useState('')
  const [filtro, setFiltro] = useState<string>('')
  const espacioId = yo.espacios[0]?.id
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
        <div><Eyebrow>Nueva actividad</Eyebrow><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{paso === 0 ? 'Empezá desde una plantilla' : 'Ajustá la composición'}</h1><Text variant="muted">{paso === 0 ? 'Cada plantilla es una combinación que funciona: qué hacen, cómo se recorre, dónde, con quién. La copiás y la hacés tuya.' : 'Seis decisiones. Lo que elijas acá define las fases y qué evidencia vuelve. Todo se puede cambiar después.'}</Text></div>
        <Stepper pasos={['Plantilla', 'Ajustar', 'Editar']} actual={paso} />
      </header>

      {paso === 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setFiltro('')} className={`rounded-md border-2 px-3 py-1 text-sm font-medium ${!filtro ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}>Todas</button>
            {Object.entries(EXPERIENCIAS).filter(([k]) => todas.some((r) => r.composicion.experiencia === k)).map(([k, l]) => <button key={k} type="button" onClick={() => setFiltro(k)} className={`rounded-md border-2 px-3 py-1 text-sm font-medium ${filtro === k ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}>{l}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button type="button" onClick={() => elegir(null)} className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-6 text-center transition hover:border-ink">
              <span className="grid size-12 place-items-center rounded-xl bg-muted"><Icon icon={FilePlus2} size="xl" /></span><span className="font-semibold">En blanco</span><span className="text-sm text-ink-muted">Elegís los ejes y escribís todo vos.</span>
            </button>
            {visibles.map((r) => (
              <button key={r.id} type="button" onClick={() => elegir(r)} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:shadow-[0_0_0_2px_var(--color-ink)]">
                <Portada titulo={r.titulo} className="h-32" />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{r.titulo}</span>{r.espacioId && <span className="rounded bg-lilac px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Mía</span>}</div>
                  <ChipsComposicion c={r.composicion} compacto />
                  <p className="line-clamp-2 text-sm text-ink-muted">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</p>
                  <Text size="xs" variant="muted">{r.documento.fases.length} fases · {r.documento.fases.map((f) => f.nombre).join(' → ')}</Text>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {paso === 1 && (
        <form className="grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6">
            <label className="flex flex-col gap-1 text-sm font-medium">Título<Input placeholder="Puente de espagueti" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus /></label>
            <Eje titulo="Experiencia" pista="qué van a hacer" opciones={EXPERIENCIAS} valor={[comp.experiencia ?? '']} onPick={(v) => set('experiencia', v)} />
            <Eje titulo="Lente" pista="cómo se recorre; trae las fases" opciones={Object.fromEntries((lentes.data ?? []).map((l) => [l.clave, l.nombre]))} valor={[comp.lente ?? '']} onPick={(v) => set('lente', v)} />
            {lenteFases.length > 1 && <div className="-mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">Fases: {lenteFases.map((f, i) => <span key={f.clave} className="flex items-center gap-1.5"><span className="rounded bg-teal px-1.5 py-0.5 font-medium text-brand-text">{f.nombre}</span>{i < lenteFases.length - 1 && '→'}</span>)}</div>}
            <Eje titulo="Escenario" pista="dónde ocurre; puede ser más de uno" opciones={ESCENARIOS} valor={comp.escenario ?? []} onPick={toggleEsc} />
            <Eje titulo="Social" pista="con quién" opciones={SOCIAL} valor={[comp.social ?? '']} onPick={(v) => set('social', v)} />
            <label className="flex flex-col gap-1 text-sm font-medium">Disciplinas <span className="font-normal text-ink-subtle">(separadas por coma; todas las que toque)</span><Input placeholder="Matemática · medida, Física · fuerzas" value={disc} onChange={(e) => setDisc(e.target.value)} /></label>
            {crear.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
            <div className="flex gap-2"><Button type="submit" loading={crear.isPending}>Abrir en el editor</Button><Button variant="ghost" onClick={() => setPaso(0)}>Volver a plantillas</Button></div>
          </div>
          <aside className="flex flex-col gap-4 self-start rounded-2xl border border-line bg-surface p-5">
            <Eyebrow>Vista previa</Eyebrow>
            <Portada titulo={titulo || base?.titulo || 'Sin título'} className="h-28 rounded-xl" />
            <div className="font-display text-xl font-semibold">{titulo || 'Sin título'}</div>
            <ChipsComposicion c={{ ...comp, disciplinas: disc.split(',').map((s) => s.trim()).filter(Boolean) }} />
            {base && <Text size="xs" variant="muted">Basada en «{base.titulo}»: {base.documento.fases.reduce((n, f) => n + f.bloques.length, 0)} bloques listos para editar.</Text>}
          </aside>
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
