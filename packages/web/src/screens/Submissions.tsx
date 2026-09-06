import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Card, Chip, Heading, SegmentedControl, SegmentedControlItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Text } from '@melu/ui'
import { Empty } from '../blocks/Modal'
import { api, type SubmissionSummary } from '../lib/api'
import { useSpaceId } from '../lib/space'
import { ago } from '../lib/time'

const ESTADOS = {
  submitted: { label: 'Para mirar', color: 'warning' },
  graded: { label: 'Corregida', color: 'success' },
  in_progress: { label: 'Sin terminar', color: 'default' },
} as const

export function Submissions() {
  const nav = useNavigate()
  const spaceId = useSpaceId()
  const q = useQuery({ queryKey: ['submissions', spaceId], queryFn: () => api.get<SubmissionSummary[]>(`/api/submissions?space=${spaceId}`) })
  const [estado, setEstado] = useState('all')
  const [grupo, setGrupo] = useState('all')

  const todas = useMemo(() => q.data ?? [], [q.data])
  const grupos = useMemo(() => [...new Set(todas.map((e) => e.group))].sort(), [todas])
  const lista = todas.filter((e) => (estado === 'all' || e.status === estado) && (grupo === 'all' || e.group === grupo))

  const cuenta = (s: string) => todas.filter((e) => e.status === s).length

  if (!q.data) return null
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="max-w-2xl">
          <Heading level={1} size="2xl">Entregas</Heading>
          <Text variant="muted">Todo lo que llegó, de todos tus grupos, con lo último arriba.</Text>
        </div>
        {grupos.length > 1 && (
          <Select value={grupo} onValueChange={setGrupo}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todos los grupos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </header>

      <SegmentedControl label="Filtrar por estado" value={estado} onValueChange={setEstado}>
        <SegmentedControlItem value="all">Todas ({todas.length})</SegmentedControlItem>
        <SegmentedControlItem value="submitted">Para mirar ({cuenta('submitted')})</SegmentedControlItem>
        <SegmentedControlItem value="in_progress">Sin terminar ({cuenta('in_progress')})</SegmentedControlItem>
        <SegmentedControlItem value="graded">Corregidas ({cuenta('graded')})</SegmentedControlItem>
      </SegmentedControl>

      {lista.length === 0
        ? <Empty title="Nada acá" text="Probá con otro estado o con otro grupo." />
        : (
          <Card asChild padding="lg">
            <ul className="divide-y divide-line">
              {lista.map((e) => {
                const st = ESTADOS[e.status]
                return (
                  <li key={e.submissionId} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <Avatar name={e.learner ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{e.learner} <span className="text-ink-muted">· {e.title}</span></div>
                      <Text size="xs" variant="muted">
                        {e.group} · {ago(e.when)}{e.minutes ? ` · ${e.minutes} min` : ''}{e.accuracy >= 0 ? ` · ${Math.round(e.accuracy * 100)}% aciertos` : ''}
                      </Text>
                    </div>
                    <Chip size="sm" color={st.color}>{st.label}</Chip>
                    <Button size="sm" variant={e.status === 'submitted' ? 'primary' : 'ghost'} onClick={() => nav(`/review/${e.assignmentId}`)}>
                      {e.status === 'submitted' ? 'Corregir' : 'Ver'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
    </div>
  )
}
