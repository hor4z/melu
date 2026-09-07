import { useState } from 'react'
import {
  Card, Chip, Pagination, PaginationMore, PaginationStatus,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@melu/ui'

const ENTREGAS = ['Ana Gómez', 'Leo Paz', 'Sol Ríos', 'Juana Ferreyra', 'Tomás Britos', 'Mia Acosta', 'Bruno Sosa']
  .map((quien, i) => ({ quien, que: 'Fracciones con la pizza', estado: i % 3 === 0 ? 'Para mirar' : 'Corregida' }))

const TRAMO = 3

export default function Demo() {
  const [visibles, setVisibles] = useState(TRAMO)
  const [trayendo, setTrayendo] = useState(false)

  // Acá el tramo siguiente ya está en memoria; con el back de verdad, esto es el pedido.
  const traerMas = () => {
    setTrayendo(true)
    setTimeout(() => { setVisibles((v) => v + TRAMO); setTrayendo(false) }, 500)
  }

  return (
    <Card className="w-full overflow-hidden rounded-md">
      <Table size="sm">
        <TableHeader>
          <TableRow><TableHead>Aprendiz</TableHead><TableHead>Actividad</TableHead><TableHead>Estado</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {ENTREGAS.slice(0, visibles).map((e) => (
            <TableRow key={e.quien}>
              <TableCell className="font-medium">{e.quien}</TableCell>
              <TableCell>{e.que}</TableCell>
              <TableCell><Chip size="sm" color={e.estado === 'Para mirar' ? 'warning' : 'success'}>{e.estado}</Chip></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination>
        <PaginationStatus shown={Math.min(visibles, ENTREGAS.length)} total={ENTREGAS.length} noun="entregas" />
        <PaginationMore hasMore={visibles < ENTREGAS.length} loading={trayendo} onClick={traerMas} />
      </Pagination>
    </Card>
  )
}
