import { Counter, Text } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <Text size="xl" weight="bold"><Counter to={128} /></Text>
      <Text size="xl" weight="bold" className="text-accent"><Counter to={1240} /></Text>
      <Text size="sm" variant="muted">Recargá para volver a verlo subir.</Text>
    </>
  )
}
