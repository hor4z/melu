// El índice de piezas: agrupadas, con un preview vivo de cada una. Cada tarjeta lleva a su
// página, que es donde están los ejemplos, las props y la opinión.
import { NavLink } from 'react-router'
import { Alert, Card, Heading, Text } from '@melu/ui'
import DOCS from 'virtual:melu-props'
import type { PropDoc } from '../props-plugin'
import { groupId, GROUPS, REGISTRY } from '../registry'
import { COPY } from '../copy'
import { PREVIEWS } from '../previews'
import { PageHead, Ticks } from '../pieces'

// Así es como mueren estos sitios: el kit crece y la doc no. El barril es la lista de verdad,
// así que se compara contra el registry acá mismo y se muestra lo que falta. No hace falta un
// test: la página no puede quedarse atrás sin decirlo.
const COVERED = new Set(REGISTRY.flatMap((e) => e.exports))
const MISSING = Object.keys(DOCS).filter((name) => !COVERED.has(name) && DOCS[name]?.source.startsWith('src/'))

// El código está en inglés y el sitio en español, así que la prosa sale de `docs/copy.ts`. Lo
// que el JSDoc explica y la tabla todavía no traduce no se muestra: se avisa acá.
const UNTRANSLATED = Object.values(DOCS)
  .filter((d) => d.source.startsWith('src/'))
  .flatMap((d) => [
    ...(d.description && !COPY[d.name] ? [d.name] : []),
    ...d.props.filter((p: PropDoc) => p.description && !COPY[`${d.name}.${p.name}`]).map((p: PropDoc) => `${d.name}.${p.name}`),
  ])

export function Components() {
  return (
    <>
      <PageHead title="Componentes">
        {REGISTRY.length} piezas. Cada una se compone de partes, se le puede prestar el estilo a otro
        elemento con <code className="font-mono text-sm">asChild</code>, y funciona controlada o no.
        Los colores salen de los tokens: cambiás el tema y cambia todo.
      </PageHead>

      {MISSING.length > 0 && (
        <Alert variant="warning" title={`${MISSING.length} exportados que no están documentados`} className="mb-4">
          <span className="font-mono text-xs">{MISSING.join(', ')}</span>
        </Alert>
      )}
      {UNTRANSLATED.length > 0 && (
        <Alert variant="warning" title={`${UNTRANSLATED.length} textos del código sin traducir en docs/copy.ts`} className="mb-4">
          <span className="font-mono text-xs">{UNTRANSLATED.join(', ')}</span>
        </Alert>
      )}

      <div className="flex flex-col gap-12">
        {GROUPS.map((group) => {
          const items = REGISTRY.filter((e) => e.group === group)
          if (!items.length) return null
          return (
            <section key={group} id={groupId(group)} className="scroll-mt-24 border-t border-line pt-8">
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

Components.sections = GROUPS.map((g) => [groupId(g), g] as [string, string])
