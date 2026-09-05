import { Progress } from '@melu/ui'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Progress value={7} max={12} label="Entregas" showValue />
      <Progress value={62} label="Aciertos" />
    </div>
  )
}
