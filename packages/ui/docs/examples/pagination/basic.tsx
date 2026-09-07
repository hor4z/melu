import { useState } from 'react'
import {
  Card, Chip, Pagination, PaginationNext, PaginationPrev, PaginationStatus,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@melu/ui'

const ENTREGAS = ['Ana Gómez', 'Leo Paz', 'Sol Ríos', 'Juana Ferreyra', 'Tomás Britos', 'Mia Acosta', 'Bruno Sosa']
  .map((quien, i) => ({ quien, que: 'Fracciones con la pizza', estado: i % 3 === 0 ? 'Para mirar' : 'Corregida' }))

const TRAMO = 3

export default function Demo() {
  const [pagina, setPagina] = useState(0)
  const desde = pagina * TRAMO
  const alaVista = ENTREGAS.slice(desde, desde + TRAMO)
  // Con el back de verdad, esto es el `more` que contesta la api.
  const hayMas = desde + TRAMO < ENTREGAS.length

  return (
    <Card className="w-full overflow-hidden">
      <Table size="sm">
        <TableHeader>
          <TableRow><TableHead>Aprendiz</TableHead><TableHead>Actividad</TableHead><TableHead>Estado</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {alaVista.map((e) => (
            <TableRow key={e.quien}>
              <TableCell className="font-medium">{e.quien}</TableCell>
              <TableCell>{e.que}</TableCell>
              <TableCell><Chip size="sm" color={e.estado === 'Para mirar' ? 'warning' : 'success'}>{e.estado}</Chip></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination>
        <PaginationStatus from={desde + 1} to={desde + alaVista.length} total={ENTREGAS.length} noun="entregas" />
        <PaginationPrev disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
        <PaginationNext disabled={!hayMas} onClick={() => setPagina((p) => p + 1)} />
      </Pagination>
    </Card>
  )
}
