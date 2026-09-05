import { useState } from 'react'
import { Icon, Input } from '@melu/ui'
import { Mail, Search } from 'lucide-react'

export default function Demo() {
  const [q, setQ] = useState('Escribí para probar la X')
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <Input placeholder="alguien@escuela.edu" startIcon={<Icon icon={Mail} size="sm" />} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
        startIcon={<Icon icon={Search} size="sm" />} clearable onClear={() => setQ('')} />
    </div>
  )
}
