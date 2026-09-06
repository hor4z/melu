import { useState } from 'react'
import { CircleDot, School } from 'lucide-react'
import {
  Chip, EmptyState, FilterBar, FilterSearch, FilterSet, Icon, facets,
  Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow,
} from '@melu/ui'

const ENTREGAS = [
  { id: '1', quien: 'Ana Gómez', que: 'Fracciones con la pizza', grupo: '4° A', estado: 'submitted' },
  { id: '2', quien: 'Leo Paz', que: 'El mapa del barrio', grupo: '4° A', estado: 'graded' },
  { id: '3', quien: 'Sol Ríos', que: 'Fracciones con la pizza', grupo: '4° B', estado: 'in_progress' },
  { id: '4', quien: 'Juana Ferreyra', que: 'Contar de a cinco', grupo: '4° B', estado: 'submitted' },
]

const ESTADOS = {
  submitted: { label: 'Para mirar', color: 'warning' },
  graded: { label: 'Corregida', color: 'success' },
  in_progress: { label: 'Sin terminar', color: 'default' },
} as const

export default function Demo() {
  const [texto, setTexto] = useState('')
  const [filtros, setFiltros] = useState<Record<string, string[]>>({})

  const puesto = (k: string) => filtros[k] ?? []
  const deja = (k: string, v: string, salvo?: string) => salvo === k || puesto(k).length === 0 || puesto(k).includes(v)
  const pasa = (e: typeof ENTREGAS[number], salvo?: string) =>
    (!texto || `${e.quien} ${e.que}`.toLowerCase().includes(texto.toLowerCase()))
    && deja('estado', e.estado, salvo) && deja('grupo', e.grupo, salvo)

  const porEstado = facets(ENTREGAS.filter((e) => pasa(e, 'estado')), (e) => e.estado)
  const porGrupo = facets(ENTREGAS.filter((e) => pasa(e, 'grupo')), (e) => e.grupo)
  const filas = ENTREGAS.filter((e) => pasa(e))

  return (
    <div className="flex w-full flex-col gap-4">
      <FilterBar>
        <FilterSearch value={texto} onValueChange={setTexto} placeholder="Buscar entregas" />
        <FilterSet
          value={filtros} onValueChange={setFiltros}
          onReset={() => { setTexto(''); setFiltros({}) }}
          filters={[
            {
              name: 'estado', label: 'Estado', icon: <Icon icon={CircleDot} size="sm" />,
              options: (Object.keys(ESTADOS) as (keyof typeof ESTADOS)[]).map((k) => ({ value: k, label: ESTADOS[k].label, color: ESTADOS[k].color, count: porEstado[k] ?? 0 })),
            },
            {
              name: 'grupo', label: 'Grupo', icon: <Icon icon={School} size="sm" />,
              options: ['4° A', '4° B'].map((g) => ({ value: g, label: g, count: porGrupo[g] ?? 0 })),
            },
          ]}
        />
      </FilterBar>

      <Table size="sm">
        <TableHeader>
          <TableRow>
            <TableHead>Aprendiz</TableHead>
            <TableHead>Actividad</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0
            ? <TableEmpty colSpan={4}><EmptyState title="Nada acá" description="Con estos filtros no queda ninguna entrega." /></TableEmpty>
            : filas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.quien}</TableCell>
                <TableCell>{e.que}</TableCell>
                <TableCell className="text-ink-muted">{e.grupo}</TableCell>
                <TableCell><Chip size="sm" color={ESTADOS[e.estado as keyof typeof ESTADOS].color}>{ESTADOS[e.estado as keyof typeof ESTADOS].label}</Chip></TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
