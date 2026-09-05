import { useState } from 'react'
import * as lucide from 'lucide-react'
import { Card, DOODLES, Icon, IconButton, Input, Text, cn } from '@melu/ui'
import { Block, Code, PageHead, Rule } from '../pieces'

// Los que la app usa de verdad. La librería trae más de mil: mostrarlos todos sería un
// catálogo de lucide, no la documentación de melu.
const IN_USE = [
  'AlertTriangle', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Bell', 'BookOpen', 'Camera', 'Check',
  'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronsUpDown', 'CircleAlert', 'CircleCheck',
  'Clock', 'Compass', 'Copy', 'Download', 'Eye', 'EyeOff', 'Home', 'Inbox', 'Info', 'Layers',
  'LayoutDashboard', 'LogOut', 'Mail', 'MoreHorizontal', 'MoreVertical', 'Pencil', 'Play',
  'Plus', 'RefreshCw', 'School', 'Search', 'Send', 'Share2', 'Sparkles', 'Square', 'Target',
  'Trash2', 'TrendingDown', 'TrendingUp', 'Users', 'Volume2', 'X', 'Zap',
] as const

const SIZES = ['xs', 'sm', 'md', 'lg'] as const

export function Icons() {
  const [q, setQ] = useState('')
  const shown = IN_USE.filter((n) => n.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Iconos">
        El set es <strong>lucide</strong>, entero y sin envolver de a uno. Lo que el sistema aporta
        es <code className="font-mono text-sm">Icon</code>: un envoltorio que fija los tamaños, los
        colores y —lo más importante— el comportamiento accesible por defecto.
      </PageHead>

      <div className="flex flex-col gap-12">
        <Block id="uso" title="Cómo se usa"
          note="El icono se pasa como componente, no como string. Así el bundler solo incluye los que se usan.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Code>{`import { Icon } from '@melu/ui'\nimport { Users } from 'lucide-react'\n\n<Icon icon={Users} size="sm" color="muted" />`}</Code>
            <Card padding="md" className="grid place-items-center">
              <Icon icon={lucide.Users} size="lg" color="muted" />
            </Card>
          </div>
        </Block>

        <Block id="tamanos" title="Tamaños" note="Cuatro. Van con la escala tipográfica, no con píxeles sueltos.">
          <div className="flex flex-wrap items-end gap-8">
            {SIZES.map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <Icon icon={lucide.Sparkles} size={s} />
                <Text size="xs" className="font-mono text-ink-subtle">{s}</Text>
              </div>
            ))}
          </div>
        </Block>

        <Block id="accesibilidad" title="Accesibilidad"
          note="Es lo único que hay que pensar al poner un icono.">
          <div className="flex flex-col gap-3">
            <Rule title="Si al lado hay texto, el icono no se anuncia"
              why="El lector de pantalla lo repetiría dos veces.">
              <code className="font-mono text-xs">Icon</code> es{' '}
              <code className="font-mono text-xs">aria-hidden</code> por defecto. No hay que hacer nada.
            </Rule>
            <Rule title="Si el icono es la única señal, lleva su nombre"
              why="Un botón sin texto visible no tiene nombre accesible: sin aria-label se anuncia «botón».">
              En <code className="font-mono text-xs">IconButton</code> la prop es obligatoria y el tipo no
              compila sin ella.
            </Rule>
            <div className="flex flex-wrap items-center gap-4">
              <IconButton icon={<Icon icon={lucide.Trash2} />} label="Borrar" variant="ghost" />
              <IconButton icon={<Icon icon={lucide.Copy} />} label="Copiar el código" variant="ghost" />
              <IconButton icon={<Icon icon={lucide.RefreshCw} />} label="Volver a intentar" variant="ghost" />
            </div>
          </div>
        </Block>

        <Block id="set" title="Los que se usan"
          note={`${IN_USE.length} de los más de mil de lucide. Cualquier otro se puede importar igual; estos son los que ya aparecen en melu.`}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un icono…"
            startIcon={<Icon icon={lucide.Search} size="sm" />} clearable onClear={() => setQ('')} className="mb-5 max-w-sm" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {shown.map((n) => {
              const Cmp = lucide[n as keyof typeof lucide] as lucide.LucideIcon
              if (typeof Cmp !== 'function' && typeof Cmp !== 'object') return null
              return (
                <div key={n} className={cn('flex flex-col items-center gap-2 rounded-lg border border-line p-3 text-center')}>
                  <Icon icon={Cmp} size="md" />
                  <Text size="xs" variant="subtle" className="w-full truncate font-mono">{n}</Text>
                </div>
              )
            })}
          </div>
          {shown.length === 0 && <Text variant="muted" className="mt-4">Ninguno con ese nombre. Igual podés importarlo de lucide.</Text>}
        </Block>

        <Block id="doodles" title="Doodles"
          note="Van grandes, de a uno, y para dar aire — no para señalizar. Hoy son placeholders: hasta que haya arte propio, cada uno rinde un ícono de lucide con el trazo fino.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {Object.entries(DOODLES).map(([name, D]) => (
              <Card key={name} padding="md" className="items-center gap-2">
                <D size={56} className="text-ink" />
                <Text size="xs" variant="subtle" className="font-mono">{name}</Text>
              </Card>
            ))}
          </div>
        </Block>
      </div>
    </>
  )
}

Icons.sections = [
  ['uso', 'Cómo se usa'], ['tamanos', 'Tamaños'], ['accesibilidad', 'Accesibilidad'],
  ['set', 'Los que se usan'], ['doodles', 'Doodles'],
] as [string, string][]
