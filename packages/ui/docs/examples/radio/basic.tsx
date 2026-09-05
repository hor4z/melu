import { useState } from 'react'
import { Field, RadioGroup, RadioGroupItem } from '@melu/ui'

export default function Demo() {
  const [lens, setLens] = useState('cpa')
  return (
    <Field asGroup label="Lente" description="Cómo se recorre la actividad.">
      <RadioGroup value={lens} onValueChange={setLens} orientation="horizontal">
        <RadioGroupItem value="cpa">CPA</RadioGroupItem>
        <RadioGroupItem value="polya">Polya</RadioGroupItem>
        <RadioGroupItem value="dt" description="Necesita un usuario real">Design thinking</RadioGroupItem>
      </RadioGroup>
    </Field>
  )
}
