import { Avatar, Button, Card, Chip, DataList, DataListActions, DataListHead, DataListItem, DataListMedia, DataListMeta, DataListText, DataListTitle } from '@melu/ui'

const FILAS = [
  { nombre: 'Ana Gómez', actividad: 'Fracciones con la pizza', grupo: '4° A', cuando: 'hace 2 h', minutos: 12, estado: 'Para mirar', color: 'warning' },
  { nombre: 'Leo Paz', actividad: 'El mapa del barrio', grupo: '4° A', cuando: 'hace 1 día', minutos: 27, estado: 'Corregida', color: 'success' },
  { nombre: 'Sol Ríos', actividad: 'Fracciones con la pizza', grupo: '4° B', cuando: 'hace 3 días', minutos: 4, estado: 'Sin terminar', color: 'default' },
] as const

export default function Demo() {
  return (
    <Card className="w-full max-w-sm overflow-hidden">
      <DataList>
        {FILAS.map((f) => (
          <DataListItem key={f.nombre} interactive>
            <DataListMedia><Avatar name={f.nombre} /></DataListMedia>
            <DataListHead>
              <DataListTitle>{f.nombre}</DataListTitle>
              <Chip size="sm" color={f.color}>{f.estado}</Chip>
            </DataListHead>
            <DataListText>{f.actividad}</DataListText>
            <DataListMeta>
              <span>{f.grupo}</span>
              <span>{f.cuando}</span>
              <span>{f.minutos} min</span>
            </DataListMeta>
            <DataListActions>
              <Button size="sm" variant={f.estado === 'Para mirar' ? 'primary' : 'ghost'}>
                {f.estado === 'Para mirar' ? 'Corregir' : 'Ver'}
              </Button>
            </DataListActions>
          </DataListItem>
        ))}
      </DataList>
    </Card>
  )
}
