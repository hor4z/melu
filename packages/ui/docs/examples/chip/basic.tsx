import { Chip } from '@melu/ui'

const COLORS = ['default', 'outline', 'solid', 'accent', 'teal', 'yellow', 'blue', 'lilac', 'orange', 'cyan', 'green', 'pink', 'success', 'warning', 'danger'] as const

export default function Demo() {
  return <>{COLORS.map((c) => <Chip key={c} color={c}>{c}</Chip>)}</>
}
