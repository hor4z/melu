import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Eyebrow, Icon, Text } from '@/ui'
import { api, type Actividad, type Yo } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'
import { Portada } from '../bloques/Portada'

export function Biblioteca({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['actividades'], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>('/api/actividades') })
  const espacioId = yo.espacios[0]?.id
  const usar = useMutation({ mutationFn: (recetaId: string) => api.post<Actividad>('/api/actividades', { espacioId, desdeReceta: recetaId }), onSuccess: (a) => nav(`/actividades/${a.id}`) })
  const mias = q.data?.mias.filter((a) => !a.esReceta) ?? []
  const plantillas = q.data?.mias.filter((a) => a.esReceta) ?? []

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Eyebrow>Actividades</Eyebrow><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Tus actividades y las plantillas</h1><Text variant="muted">Una actividad es un documento con fases y bloques. La componés desde una plantilla, la editás como un doc y la asignás a un grupo.</Text></div>
        <Button onClick={() => nav('/actividades/nueva')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">Mías</h2><Text size="xs" variant="muted">{mias.length} {mias.length === 1 ? 'actividad' : 'actividades'}</Text></div>
        {mias.length === 0 ? (
          <button type="button" onClick={() => nav('/actividades/nueva')} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong p-10 text-center transition hover:border-ink"><span className="font-semibold">Todavía no armaste ninguna</span><span className="text-sm text-ink-muted">Empezá desde una plantilla: en dos clics tenés algo para asignar.</span></button>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mias.map((a) => (
              <button key={a.id} type="button" onClick={() => nav(`/actividades/${a.id}`)} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:shadow-[0_0_0_2px_var(--color-ink)]">
                <Portada titulo={a.titulo} className="h-28" size={72} />
                <div className="flex flex-col gap-2 p-4"><span className="font-semibold">{a.titulo}</span><ChipsComposicion c={a.composicion} compacto /><Text size="xs" variant="muted">{a.documento.fases.length} fases · {a.documento.fases.reduce((n, f) => n + f.bloques.length, 0)} bloques · editada {new Date(a.updatedAt).toLocaleDateString('es-AR')}</Text></div>
              </button>
            ))}
          </div>
        )}
      </section>

      {plantillas.length > 0 && (
        <section className="flex flex-col gap-3">
          <div><h2 className="font-display text-xl font-semibold">Plantillas de tu espacio</h2><Text size="sm" variant="muted">Las guardaste vos o alguien de tu espacio desde el editor.</Text></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plantillas.map((r) => <Receta key={r.id} r={r} onUsar={() => usar.mutate(r.id)} cargando={usar.isPending && usar.variables === r.id} />)}</div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div><h2 className="font-display text-xl font-semibold">Plantillas de melu</h2><Text size="sm" variant="muted">Combinaciones que funcionan. «Usar» te hace una copia para editar y asignar.</Text></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{q.data?.recetas.map((r) => <Receta key={r.id} r={r} onUsar={() => usar.mutate(r.id)} cargando={usar.isPending && usar.variables === r.id} />)}</div>
      </section>
    </div>
  )
}

function Receta({ r, onUsar, cargando }: { r: Actividad; onUsar: () => void; cargando: boolean }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <Portada titulo={r.titulo} className="h-32" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="font-semibold leading-snug">{r.titulo}</span>
        <ChipsComposicion c={r.composicion} compacto />
        <p className="line-clamp-3 text-sm text-ink-muted">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</p>
        <Text size="xs" variant="muted">{r.documento.fases.map((f) => f.nombre).join(' → ')}</Text>
        <div className="mt-auto pt-1"><Button size="sm" variant="secondary" block onClick={onUsar} loading={cargando}>Usar esta plantilla</Button></div>
      </div>
    </article>
  )
}
