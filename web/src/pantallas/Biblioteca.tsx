import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Icon, Input, Text } from '@/ui'
import { api, type Actividad, type Composicion, type Lente, type Yo } from '../lib/api'
import { ChipsComposicion, Rotulo } from '../bloques/Chips'
import { Modal } from '../bloques/Modal'
import { ESCENARIOS, EXPERIENCIAS, SOCIAL } from '../lib/composicion'

// Portadas: un tinte y un emoji por receta. Hasta que haya fotos, esto le da cara a cada una.
const PORTADA: Record<string, [string, string]> = {
  'Puente de espagueti': ['🍝', 'bg-yellow'], 'Cartógrafos del barrio': ['🧭', 'bg-brand-subtle'], 'Una pieza para alguien': ['🖨️', 'bg-lilac'],
  'El robot que cuenta': ['🤖', 'bg-cream'], 'Fracciones en la cocina': ['🍳', 'bg-yellow'], 'Escape del aula': ['🔐', 'bg-lilac'],
  'Cuento con números': ['📖', 'bg-brand-subtle'], 'La tienda del grupo': ['🏪', 'bg-cream'], 'Reto de la semana': ['🧩', 'bg-yellow'], '¿Cómo llegaste hoy?': ['🌱', 'bg-brand-subtle'],
}
const portada = (t: string): [string, string] => PORTADA[t] ?? ['📝', 'bg-muted']

export function Biblioteca({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['actividades'], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>('/api/actividades') })
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  const [componer, setComponer] = useState(false)
  const espacioId = yo.espacios[0]?.id
  const usar = useMutation({ mutationFn: (recetaId: string) => api.post<Actividad>('/api/actividades', { espacioId, desdeReceta: recetaId }), onSuccess: (a) => nav(`/actividades/${a.id}`) })

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Actividades</h1><Text variant="muted">Empezá desde una receta o componé la tuya en cuatro clics.</Text></div>
        <Button onClick={() => setComponer(true)} startIcon={<Icon icon={Plus} />}>Componer nueva</Button>
      </header>

      {q.data && q.data.mias.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Mías</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.mias.map((a) => { const [emoji, tint] = portada(a.titulo); return (
              <button key={a.id} type="button" onClick={() => nav(`/actividades/${a.id}`)} className="overflow-hidden rounded-lg border border-line bg-surface text-left transition hover:border-line-strong hover:shadow-md">
                <div className={`grid h-28 place-items-center text-5xl ${tint}`}>{emoji}</div>
                <div className="flex flex-col gap-2 p-4"><span className="font-semibold">{a.titulo}</span><ChipsComposicion c={a.composicion} compacto /><Text size="xs" variant="muted">{a.documento.fases.length} fases · {a.documento.fases.reduce((n, f) => n + f.bloques.length, 0)} bloques</Text></div>
              </button>
            )})}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div><h2 className="text-lg font-semibold">Recetas</h2><Text size="sm" variant="muted">Combinaciones que funcionan. «Usar» te hace una copia para editar y asignar.</Text></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data?.recetas.map((r) => { const [emoji, tint] = portada(r.titulo); return (
            <article key={r.id} className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
              <div className={`relative grid h-32 place-items-center text-6xl ${tint}`}>{emoji}<span className="absolute left-3 top-3 rounded bg-white/85 px-1.5 py-0.5"><Rotulo>{r.documento.fases.length} fases</Rotulo></span></div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <span className="text-base font-semibold leading-snug">{r.titulo}</span>
                <ChipsComposicion c={r.composicion} compacto />
                <p className="line-clamp-3 text-sm text-ink-muted">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</p>
                <div className="mt-auto flex items-center justify-between pt-1"><Text size="xs" variant="muted">{r.documento.fases.map((f) => f.nombre).join(' → ')}</Text></div>
                <Button size="sm" variant="secondary" block onClick={() => usar.mutate(r.id)} loading={usar.isPending && usar.variables === r.id}>Usar esta receta</Button>
              </div>
            </article>
          )})}
        </div>
      </section>

      <Componer abierto={componer} onCerrar={() => setComponer(false)} espacioId={espacioId} lentes={lentes.data ?? []} />
    </div>
  )
}

function Grupo({ titulo, opciones, valor, onChange, multi }: { titulo: string; opciones: Record<string, string>; valor: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1"><Rotulo>{titulo}</Rotulo></legend>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(opciones).map(([k, l]) => { const on = valor.includes(k); return (
          <button key={k} type="button" onClick={() => onChange(multi ? (on ? valor.filter((x) => x !== k) : [...valor, k]) : [k])}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${on ? 'border-brand bg-brand-subtle font-medium text-brand-text' : 'border-line hover:bg-hover'}`}>{l}</button>
        )})}
      </div>
    </fieldset>
  )
}

function Componer({ abierto, onCerrar, espacioId, lentes }: { abierto: boolean; onCerrar: () => void; espacioId: string; lentes: Lente[] }) {
  const nav = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [exp, setExp] = useState(['reto']); const [lente, setLente] = useState(['sin_lente']); const [esc, setEsc] = useState(['pantalla']); const [soc, setSoc] = useState(['solo'])
  const [disc, setDisc] = useState('')
  const lentesMap = Object.fromEntries(lentes.map((l) => [l.clave, l.nombre]))
  const crear = useMutation({
    mutationFn: () => { const composicion: Composicion = { experiencia: exp[0], lente: lente[0], escenario: esc, social: soc[0], disciplinas: disc.split(',').map((s) => s.trim()).filter(Boolean), evidencia: [] }; return api.post<Actividad>('/api/actividades', { espacioId, titulo, composicion }) },
    onSuccess: (a) => { onCerrar(); nav(`/actividades/${a.id}`) },
  })
  const fases = lentes.find((l) => l.clave === lente[0])?.fases ?? []
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} ancho={640} titulo="Componer una actividad" descripcion="Cuatro decisiones. El resto lo escribís en el editor."
      pie={<><Button variant="ghost" onClick={onCerrar}>Cancelar</Button><Button form="componer" type="submit" loading={crear.isPending}>Abrir en el editor</Button></>}>
      <form id="componer" className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
        <label className="flex flex-col gap-1 text-sm font-medium">Título<Input placeholder="Puente de espagueti" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus /></label>
        <Grupo titulo="Experiencia — qué van a hacer" opciones={EXPERIENCIAS} valor={exp} onChange={setExp} />
        <Grupo titulo="Lente — cómo se recorre" opciones={lentesMap} valor={lente} onChange={setLente} />
        {fases.length > 1 && <Text size="xs" variant="muted">Fases: {fases.map((f) => f.nombre).join(' → ')}</Text>}
        <Grupo titulo="Escenario — dónde ocurre" opciones={ESCENARIOS} valor={esc} onChange={setEsc} multi />
        <Grupo titulo="Social — con quién" opciones={SOCIAL} valor={soc} onChange={setSoc} />
        <label className="flex flex-col gap-1 text-sm font-medium">Disciplinas <span className="font-normal text-ink-subtle">(separadas por coma)</span><Input placeholder="Matemática · medida, Física · fuerzas" value={disc} onChange={(e) => setDisc(e.target.value)} /></label>
        {crear.isError && <Text size="sm" variant="danger">No se pudo crear.</Text>}
      </form>
    </Modal>
  )
}
