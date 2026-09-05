import { useState } from 'react'
import { RadioCard, RadioGroup } from '@melu/ui'

export default function Demo() {
  const [how, setHow] = useState('pair')
  return (
    <RadioGroup value={how} onValueChange={setHow} className="grid w-full gap-3 sm:grid-cols-3">
      <RadioCard value="alone" description="Cada uno con su ritmo.">Individual</RadioCard>
      <RadioCard value="pair" description="De a dos, se explican entre sí.">En pareja</RadioCard>
      <RadioCard value="whole_group" description="Equipos de cuatro.">En equipo</RadioCard>
    </RadioGroup>
  )
}
