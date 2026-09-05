import { Eyebrow, Heading, Kbd, Text } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <Eyebrow>Actividad</Eyebrow>
        <Heading size="xl" className="mt-1">Puente de espagueti</Heading>
      </div>
      <Text size="sm" variant="muted">Guardá con <Kbd>⌘</Kbd> <Kbd>S</Kbd>, o salí con <Kbd>Esc</Kbd>.</Text>
    </div>
  )
}
