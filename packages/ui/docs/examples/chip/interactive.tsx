import { Chip, Icon } from '@melu/ui'
import { Sparkles } from 'lucide-react'

export default function Demo() {
  return (
    <>
      <Chip size="sm">Chico</Chip>
      <Chip>Mediano</Chip>
      <Chip size="lg">Grande</Chip>
      <Chip color="teal" icon={<Icon icon={Sparkles} size="xs" />}>Con ícono</Chip>
      <Chip color="lilac" onRemove={() => {}}>Design thinking</Chip>
    </>
  )
}
