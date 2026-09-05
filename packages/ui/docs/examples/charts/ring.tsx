import { ProgressRing, Text } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <ProgressRing value={0.62} />
      <ProgressRing value={0.9} size={56} stroke={6} />
      <ProgressRing value={0.35} size={96} stroke={9}>
        <Text size="sm" weight="bold">7/20</Text>
      </ProgressRing>
    </>
  )
}
