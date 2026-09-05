import { Button, Heading, Popover, PopoverContent, PopoverTrigger, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Popover>
      <PopoverTrigger><Button variant="outline">Abrir popover</Button></PopoverTrigger>
      <PopoverContent className="w-72">
        <Heading size="md">Contenido libre</Heading>
        <Text size="sm" variant="muted" className="mt-1">
          Acepta cualquier cosa: un formulario chico, un filtro, una explicación.
        </Text>
      </PopoverContent>
    </Popover>
  )
}
