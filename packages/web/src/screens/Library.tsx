import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Card, PageHeader, SectionLabel } from '@milo/ui'
import { api, type Activity } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { CompositionChips } from '../blocks/Chips'
import { Cover } from '../blocks/Cover'
import { Empty } from '../blocks/Modal'

export function Library() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['activities', spaceId], queryFn: () => api.get<{ recipes: Activity[]; mine: Activity[] }>(`/api/activities?space=${spaceId}`) })
  const useIt = useMutation({ mutationFn: (recipeId: string) => api.post<Activity>('/api/activities', { spaceId, fromRecipe: recipeId }), onSuccess: (a) => nav(`/activities/${a.id}`) })
  const mine = q.data?.mine.filter((a) => !a.isRecipe) ?? []
  const templates = q.data?.mine.filter((a) => a.isRecipe) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tus actividades y las plantillas"
        subtitle="Una actividad es un documento con fases y bloques. La componés desde una plantilla, la editás como un doc y la asignás a un grupo."
        actions={<Button size="sm" variant="brand" icon="add" onClick={() => nav('/activities/new')}>Nueva actividad</Button>}
      />

      <section className="flex flex-col gap-3">
        <SectionLabel count={mine.length}>Mías</SectionLabel>
        {mine.length === 0
          ? (
            <Empty
              icon="draft" title="Todavía no armaste ninguna"
              text="Empezá desde una plantilla: en dos clics tenés algo para asignar."
              action={<Button variant="brand" icon="add" onClick={() => nav('/activities/new')}>Nueva actividad</Button>}
            />
          )
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((a) => (
                <Card key={a.id} interactive className="p-0">
                  <button type="button" onClick={() => nav(`/activities/${a.id}`)} className="flex w-full gap-3 p-3 text-left">
                    <Cover title={a.title} className="size-16 shrink-0 rounded-[var(--radius-lg)]" size={34} />
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="text-body font-semibold">{a.title}</span>
                      <CompositionChips c={a.composition} compact />
                      <p className="line-clamp-2 text-body text-text-muted">{a.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 text-meta text-text-muted">
                        <span>{a.document.phases.length} fases</span>
                        <span>{a.document.phases.reduce((n, f) => n + f.blocks.length, 0)} bloques</span>
                        <span>editada {new Date(a.updatedAt).toLocaleDateString('es-AR')}</span>
                      </div>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          )}
      </section>

      {templates.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionLabel count={templates.length}>Plantillas de tu espacio</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((r) => <RecipeCard key={r.id} r={r} onUse={() => useIt.mutate(r.id)} isLoading={useIt.isPending && useIt.variables === r.id} />)}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionLabel count={q.data?.recipes.length}>Plantillas de melu</SectionLabel>
        <p className="text-body text-text-muted">Combinaciones que funcionan. "Usar" te hace una copia para editar y asignar.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data?.recipes.map((r) => <RecipeCard key={r.id} r={r} onUse={() => useIt.mutate(r.id)} isLoading={useIt.isPending && useIt.variables === r.id} />)}
        </div>
      </section>
    </div>
  )
}

function RecipeCard({ r, onUse, isLoading }: { r: Activity; onUse: () => void; isLoading: boolean }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <Cover title={r.title} className="size-16 shrink-0 rounded-[var(--radius-lg)]" size={34} />
        <div className="min-w-0">
          <span className="text-body font-semibold">{r.title}</span>
          <p className="line-clamp-3 text-body text-text-muted">{r.description}</p>
        </div>
      </div>
      <CompositionChips c={r.composition} compact />
      <p className="text-meta text-text-muted">{r.document.phases.map((f) => f.name).join(' → ')}</p>
      <div className="mt-auto">
        <Button size="sm" variant="muted" block onClick={onUse} disabled={isLoading}>
          {isLoading ? 'Copiando' : 'Usar esta plantilla'}
        </Button>
      </div>
    </Card>
  )
}
