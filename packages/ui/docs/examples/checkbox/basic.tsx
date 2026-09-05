import { useState } from 'react'
import { Checkbox } from '@melu/ui'

export default function Demo() {
  const [all, setAll] = useState<boolean | 'indeterminate'>('indeterminate')
  return (
    <>
      <Checkbox checked={all} onCheckedChange={setAll} description="Marca mixta incluida">Seleccionar todo</Checkbox>
      <Checkbox defaultChecked>Simple</Checkbox>
      <Checkbox disabled>Deshabilitado</Checkbox>
    </>
  )
}
