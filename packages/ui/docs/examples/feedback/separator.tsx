import { Separator, Text } from '@melu/ui'

export default function Demo() {
  return (
    <div className="w-full max-w-md">
      <Text size="sm">Arriba</Text>
      <Separator className="my-3" />
      <Text size="sm">Abajo</Text>
      <div className="mt-4 flex items-center gap-3">
        <Text size="sm">Izquierda</Text>
        <Separator orientation="vertical" className="h-6" />
        <Text size="sm">Derecha</Text>
      </div>
    </div>
  )
}
