import { Card, Eyebrow, Text } from '@melu/ui'

export default function Demo() {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-3">
      <Card variant="yellow" padding="md">
        <Eyebrow>Código del grupo</Eyebrow>
        <Text mono size="xl" weight="bold" className="mt-1 tracking-[0.25em]">DEMO4A</Text>
      </Card>
      <Card variant="teal" padding="md"><Text weight="semibold">Teal</Text><Text size="sm" variant="muted">Para lo que va bien.</Text></Card>
      <Card variant="lilac" padding="md"><Text weight="semibold">Lilac</Text><Text size="sm" variant="muted">Para lo que hay que mirar.</Text></Card>
    </div>
  )
}
