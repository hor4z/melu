// La página de un componente. Todas tienen la misma estructura a propósito: quien ya leyó una
// sabe dónde mirar en las otras. Arriba qué es y de dónde sale, después los ejemplos vivos con
// su código, después las props, y al final cuándo usarlo y cuándo no.
import { useState } from 'react'
import { NavLink, useParams } from 'react-router'
import { Alert, Button, Card, Chip, Heading, Icon, Text, cn } from '@melu/ui'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy } from 'lucide-react'
import DOCS from 'virtual:melu-props'
import type { PropDoc } from './props-plugin'
import { bySlug, REGISTRY, type Entry } from './registry'
import { COPY } from './copy'
import { Block, PageHead, Ticks } from './pieces'
import { Layout, type Section } from './Layout'

// Los dos lados del mismo archivo: el componente que se rinde y el texto que se muestra. Que
// salgan del mismo módulo es lo que impide que el código de la doc se desfase del ejemplo.
const MODULES = import.meta.glob<{ default: () => React.ReactNode }>('./examples/**/*.tsx', { eager: true })
const SOURCES = import.meta.glob<string>('./examples/**/*.tsx', { eager: true, query: '?raw', import: 'default' })

/** El bloque de código: lo que se muestra es lo que se está rindiendo, con botón de copiar. */
function Source({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-b-xl border-x border-b border-line bg-muted p-4 text-xs leading-relaxed">
        <code className="font-mono text-ink">{code}</code>
      </pre>
      <Button size="sm" variant="ghost" className="absolute right-2 top-2 bg-surface/80"
        startIcon={<Icon icon={copied ? Check : Copy} size="sm" />}
        onClick={() => { void navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  )
}

/** Un ejemplo: el componente arriba, su código abajo, plegado. */
function Example({ slug, id, title, note }: { slug: string; id: string; title: string; note?: string }) {
  const [open, setOpen] = useState(false)
  const key = `./examples/${slug}/${id}.tsx`
  const Demo = MODULES[key]?.default
  const code = SOURCES[key]

  if (!Demo) {
    return <Alert variant="warning" title={title}>Falta <code className="font-mono text-xs">docs/examples/{slug}/{id}.tsx</code>.</Alert>
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Text weight="semibold">{title}</Text>
        {note && <Text size="sm" variant="muted"><Ticks>{note}</Ticks></Text>}
      </div>
      <div>
        <div className={cn('flex flex-wrap items-center gap-4 border border-line bg-surface p-6', open ? 'rounded-t-xl' : 'rounded-xl')}>
          <Demo />
        </div>
        <button type="button" onClick={() => setOpen(!open)}
          className={cn('flex w-full items-center justify-between border-x border-b border-line px-4 py-2 text-xs text-ink-muted hover:bg-hover',
            open ? '' : 'rounded-b-xl border-t-0')}>
          <span>{open ? 'Ocultar el código' : 'Ver el código'}</span>
          <Icon icon={ChevronDown} size="sm" className={cn('transition-transform', open && 'rotate-180')} />
        </button>
        {open && <Source code={code?.trim() ?? ''} />}
      </div>
    </div>
  )
}

/** La tabla de props. Sale del compilador, no de acá: ver `docs/props-plugin.ts`. */
function PropsTable({ name }: { name: string }) {
  const doc = DOCS[name]
  if (!doc) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <Text mono weight="semibold">{name}</Text>
        {COPY[name] && <Text size="sm" variant="muted"><Ticks>{COPY[name]}</Ticks></Text>}
      </div>

      {doc.props.length === 0
        ? <Text size="sm" variant="subtle">Sin props propias.</Text>
        : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-muted text-left">
                  <th className="px-4 py-2 font-medium text-ink-muted">Prop</th>
                  <th className="px-4 py-2 font-medium text-ink-muted">Tipo</th>
                  <th className="px-4 py-2 font-medium text-ink-muted">Por defecto</th>
                </tr>
              </thead>
              <tbody>
                {doc.props.map((p: PropDoc) => (
                  <tr key={p.name} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-medium">{p.name}</span>
                      {p.required && <span className="ml-1 text-xs text-danger" title="Obligatoria">*</span>}
                      {COPY[`${name}.${p.name}`] && <Text size="xs" variant="muted" className="mt-1 max-w-md"><Ticks>{COPY[`${name}.${p.name}`]}</Ticks></Text>}
                    </td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-accent">{p.type}</span></td>
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-ink-subtle">{p.default ?? '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {doc.extendsElement && (
        <Text size="xs" variant="subtle">
          Además acepta los atributos de <code className="font-mono">{`<${doc.extendsElement}>`}</code> ({doc.inherited}),
          que se pasan tal cual al elemento.
        </Text>
      )}
    </div>
  )
}

function List({ items, tone }: { items: string[]; tone: 'good' | 'bad' }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span aria-hidden="true" className={cn('mt-2 size-1.5 shrink-0 rounded-full', tone === 'good' ? 'bg-success' : 'bg-danger')} />
          <Text size="sm" variant="muted"><Ticks>{item}</Ticks></Text>
        </li>
      ))}
    </ul>
  )
}

/** Ir a la pieza anterior y a la siguiente, en el orden del índice. */
function Around({ entry }: { entry: Entry }) {
  const i = REGISTRY.findIndex((e) => e.slug === entry.slug)
  const prev = REGISTRY[i - 1]
  const next = REGISTRY[i + 1]
  return (
    <div className="mt-14 flex justify-between gap-4 border-t border-line pt-6">
      {prev
        ? <Button variant="ghost" asChild startIcon={<Icon icon={ArrowLeft} size="sm" />}><NavLink to={`/components/${prev.slug}`}>{prev.title}</NavLink></Button>
        : <span />}
      {next && <Button variant="ghost" asChild endIcon={<Icon icon={ArrowRight} size="sm" />}><NavLink to={`/components/${next.slug}`}>{next.title}</NavLink></Button>}
    </div>
  )
}

export function ComponentPage() {
  const { slug = '' } = useParams()
  const entry = bySlug.get(slug)

  if (!entry) {
    return (
      <>
        <PageHead title="No existe esa pieza">
          El índice está en <NavLink to="/components" className="text-accent underline">Componentes</NavLink>.
        </PageHead>
      </>
    )
  }

  const source = DOCS[entry.exports[0]]?.source

  return (
    <>
      <div className="mb-10">
        <Chip size="sm" className="mb-3">{entry.group}</Chip>
        <Heading level={1} size="display">{entry.title}</Heading>
        <Text variant="muted" className="mt-3 max-w-2xl text-lg"><Ticks>{entry.summary}</Ticks></Text>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {entry.exports.map((name) => (
            <code key={name} className="rounded-md border border-line bg-muted px-2 py-0.5 font-mono text-xs">{name}</code>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <Block id="import" title="Cómo se importa">
          <Source code={`import { ${entry.exports.join(', ')} } from '@melu/ui'`} />
        </Block>

        <Block id="examples" title="Ejemplos">
          <div className="flex flex-col gap-8">
            {entry.demos.map((d) => <Example key={d.id} slug={entry.slug} {...d} />)}
          </div>
        </Block>

        <Block id="props" title="Props" note="Salen del código: si una prop cambia de tipo, esta tabla cambia con ella.">
          <div className="flex flex-col gap-8">
            {entry.exports.map((name) => <PropsTable key={name} name={name} />)}
          </div>
        </Block>

        {(entry.when || entry.whenNot) && (
          <Block id="when" title="Cuándo sí y cuándo no" note="La opinión es lo que separa un sistema de una carpeta de componentes.">
            <div className="grid gap-4 sm:grid-cols-2">
              {entry.when && <Card padding="md" className="gap-3"><Text size="xs" weight="semibold" className="uppercase tracking-wide text-success">Cuándo</Text><List items={entry.when} tone="good" /></Card>}
              {entry.whenNot && <Card padding="md" className="gap-3"><Text size="xs" weight="semibold" className="uppercase tracking-wide text-danger">Cuándo no</Text><List items={entry.whenNot} tone="bad" /></Card>}
            </div>
          </Block>
        )}

        {source && (
          <Block id="source" title="La fuente" note="La firma completa y los comentarios que explican cada decisión.">
            <code className="font-mono text-sm text-accent">packages/ui/{source}</code>
          </Block>
        )}
      </div>

      <Around entry={entry} />
    </>
  )
}

/**
 * El índice de la derecha depende de la pieza: no todas tienen opinión escrita, y un enlace a
 * una sección que no existe no lleva a ningún lado. Por eso la ruta arma su propio Layout.
 */
export function ComponentRoute() {
  const { slug = '' } = useParams()
  const entry = bySlug.get(slug)
  const sections: Section[] = [['import', 'Cómo se importa'], ['examples', 'Ejemplos'], ['props', 'Props']]
  if (entry?.when || entry?.whenNot) sections.push(['when', 'Cuándo sí y cuándo no'])
  if (entry) sections.push(['source', 'La fuente'])
  return <Layout sections={sections}><ComponentPage /></Layout>
}
