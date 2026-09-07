import { useState } from 'react'
import { EmptyState, Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@melu/ui'

const FILAS = [
  { grupo: '4° A', entregas: 18, aciertos: 0.82 },
  { grupo: '4° B', entregas: 9, aciertos: 0.64 },
  { grupo: 'Taller de los sábados', entregas: 24, aciertos: 0.91 },
]

type Por = 'grupo' | 'entregas' | 'aciertos'

export default function Demo() {
  const [orden, setOrden] = useState<{ por: Por; dir: 'asc' | 'desc' }>({ por: 'entregas', dir: 'desc' })
  const [elegido, setElegido] = useState('4° A')
  const [vacia, setVacia] = useState(false)

  const ordenarPor = (por: Por) =>
    setOrden((o) => (o.por === por ? { por, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { por, dir: por === 'grupo' ? 'asc' : 'desc' }))
  const sentido = (por: Por) => (orden.por === por ? orden.dir : false)

  const filas = (vacia ? [] : [...FILAS]).sort((a, b) => {
    const x = a[orden.por]
    const y = b[orden.por]
    return (orden.dir === 'asc' ? 1 : -1) * (typeof x === 'string' ? x.localeCompare(y as string, 'es') : x - (y as number))
  })

  return (
    <div className="flex w-full flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input type="checkbox" checked={vacia} onChange={(e) => setVacia(e.target.checked)} /> Sin resultados
      </label>
      <Table size="sm">
        <TableHeader>
          <TableRow>
            <TableHead sort={sentido('grupo')} onSort={() => ordenarPor('grupo')}>Grupo</TableHead>
            <TableHead align="end" sort={sentido('entregas')} onSort={() => ordenarPor('entregas')}>Entregas</TableHead>
            <TableHead align="end" sort={sentido('aciertos')} onSort={() => ordenarPor('aciertos')}>Aciertos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0
            ? <TableEmpty colSpan={3}><EmptyState title="Nada acá" description="Ningún grupo entregó todavía." /></TableEmpty>
            : filas.map((f) => (
              <TableRow key={f.grupo} interactive selected={f.grupo === elegido} onClick={() => setElegido(f.grupo)}>
                <TableCell className="font-medium">{f.grupo}</TableCell>
                <TableCell numeric>{f.entregas}</TableCell>
                <TableCell numeric>{Math.round(f.aciertos * 100)}%</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
