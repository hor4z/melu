import { Avatar } from '@melu/ui'

export default function Demo() {
  return (
    <>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => <Avatar key={s} name="Sofía Ramírez" size={s} />)}
      <Avatar name="Nico" shape="rounded" />
      <Avatar name="Valentina" status="online" />
      <Avatar name="Mateo" status="busy" />
    </>
  )
}
