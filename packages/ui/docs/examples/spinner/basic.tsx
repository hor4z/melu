import { Spinner, Text } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
      <span className="flex items-center gap-2">
        <Spinner label="Guardando" />
        <Text size="sm" variant="muted">con label: se anuncia como status</Text>
      </span>
    </>
  )
}
