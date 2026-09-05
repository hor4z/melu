import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Card, CardContent, CardMedia, EmptyState, Eyebrow, Heading, Icon, Text } from '@/kit'
import { api, type Activity } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { CompositionChips } from '../blocks/Chips'
import { Cover } from '../blocks/Cover'

export function Library() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['actividades', spaceId], queryFn: () => api.get<{ recipes: Activity[]; mine: Activity[] }>(`/api/activities?espacio=${spaceId}`) })
  const useIt = useMutation({ mutationFn: (recipeId: string) => api.post<Activity>('/api/activities', { spaceId, desdeReceta: recipeId }), onSuccess: (a) => nav(`/activities/${a.id}`) })
  const mine = q.data?.mine.filter((a) => !a.isRecipe) ?? []
  const templates = q.data?.mine.filter((a) => a.isRecipe) ?? []

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Eyebrow>Actividades</Eyebrow><Heading level={1} size="2xl" className="mt-1">Tus actividades y las plantillas</Heading><Text variant="muted">Una actividad es un documento con fases y bloques. La componés desde una plantilla, la editás como un doc y la asignás a un grupo.</Text></div>
        <Button onClick={() => nav('/activities/new')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><Heading size="xl">Mías</Heading><Text size="xs" variant="muted">{mine.length} {mine.length === 1 ? 'actividad' : 'actividades'}</Text></div>
        {mine.length === 0 ? (
          <EmptyState title="Todavía no armaste ninguna" description="Empezá desde una plantilla: en dos clics tenés algo para asignar."
            actions={<Button onClick={() => nav('/activities/new')} startIcon={<Icon icon={Plus} />}>Nueva actividad</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((a) => (
              <Card key={a.id} asChild interactive>
                <button type="button" onClick={() => nav(`/activities/${a.id}`)} className="text-left">
                  <CardMedia><Cover title={a.title} className="h-28 w-full" size={72} /></CardMedia>
                  <CardContent className="flex flex-col gap-2 p-4"><span className="font-semibold">{a.title}</span><CompositionChips c={a.composition} compact /><Text size="xs" variant="muted">{a.document.phases.length} fases · {a.document.phases.reduce((n, f) => n + f.blocks.length, 0)} bloques · editada {new Date(a.updatedAt).toLocaleDateString('es-AR')}</Text></CardContent>
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {templates.length > 0 && (
        <section className="flex flex-col gap-3">
          <div><Heading size="xl">Plantillas de tu espacio</Heading><Text size="sm" variant="muted">Las guardaste vos o alguien de tu espacio desde el editor.</Text></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{templates.map((r) => <RecipeCard key={r.id} r={r} onUse={() => useIt.mutate(r.id)} isLoading={useIt.isPending && useIt.variables === r.id} />)}</div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div><Heading size="xl">Plantillas de melu</Heading><Text size="sm" variant="muted">Combinaciones que funcionan. «Usar» te hace una copia para editar y asignar.</Text></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{q.data?.recipes.map((r) => <RecipeCard key={r.id} r={r} onUse={() => useIt.mutate(r.id)} isLoading={useIt.isPending && useIt.variables === r.id} />)}</div>
      </section>
    </div>
  )
}

function RecipeCard({ r, onUse, isLoading }: { r: Activity; onUse: () => void; isLoading: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardMedia><Cover title={r.title} className="h-32 w-full" /></CardMedia>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <span className="font-semibold leading-snug">{r.title}</span>
        <CompositionChips c={r.composition} compact />
        <p className="line-clamp-3 text-sm text-ink-muted">{r.document.phases[0]?.blocks.find((b) => b.type === 'paragraph')?.text}</p>
        <Text size="xs" variant="muted">{r.document.phases.map((f) => f.name).join(' → ')}</Text>
        <div className="mt-auto pt-1"><Button size="sm" variant="secondary" block onClick={onUse} loading={isLoading}>Usar esta plantilla</Button></div>
      </CardContent>
    </Card>
  )
}
