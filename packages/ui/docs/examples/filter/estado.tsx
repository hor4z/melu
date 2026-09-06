import { useState } from 'react'
import { Filter, Text } from '@melu/ui'

const ESTADOS = [
  { value: 'submitted', label: 'Para mirar', color: 'warning', count: 12 },
  { value: 'graded', label: 'Corregida', color: 'success', count: 34 },
  { value: 'in_progress', label: 'Sin terminar', color: 'default', count: 5 },
] as const

export default function Demo() {
  const [estados, setEstados] = useState<string[]>(['submitted'])
  const [lente, setLente] = useState<string[]>([])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter label="Estado" options={[...ESTADOS]} value={estados} onValueChange={setEstados} />
        <Filter
          label="Lente" multiple={false} value={lente} onValueChange={setLente}
          options={[
            { value: 'explore', label: 'Explorar', color: 'cyan' },
            { value: 'build', label: 'Construir', color: 'lilac' },
            { value: 'tell', label: 'Contar', color: 'orange' },
          ]}
        />
      </div>
      <Text size="xs" variant="subtle">
        {estados.length === 0 ? 'Sin filtrar por estado' : `Estado: ${estados.join(', ')}`}
        {lente.length > 0 && ` · Lente: ${lente[0]}`}
      </Text>
    </div>
  )
}
