import { DOODLES, Text } from '@melu/ui'

export default function Demo() {
  return (
    <>
      {Object.entries(DOODLES).map(([name, Doodle]) => (
        <span key={name} className="flex flex-col items-center gap-1">
          <Doodle size={56} className="text-ink" />
          <Text size="xs" variant="subtle" className="font-mono">{name}</Text>
        </span>
      ))}
    </>
  )
}
