import {
  Avatar, Card, Chip, Text,
  DataList, DataListHead, DataListItem, DataListMedia, DataListMeta, DataListText, DataListTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useDevice,
} from '@melu/ui'

const FILAS = [
  { nombre: 'Ana Gómez', actividad: 'Fracciones con la pizza', grupo: '4° A', cuando: 'hace 2 h', estado: 'Para mirar', color: 'warning' },
  { nombre: 'Leo Paz', actividad: 'El mapa del barrio', grupo: '4° A', cuando: 'hace 1 día', estado: 'Corregida', color: 'success' },
] as const

export default function Demo() {
  // La misma información, dos formas. Achicá la ventana y mirá el cambio: abajo de `md` no hay
  // tabla, hay lista.
  const device = useDevice()

  return (
    <div className="flex w-full flex-col gap-3">
      <Text size="xs" variant="subtle">Ahora esto es un <code className="font-mono">{device}</code>.</Text>
      <Card className="overflow-hidden">
        {device === 'phone'
          ? (
            <DataList>
              {FILAS.map((f) => (
                <DataListItem key={f.nombre}>
                  <DataListMedia><Avatar name={f.nombre} /></DataListMedia>
                  <DataListHead>
                    <DataListTitle>{f.nombre}</DataListTitle>
                    <Chip size="sm" color={f.color}>{f.estado}</Chip>
                  </DataListHead>
                  <DataListText>{f.actividad}</DataListText>
                  <DataListMeta><span>{f.grupo}</span><span>{f.cuando}</span></DataListMeta>
                </DataListItem>
              ))}
            </DataList>
          )
          : (
            <Table size="sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Aprendiz</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Cuándo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FILAS.map((f) => (
                  <TableRow key={f.nombre}>
                    <TableCell className="font-medium">{f.nombre}</TableCell>
                    <TableCell>{f.actividad}</TableCell>
                    <TableCell className="text-ink-muted">{f.grupo}</TableCell>
                    <TableCell className="whitespace-nowrap text-ink-muted">{f.cuando}</TableCell>
                    <TableCell><Chip size="sm" color={f.color}>{f.estado}</Chip></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </Card>
    </div>
  )
}
