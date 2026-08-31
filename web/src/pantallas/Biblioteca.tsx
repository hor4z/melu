import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, EmptyState, Eyebrow, Heading, Icon, Text } from '@/kit'
import { api, type Actividad } from '../lib/api'
import { useEspacioId } from '../lib/espacio'
import { ChipsComposicion } from '../bloques/Chips'
import { Portada } from '../bloques/Portada'

export function Biblioteca() {
  const nav = useNavigate()
  const espacioId = useEspacioId()
  const q = useQuery({ queryKey: ['actividades', espacioId], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>(`/api/actividades?espacio=${espacioId}`) })
  const usar = useMutation({ mutationFn: (recetaId: string) => api.post<Actividad>('/api/actividades', { espacioId, desdeReceta: recetaId }), onSuccess: (a) => nav(`/actividades/${a.id}`) })
  const mias = q.data?.mias.filter((a) => !a.esReceta) ?? []
  const plantillas = q.data?.mias.filter((a) => a.esReceta) ?? []

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Eyebrow>Actividades</Eyebrow><Heading level={1} size="2xl" className="mt-1">Tus actividades y las plantillas</Heading><Text variant="muted">Una actividad es un documento con fases y bloques. La componés desde una plantilla, la editás como un doc y la asignás a un grupo.</Text></div>
        <Button onClick={() => nav('/actividades/nueva')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><Heading size="xl">Mías</Heading><Text size="xs" variant="muted">{mias.length} {mias.length === 1 ? 'actividad' : 'actividades'}</Text></div>
        {mias.length === 0 ? (
          <EmptyState title="Todavía no armaste ninguna" description="Empezá desde una plantilla: en dos clics tenés algo para asignar."
            actions={<Button onClick={() => nav('/actividades/nueva')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mias.map((a) => (
              <Card key={a.id} asChild interactive>
                <button type="button" onClick={() => nav(`/actividades/${a.id}`)} className="text-left">
                  <CardMedia><Portada titulo={a.titulo} className="h-28 w-full" size={72} /></CardMedia>
                  <CardContent className="flex flex-col gap-2 p-4"><span className="font-semibold">{a.titulo}</span><ChipsComposicion c={a.composicion} compacto /><Text size="xs" variant="muted">{a.documento.fases.length} fases · {a.documento.fases.reduce((n, f) => n + f.bloques.length, 0)} bloques · editada {new Date(a.updatedAt).toLocaleDateString('es-AR')}</Text></CardContent>
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {plantillas.length > 0 && (
        <section className="flex flex-col gap-3">
          <div><Heading size="xl">Plantillas de tu espacio</Heading><Text size="sm" variant="muted">Las guardaste vos o alguien de tu espacio desde el editor.</Text></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plantillas.map((r) => <Receta key={r.id} r={r} onUsar={() => usar.mutate(r.id)} cargando={usar.isPending && usar.variables === r.id} />)}</div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div><Heading size="xl">Plantillas de melu</Heading><Text size="sm" variant="muted">Combinaciones que funcionan. «Usar» te hace una copia para editar y asignar.</Text></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{q.data?.recetas.map((r) => <Receta key={r.id} r={r} onUsar={() => usar.mutate(r.id)} cargando={usar.isPending && usar.variables === r.id} />)}</div>
      </section>
    </div>
  )
}

function Receta({ r, onUsar, cargando }: { r: Actividad; onUsar: () => void; cargando: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardMedia><Portada titulo={r.titulo} className="h-32 w-full" /></CardMedia>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <span className="font-semibold leading-snug">{r.titulo}</span>
        <ChipsComposicion c={r.composicion} compacto />
        <p className="line-clamp-3 text-sm text-ink-muted">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</p>
        <Text size="xs" variant="muted">{r.documento.fases.map((f) => f.nombre).join(' → ')}</Text>
        <div className="mt-auto pt-1"><Button size="sm" variant="secondary" block onClick={onUsar} loading={cargando}>Usar esta plantilla</Button></div>
      </CardContent>
    </Card>
  )
}
