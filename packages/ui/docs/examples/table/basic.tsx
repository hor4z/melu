import { Avatar, Chip, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@melu/ui'

const FILAS = [
  { nombre: 'Ana Gómez', actividad: 'Fracciones con la pizza', estado: 'Para mirar', color: 'warning', minutos: 12 },
  { nombre: 'Leo Paz', actividad: 'Fracciones con la pizza', estado: 'Corregida', color: 'success', minutos: 27 },
  { nombre: 'Sol Ríos', actividad: 'El mapa del barrio', estado: 'Sin terminar', color: 'default', minutos: 4 },
] as const

export default function Demo() {
  return (
    <Table>
      <TableCaption>Las entregas de esta semana.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Aprendiz</TableHead>
          <TableHead>Actividad</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead align="end">Tiempo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {FILAS.map((f) => (
          <TableRow key={f.nombre}>
            <TableCell>
              <span className="flex items-center gap-2.5">
                <Avatar name={f.nombre} size="sm" />
                <span className="font-medium">{f.nombre}</span>
              </span>
            </TableCell>
            <TableCell>{f.actividad}</TableCell>
            <TableCell><Chip size="sm" color={f.color}>{f.estado}</Chip></TableCell>
            <TableCell numeric>{f.minutos} min</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Tres entregas</TableCell>
          <TableCell numeric>43 min</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
