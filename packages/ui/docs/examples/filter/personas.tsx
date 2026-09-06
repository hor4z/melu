import { useState } from 'react'
import { User } from 'lucide-react'
import { Filter, Icon } from '@melu/ui'

const NOMBRES = [
  'Ana Gómez', 'Leo Paz', 'Sol Ríos', 'Juana Ferreyra', 'Tomás Britos', 'Mia Acosta',
  'Bruno Sosa', 'Ciro Maldonado', 'Emma Quiroga', 'Nina Ledesma',
]

export default function Demo() {
  const [personas, setPersonas] = useState<string[]>(['Ana Gómez', 'Leo Paz', 'Sol Ríos'])
  return (
    <Filter
      label="Aprendiz" icon={<Icon icon={User} size="sm" />} value={personas} onValueChange={setPersonas}
      options={NOMBRES.map((n, i) => ({ value: n, label: n, avatar: true, count: 12 - i }))}
    />
  )
}
