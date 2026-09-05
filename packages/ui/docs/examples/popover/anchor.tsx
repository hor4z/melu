import { Button, Chip, Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Text } from '@melu/ui'

export default function Demo() {
  return (
    <Popover>
      {/* El popover se abre desde el botón pero se posiciona contra el chip. */}
      <PopoverAnchor><Chip color="accent">Design thinking</Chip></PopoverAnchor>
      <PopoverTrigger><Button variant="ghost" size="sm">¿Qué es?</Button></PopoverTrigger>
      <PopoverContent className="w-64">
        <Text size="sm">Un recorrido que empieza por entender a alguien y termina en algo probado con esa persona.</Text>
      </PopoverContent>
    </Popover>
  )
}
