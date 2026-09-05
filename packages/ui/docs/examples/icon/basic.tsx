import { Icon, Text } from '@melu/ui'
import { Camera } from 'lucide-react'

export default function Demo() {
  return (
    <>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <span key={s} className="flex flex-col items-center gap-1">
          <Icon icon={Camera} size={s} />
          <Text size="xs" variant="subtle">{s}</Text>
        </span>
      ))}
      <Icon icon={Camera} size="lg" color="muted" />
      <Icon icon={Camera} size="lg" color="subtle" />
      <Icon icon={Camera} size="lg" color="accent" />
      <Icon icon={Camera} size="lg" color="danger" />
    </>
  )
}
