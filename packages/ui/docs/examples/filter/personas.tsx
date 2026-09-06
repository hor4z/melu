import { useState } from 'react'
import { Filter } from '@melu/ui'

const NOMBRES = [
  'Ana Gómez', 'Leo Paz', 'Sol Ríos', 'Juana Ferreyra', 'Tomás Britos', 'Mia Acosta',
  'Bruno Sosa', 'Ciro Maldonado', 'Emma Quiroga', 'Nina Ledesma',
]

export default function Demo() {
  const [personas, setPersonas] = useState<string[]>(['Ana Gómez', 'Leo Paz', 'Sol Ríos'])
  return (
    <Filter
      label="Aprendiz" value={personas} onValueChange={setPersonas}
      options={NOMBRES.map((n, i) => ({ value: n, label: n, avatar: true, count: 12 - i }))}
    />
  )
}
