// El índice de piezas: agrupadas, con un preview vivo de cada una. Cada tarjeta lleva a su
// página, que es donde están los ejemplos, las props y la opinión.
import { NavLink } from 'react-router'
import { Alert, Card, Heading, Text } from '@melu/ui'
import DOCS from 'virtual:melu-props'
import { GROUPS, REGISTRY } from '../registry'
import { PREVIEWS } from '../previews'
import { PageHead, Ticks } from '../pieces'

// Así es como mueren estos sitios: el kit crece y la doc no. El barril es la lista de verdad,
// así que se compara contra el registry acá mismo y se muestra lo que falta. No hace falta un
// test: la página no puede quedarse atrás sin decirlo.
const COVERED = new Set(REGISTRY.flatMap((e) => e.exports))
const MISSING = Object.keys(DOCS).filter((name) => !COVERED.has(name) && DOCS[name]?.source.startsWith('src/'))

export function Components() {
  return (
    <>
      <PageHead title="Componentes">
        {REGISTRY.length} piezas. Cada una se compone de partes, se le puede prestar el estilo a otro
        elemento con <code className="font-mono text-sm">asChild</code>, y funciona controlada o no.
        Los colores salen de los tokens: cambiás el tema y cambia todo.
      </PageHead>

      {MISSING.length > 0 && (
        <Alert variant="warning" title={`${MISSING.length} exportados que no están documentados`} className="mb-10">
          <span className="font-mono text-xs">{MISSING.join(', ')}</span>
        </Alert>
      )}

      <div className="flex flex-col gap-12">
        {GROUPS.map((group) => {
          const items = REGISTRY.filter((e) => e.group === group)
          if (!items.length) return null
          return (
            <section key={group} id={group.toLowerCase()} className="scroll-mt-24 border-t border-line pt-8">
              <Heading level={2} size="xl">{group}</Heading>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((entry) => {
                  const Preview = PREVIEWS[entry.slug]
                  return (
                    <Card key={entry.slug} asChild interactive className="overflow-hidden">
                      <NavLink to={`/components/${entry.slug}`}>
                        <div className="pointer-events-none grid h-28 place-items-center overflow-hidden border-b border-line bg-muted px-4">
                          {Preview ? <Preview /> : null}
                        </div>
                        <div className="flex flex-col gap-1 p-4">
                          <Text weight="semibold">{entry.title}</Text>
                          <Text size="sm" variant="muted"><Ticks>{entry.summary}</Ticks></Text>
                        </div>
                      </NavLink>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

Components.sections = GROUPS.map((g) => [g.toLowerCase(), g] as [string, string])
