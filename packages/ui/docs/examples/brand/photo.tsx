import { DoodleRobot, PhotoFrame } from '@melu/ui'

export default function Demo() {
  return (
    <>
      <PhotoFrame rotate={-3} className="size-36"><DoodleRobot size={90} className="text-ink" /></PhotoFrame>
      <PhotoFrame rotate={2} className="size-36"><DoodleRobot size={90} className="text-accent" /></PhotoFrame>
    </>
  )
}
