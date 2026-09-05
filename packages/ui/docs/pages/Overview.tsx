import { NavLink } from 'react-router'
import { Button, Card, DoodleBridge, DoodleBulb, DoodleSprout, Heading, Icon, Squiggle, Text } from '@melu/ui'
import { ArrowRight } from 'lucide-react'
import { Code } from '../pieces'

const PUERTAS = [
  { to: '/goals', doodle: DoodleSprout, titulo: 'Objetivos',
    bajada: 'Qué busca este sistema y, sobre todo, qué no. Empezá acá si venís a decidir algo.' },
  { to: '/guidelines', doodle: DoodleBridge, titulo: 'Lineamientos',
    bajada: 'Las reglas de uso, con el porqué de cada una. Lo que evita discutir dos veces lo mismo.' },
  { to: '/theme', doodle: DoodleBulb, titulo: 'Theme',
    bajada: 'Color, tipografía, espaciado y movimiento. Leído en vivo, así que no puede mentir.' },
]

export function Overview() {
  return (
    <>
      <div className="mb-12">
        <Heading level={1} size="display" className="max-w-3xl">
          El sistema con el que se construye <Squiggle>melu</Squiggle>.
        </Heading>
        <Text variant="muted" className="mt-4 max-w-2xl text-lg">
          Un kit de componentes y un conjunto de tokens, hechos acá y para esto. No es una librería
          genérica adaptada: cada pieza existe porque una pantalla de melu la necesitó, y por eso
          tiene opinión sobre cómo usarse.
        </Text>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><NavLink to="/components">Ver los componentes <Icon icon={ArrowRight} size="sm" /></NavLink></Button>
          <Button variant="ghost" asChild><NavLink to="/guidelines">Leer los lineamientos</NavLink></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PUERTAS.map(({ to, doodle: D, titulo, bajada }) => (
          <Card key={to} asChild interactive padding="lg" className="gap-3">
            <NavLink to={to}>
              <D size={56} className="text-ink" />
              <Text weight="semibold" size="lg">{titulo}</Text>
              <Text size="sm" variant="muted">{bajada}</Text>
            </NavLink>
          </Card>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <Heading level={2} size="xl">Cómo se usa</Heading>
        <Text variant="muted" className="mt-1 max-w-2xl">
          Es un package del monorepo. No se instala de un registry: ya está linkeado.
        </Text>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Text size="sm" weight="semibold" className="mb-2">Los estilos, una vez, en el entry de la app</Text>
            <Code>{`import '@melu/ui/theme.css'`}</Code>
          </div>
          <div>
            <Text size="sm" weight="semibold" className="mb-2">Los componentes, desde el barril</Text>
            <Code>{`import { Button, Card, Field, Input } from '@melu/ui'`}</Code>
          </div>
        </div>
        <Text size="sm" variant="muted" className="mt-4 max-w-2xl">
          Una sola entrada a propósito: <code className="font-mono text-xs">@melu/ui</code> para todo y{' '}
          <code className="font-mono text-xs">@melu/ui/theme.css</code> para los estilos. No hay imports por
          subruta, así que mover un componente de archivo nunca rompe a quien lo usa.
        </Text>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <Heading level={2} size="xl">Qué hay adentro</Heading>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Componentes', '~90 exportados, en 25 archivos'],
            ['Tokens', 'Dos capas: primitivos y semánticos'],
            ['Movimiento', '9 clases, todas con reduced-motion'],
            ['Marca', 'El logo, el subrayado y 10 doodles']].map(([t, d]) => (
            <Card key={t} padding="md" className="gap-1">
              <Text weight="semibold">{t}</Text>
              <Text size="sm" variant="muted">{d}</Text>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
