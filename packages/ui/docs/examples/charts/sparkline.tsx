import { Sparkline, Text } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <Sparkline data={[3, 5, 4, 7, 6, 9, 12]} className="text-accent" />
      <Sparkline data={[12, 9, 10, 6, 7, 4, 3]} className="text-danger" />
      <Sparkline data={[5, 5, 6, 5, 6, 5, 5]} width={140} height={40} className="text-ink-subtle" />
      <Text size="sm" variant="muted">Una tendencia, no un gráfico.</Text>
    </>
  )
}
