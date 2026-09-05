// El theme, leído en vivo de las custom properties del documento.
//
// Nada de esta página transcribe los tokens: los lee con getComputedStyle. Así no puede
// desfasarse de tokens/. Si alguien cambia un valor, esta página cambia sola — y eso la
// convierte en verificación además de documentación.
import { useEffect, useState } from 'react'
import { Card, Heading, Text } from '@melu/ui'
import { Block, Code, PageHead } from '../pieces'

const leer = (nombre: string) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()

/** Los primitivos: los valores crudos. Un componente no los usa nunca. */
const PRIMITIVOS = [
  ['--color-white', '--color-ink', '--color-ink-2', '--color-ink-3', '--color-ink-4'],
  ['--color-mist-50', '--color-mist-100', '--color-mist-200', '--color-mist-300'],
  ['--color-teal-50', '--color-teal-100', '--color-teal-500', '--color-teal-600'],
  ['--color-tint-blue', '--color-tint-yellow', '--color-tint-orange', '--color-tint-lilac',
   '--color-tint-cyan', '--color-tint-green', '--color-tint-pink'],
  ['--color-red-500', '--color-green-500', '--color-amber-500'],
]

/** Los semánticos: los roles. Los componentes se estilan solo contra esta capa. */
const SEMANTICOS: [string, string, string[]][] = [
  ['Superficies', 'Dónde se apoya el contenido.',
   ['--bg', '--surface', '--surface-muted', '--surface-hover', '--surface-active', '--overlay', '--bg-inverted']],
  ['Bordes', 'La línea que separa sin gritar.',
   ['--border', '--border-strong', '--border-accent']],
  ['Texto', 'La jerarquía se hace con color, no solo con tamaño.',
   ['--text', '--text-muted', '--text-subtle', '--text-disabled', '--text-inverted']],
  ['Acento', 'El teal de melu y el sólido de tinta del botón primario.',
   ['--accent', '--accent-hover', '--accent-subtle', '--accent-text', '--solid', '--solid-hover', '--solid-foreground']],
  ['Estado', 'Lo que salió bien, lo que hay que mirar y lo que salió mal.',
   ['--success', '--success-subtle', '--warning', '--warning-subtle', '--danger', '--danger-subtle']],
  ['Tintes', 'Los fondos suaves que ordenan sin pesar.',
   ['--tint-teal', '--tint-blue', '--tint-yellow', '--tint-orange', '--tint-lilac', '--tint-cyan', '--tint-green', '--tint-pink']],
]

/** Los estados de interacción, que es donde un sistema se nota o se cae. */
const INTERACCION: [string, string, string][] = [
  ['Reposo', '--surface', 'Lo normal.'],
  ['Hover', '--surface-hover', 'Una capa de tinta al 4 %, no un color nuevo.'],
  ['Activo', '--surface-active', 'La misma capa, al 8 %.'],
  ['Foco', '--focus', 'Siempre visible. Nunca se saca el outline sin poner otro.'],
  ['Deshabilitado', '--surface-disabled', 'Se ve, no se toca, y el cursor lo dice.'],
]

function Muestra({ nombre }: { nombre: string }) {
  const [valor, setValor] = useState('')
  useEffect(() => setValor(leer(nombre)), [nombre])
  return (
    <div className="flex items-center gap-3">
      <span className="size-9 shrink-0 rounded-lg border border-line" style={{ background: `var(${nombre})` }} />
      <span className="min-w-0">
        <Text size="sm" className="block truncate font-mono">{nombre}</Text>
        <Text size="xs" variant="subtle" className="block truncate font-mono">{valor || '—'}</Text>
      </span>
    </div>
  )
}

function Escala({ nombres, unidad }: { nombres: string[]; unidad?: string }) {
  const [vals, setVals] = useState<Record<string, string>>({})
  useEffect(() => setVals(Object.fromEntries(nombres.map((n) => [n, leer(n)]))), [nombres])
  return (
    <div className="flex flex-col gap-2">
      {nombres.map((n) => (
        <div key={n} className="flex items-center gap-4">
          <Text size="xs" className="w-40 shrink-0 font-mono text-ink-muted">{n}</Text>
          <span className="h-4 rounded bg-brand-text" style={{ width: `var(${n})` }} />
          <Text size="xs" variant="subtle" className="font-mono">{vals[n]}{unidad}</Text>
        </div>
      ))}
    </div>
  )
}

export function Theme() {
  return (
    <>
      <PageHead title="Theme">
        Dos capas: los <strong>primitivos</strong>, que son los valores crudos, y los{' '}
        <strong>semánticos</strong>, que son los roles. Un componente se estila siempre contra la
        segunda. Todo lo de esta página se lee en vivo del documento, así que no puede mentir.
      </PageHead>

      <div className="flex flex-col gap-12">
        <Block id="capas" title="Las dos capas" note="Es la regla más importante del sistema y la más fácil de romper sin darse cuenta.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card padding="md" className="gap-2">
              <Text weight="semibold">Primitivos</Text>
              <Text size="sm" variant="muted">Valores crudos, sin significado. Viven en <code className="font-mono text-xs">primitives.css</code> y son el único lugar del repo donde se escribe un hex.</Text>
              <Code>{`--color-teal-500: #10756e;`}</Code>
            </Card>
            <Card padding="md" className="gap-2">
              <Text weight="semibold">Semánticos</Text>
              <Text size="sm" variant="muted">Roles. Dicen para qué sirve el color, no cuál es. Un componente usa esto y nada más.</Text>
              <Code>{`--text-muted: var(--color-ink-3);`}</Code>
            </Card>
          </div>
          <Card padding="md" className="mt-4 gap-2 border-l-4 border-brand-text">
            <Text size="sm">
              La consecuencia práctica: si un componente escribe <code className="font-mono text-xs">--color-mist-300</code> en vez de{' '}
              <code className="font-mono text-xs">--text-subtle</code>, el día que cambie la paleta ese componente se queda atrás y
              nadie se entera hasta verlo.
            </Text>
          </Card>
        </Block>

        <Block id="primitivos" title="Primitivos" note="Los valores crudos. Están acá para poder mirarlos, no para usarlos.">
          <div className="flex flex-col gap-6">
            {PRIMITIVOS.map((fila, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {fila.map((n) => <Muestra key={n} nombre={n} />)}
              </div>
            ))}
          </div>
        </Block>

        <Block id="semanticos" title="Semánticos" note="Los roles. Esto es lo que usa un componente.">
          <div className="flex flex-col gap-8">
            {SEMANTICOS.map(([titulo, nota, nombres]) => (
              <div key={titulo}>
                <Heading level={3} size="md">{titulo}</Heading>
                <Text size="sm" variant="muted" className="mt-0.5">{nota}</Text>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {nombres.map((n) => <Muestra key={n} nombre={n} />)}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block id="interaccion" title="Estados de interacción" note="Un sistema se nota en los estados, no en el reposo.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {INTERACCION.map(([nombre, token, nota]) => (
              <Card key={nombre} padding="md" className="gap-2">
                <span className="h-10 rounded-lg border border-line" style={{ background: `var(${token})` }} />
                <Text size="sm" weight="semibold">{nombre}</Text>
                <Text size="xs" className="font-mono text-ink-subtle">{token}</Text>
                <Text size="xs" variant="muted">{nota}</Text>
              </Card>
            ))}
          </div>
        </Block>

        <Block id="tipografia" title="Tipografía" note="Inter para leer, Inter Tight para los títulos, JetBrains Mono para el código.">
          <div className="flex flex-col gap-4">
            {[['--text-display', 'Aprender deja huella'], ['--text-2xl', 'Un título de pantalla'],
              ['--text-xl', 'Un título de sección'], ['--text-lg', 'Una bajada'],
              ['--text-base', 'El cuerpo del texto, que es lo que más se lee'],
              ['--text-sm', 'Un texto secundario'], ['--text-xs', 'Un pie, una etiqueta']].map(([token, muestra]) => (
              <div key={token} className="flex items-baseline gap-5 border-b border-line pb-3">
                <Text size="xs" className="w-32 shrink-0 font-mono text-ink-subtle">{token}</Text>
                <span style={{ fontSize: `var(${token})`, fontFamily: token.includes('display') || token.includes('2xl') || token === '--text-xl' ? 'var(--font-display)' : undefined }}>{muestra}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block id="espaciado" title="Espaciado" note="Una escala, no números sueltos.">
          <Escala nombres={['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10', '--space-12', '--space-16']} />
        </Block>

        <Block id="radios" title="Radios" note="De la esquina apenas rota a la píldora.">
          <div className="flex flex-wrap gap-4">
            {['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl'].map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <span className="size-16 border-2 border-brand-text bg-teal" style={{ borderRadius: `var(${n})` }} />
                <Text size="xs" className="font-mono text-ink-subtle">{n}</Text>
              </div>
            ))}
          </div>
        </Block>

        <Block id="elevacion" title="Elevación" note="Tres sombras. Más que eso es ruido.">
          <div className="flex flex-wrap gap-6">
            {['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-card'].map((n) => (
              <div key={n} className="flex flex-col items-center gap-2">
                <span className="size-20 rounded-xl bg-surface" style={{ boxShadow: `var(${n})` }} />
                <Text size="xs" className="font-mono text-ink-subtle">{n}</Text>
              </div>
            ))}
          </div>
        </Block>

        <Block id="movimiento" title="Movimiento"
          note="El repertorio está para que la corrección se sienta, no para decorar. Todo respeta prefers-reduced-motion.">
          <Motion />
        </Block>
      </div>
    </>
  )
}

const CLASES = [
  ['ui-reveal', 'Aparecer', 'Lo que entra a la pantalla.'],
  ['ui-rise', 'Subir', 'Lo que llega desde abajo, más marcado.'],
  ['ui-correct', 'Bien', 'Late y destella en verde. Solo cuando algo salió bien de verdad.'],
  ['ui-error', 'Mal', 'Sacude en el eje X. Corto: no es un reto.'],
  ['ui-nudge', 'Insistir', 'Flota en bucle. Para lo que espera una acción.'],
  ['ui-glow', 'Brillar', 'Halo en bucle. Para lo que hay que mirar.'],
  ['ui-flip', 'Dar vuelta', 'Para las cartas.'],
  ['ui-pop', 'Aparecer (overlay)', 'La usan los menús y los modales al abrir.'],
  ['ui-fade', 'Fundir (overlay)', 'La usa el fondo del modal y el tooltip.'],
]

function Motion() {
  const [nonce, setNonce] = useState(0)
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => setNonce((n) => n + 1)}
        className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-hover">
        Repetir
      </button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CLASES.map(([clase, nombre, nota]) => (
          <Card key={clase} padding="md" className="gap-2">
            <span key={nonce} className={`grid h-14 place-items-center rounded-lg bg-teal font-display text-sm font-semibold ${clase}`}>
              {nombre}
            </span>
            <Text size="xs" className="font-mono text-ink-subtle">.{clase}</Text>
            <Text size="xs" variant="muted">{nota}</Text>
          </Card>
        ))}
      </div>
      <Text size="sm" variant="muted">
        Para escalonar una entrada hay tres retrasos: <code className="font-mono text-xs">.ui-delay-1</code>,{' '}
        <code className="font-mono text-xs">.ui-delay-2</code> y <code className="font-mono text-xs">.ui-delay-3</code>.
      </Text>
    </div>
  )
}

Theme.sections = [
  ['capas', 'Las dos capas'], ['primitivos', 'Primitivos'], ['semanticos', 'Semánticos'],
  ['interaccion', 'Interacción'], ['tipografia', 'Tipografía'], ['espaciado', 'Espaciado'],
  ['radios', 'Radios'], ['elevacion', 'Elevación'], ['movimiento', 'Movimiento'],
] as [string, string][]
