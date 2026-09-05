import { useState } from 'react'
import { Field, Slider } from '@melu/ui'

export default function Demo() {
  const [one, setOne] = useState(40)
  const [range, setRange] = useState<[number, number]>([20, 70])
  return (
    <div className="grid w-full gap-8 sm:grid-cols-2">
      <Field label="Dificultad" description="Un solo valor, con globo al pasar.">
        <Slider value={one} onValueChange={(v) => setOne(v as number)}
          marks={[{ value: 0, label: 'Suave' }, { value: 50 }, { value: 100, label: 'Duro' }]} />
      </Field>
      <Field label="Minutos por misión" description="Rango, con formato propio.">
        <Slider value={range} onValueChange={(v) => setRange(v as [number, number])}
          min={0} max={120} step={5} minStepsBetweenThumbs={1} valueDisplay="text" formatValue={(v) => `${v} min`} />
      </Field>
    </div>
  )
}
