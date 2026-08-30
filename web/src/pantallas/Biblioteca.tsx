import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { api, type Actividad, type Composicion, type Lente, type Yo } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'
import { ESCENARIOS, EXPERIENCIAS, SOCIAL } from '../lib/composicion'

export function Biblioteca({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['actividades'], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>('/api/actividades') })
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes') })
  const nombreLente = (k?: string) => lentes.data?.find((l) => l.clave === k)?.nombre
  const [componer, setComponer] = useState(false)
  const espacioId = yo.espacios[0]?.id

  const usar = useMutation({
    mutationFn: (recetaId: string) => api.post<Actividad>('/api/actividades', { espacioId, desdeReceta: recetaId }),
    onSuccess: (a) => nav(`/actividades/${a.id}`),
  })

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Actividades</h1>
          <Text color="secondary">Empezá desde una receta o componé la tuya en cuatro clics.</Text>
        </div>
        <Button label="Componer nueva" variant="primary" onClick={() => setComponer(true)} />
      </header>

      {q.data && q.data.mias.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold">Mías</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {q.data.mias.map((a) => (
              <button key={a.id} type="button" onClick={() => nav(`/actividades/${a.id}`)} className="flex flex-col gap-2 rounded-xl border border-default bg-card p-4 text-left transition hover:border-accent-bg">
                <span className="font-heading text-lg font-semibold">{a.titulo}</span>
                <ChipsComposicion c={a.composicion} lenteNombre={nombreLente(a.composicion.lente)} compacto />
                <Text size="sm" color="secondary">{a.documento.fases.length} fases · {a.documento.fases.reduce((n, f) => n + f.bloques.length, 0)} bloques</Text>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Recetas</h2>
          <Text size="sm" color="secondary">Combinaciones que funcionan. «Usar» te hace una copia para editar y asignar.</Text>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data?.recetas.map((r) => (
            <article key={r.id} className="flex flex-col gap-3 rounded-xl border border-default bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-heading text-lg font-semibold">{r.titulo}</span>
                <Button label="Usar" size="sm" variant="secondary" onClick={() => usar.mutate(r.id)} isLoading={usar.isPending && usar.variables === r.id} />
              </div>
              <ChipsComposicion c={r.composicion} lenteNombre={nombreLente(r.composicion.lente)} />
              <p className="text-sm text-secondary">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</p>
              <Text size="sm" color="secondary">{r.documento.fases.map((f) => f.nombre).join(' → ')}</Text>
            </article>
          ))}
        </div>
      </section>

      <Componer abierto={componer} onCerrar={() => setComponer(false)} espacioId={espacioId} lentes={lentes.data ?? []} />
    </div>
  )
}

function Grupo<T extends string>({ titulo, opciones, valor, onChange, multi }: { titulo: string; opciones: Record<string, string>; valor: T[] ; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-medium uppercase tracking-wider text-secondary">{titulo}</legend>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(opciones).map(([k, l]) => {
          const on = valor.includes(k as T)
          return (
            <button key={k} type="button" onClick={() => onChange(multi ? (on ? valor.filter((x) => x !== k) : [...valor, k as T]) : [k as T])}
              className={`rounded-full border px-3 py-1 text-sm transition ${on ? 'border-accent-bg bg-accent-muted font-medium text-accent' : 'border-default hover:bg-muted'}`}>{l}</button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Componer({ abierto, onCerrar, espacioId, lentes }: { abierto: boolean; onCerrar: () => void; espacioId: string; lentes: Lente[] }) {
  const nav = useNavigate()
  const [titulo, setTitulo] = useState('')
  const [exp, setExp] = useState<string[]>(['reto'])
  const [lente, setLente] = useState<string[]>(['sin_lente'])
  const [esc, setEsc] = useState<string[]>(['pantalla'])
  const [soc, setSoc] = useState<string[]>(['solo'])
  const [disc, setDisc] = useState('')
  const lentesMap = Object.fromEntries(lentes.map((l) => [l.clave, l.nombre]))
  const crear = useMutation({
    mutationFn: () => {
      const composicion: Composicion = { experiencia: exp[0], lente: lente[0], escenario: esc, social: soc[0], disciplinas: disc.split(',').map((s) => s.trim()).filter(Boolean), evidencia: [] }
      return api.post<Actividad>('/api/actividades', { espacioId, titulo, composicion })
    },
    onSuccess: (a) => { onCerrar(); nav(`/actividades/${a.id}`) },
  })
  const fases = lentes.find((l) => l.clave === lente[0])?.fases ?? []
  return (
    <Dialog isOpen={abierto} onOpenChange={(o) => !o && onCerrar()} purpose="form" padding={5} width={640}>
      <DialogHeader title="Componer una actividad" subtitle="Cuatro decisiones. El resto lo escribís en el editor." onOpenChange={(o) => !o && onCerrar()} />
      <form className="mt-4 flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
        <TextInput label="Título" placeholder="Puente de espagueti" value={titulo} onChange={setTitulo} isRequired hasAutoFocus />
        <Grupo titulo="Experiencia — qué van a hacer" opciones={EXPERIENCIAS} valor={exp} onChange={setExp} />
        <Grupo titulo="Lente — cómo se recorre" opciones={lentesMap} valor={lente} onChange={setLente} />
        {fases.length > 1 && <Text size="sm" color="secondary">Fases: {fases.map((f) => f.nombre).join(' → ')}</Text>}
        <Grupo titulo="Escenario — dónde ocurre" opciones={ESCENARIOS} valor={esc} onChange={setEsc} multi />
        <Grupo titulo="Social — con quién" opciones={SOCIAL} valor={soc} onChange={setSoc} />
        <TextInput label="Disciplinas" description="Separadas por coma. Todas las que toque." placeholder="Matemática · medida, Física · fuerzas" value={disc} onChange={setDisc} isOptional />
        {crear.isError && <Text size="sm" className="text-error">No se pudo crear.</Text>}
        <div className="flex justify-end gap-2">
          <Button label="Cancelar" variant="ghost" onClick={onCerrar} />
          <Button label="Abrir en el editor" type="submit" variant="primary" isLoading={crear.isPending} />
        </div>
      </form>
    </Dialog>
  )
}
