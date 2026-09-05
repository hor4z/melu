// Las piezas con las que se escriben las páginas del sitio. Nada de esto es del kit:
// son andamios de la documentación.
import type { ReactNode } from 'react'
import { Card, Heading, Text, cn } from '@melu/ui'

/** El encabezado de una página: el título y la frase que dice de qué va. */
export function PageHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <Heading level={1} size="display">{title}</Heading>
      <Text variant="muted" className="mt-3 max-w-2xl text-lg">{children}</Text>
    </div>
  )
}

/** Una sección con ancla, para que el índice de la derecha pueda apuntarle. */
export function Block({ id, title, note, children }: { id: string; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8">
      <Heading level={2} size="xl">{title}</Heading>
      {note && <Text variant="muted" className="mt-1 max-w-2xl">{note}</Text>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Una regla, con su porqué. El porqué es la mitad que se olvida y la que evita discutirla dos veces. */
export function Rule({ title, children, why }: { title: ReactNode; children: ReactNode; why?: ReactNode }) {
  return (
    <Card padding="md" className="gap-1.5">
      <Text weight="semibold">{title}</Text>
      <Text size="sm" variant="muted">{children}</Text>
      {why && <Text size="sm" className="mt-1 border-l-2 border-brand-text pl-3 text-ink-muted"><span className="font-medium text-accent">Por qué · </span>{why}</Text>}
    </Card>
  )
}

/** Un par «así sí / así no». Vale más que cualquier párrafo. */
export function DoDont({ good, bad, children }: { good: ReactNode; bad: ReactNode; children?: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[['Así sí', good, 'success'], ['Así no', bad, 'danger']].map(([label, node, tone]) => (
        <div key={label as string} className="flex flex-col gap-2">
          <Text size="xs" weight="semibold" className={cn('uppercase tracking-wide', tone === 'success' ? 'text-success' : 'text-danger')}>{label as string}</Text>
          <Card padding="md" className={cn('min-h-24 justify-center border-2', tone === 'success' ? 'border-success/40' : 'border-danger/40')}>{node as ReactNode}</Card>
        </div>
      ))}
      {children}
    </div>
  )
}

/** Código, para copiar. Sin resaltado: el kit no trae un highlighter y no vale traer uno para esto. */
export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-line bg-muted p-4 text-xs leading-relaxed">
      <code className="font-mono text-ink">{children.trim()}</code>
    </pre>
  )
}

/**
 * Los textos del registry se escriben en markdown mínimo: solo `código` entre backticks. Esto
 * lo convierte en `<code>`. Sin esto los backticks se rinden literales, que es peor que no
 * marcarlos: parecen un error de tipeo.
 */
export function Ticks({ children }: { children: string }) {
  return (
    <>
      {children.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') && part.endsWith('`')
          ? <code key={`${i}-${part}`} className="font-mono text-[0.92em] text-accent">{part.slice(1, -1)}</code>
          : part,
      )}
    </>
  )
}
