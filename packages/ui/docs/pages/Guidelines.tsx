import { Avatar, Button, Card, Chip, EmptyState, Field, Icon, IconButton, Input, SegmentedControl, SegmentedControlItem, Text } from '@melu/ui'
import { Trash2, Users } from 'lucide-react'
import { Block, Code, PageHead, Rule, DoDont } from '../pieces'

export function Guidelines() {
  return (
    <>
      <PageHead title="Lineamientos">
        Las reglas de uso, cada una con su porqué. El porqué es la mitad que se olvida y la que
        evita discutir dos veces lo mismo.
      </PageHead>

      <div className="flex flex-col gap-12">
        <Block id="color" title="Color"
          note="La regla más corta del sistema y la que más se rompe sin querer.">
          <div className="flex flex-col gap-4">
            <Rule title="Un hex escrito a mano es un bug"
              why="Los valores crudos viven en primitives.css y en ningún otro lado. Uno suelto en un componente se queda atrás el día que cambie la paleta, y nadie se entera hasta verlo.">
              Todo color sale de un token semántico. Si el que necesitás no existe, se agrega a la
              capa semántica: no se escribe el valor.
            </Rule>
            <DoDont
              good={<Code>{`<div className="bg-surface text-ink-muted" />`}</Code>}
              bad={<Code>{`<div style={{ background: '#fff', color: '#667' }} />`}</Code>}
            />
          </div>
        </Block>

        <Block id="composicion" title="Composición"
          note="Los componentes se prestan, no se copian.">
          <div className="flex flex-col gap-4">
            <Rule title={<><code className="font-mono text-sm">asChild</code> para prestarle el estilo a otro elemento</>}
              why="Un botón que en realidad es un link tiene que ser un <a> de verdad: se abre en pestaña nueva, se copia la dirección, y el lector de pantalla lo anuncia como lo que es.">
              Cuando la pieza correcta semánticamente no es la que trae el componente, se usa{' '}
              <code className="font-mono text-xs">asChild</code> y el estilo se presta.
            </Rule>
            <DoDont
              good={<Code>{`<Button asChild>\n  <Link to="/today">Ir a hoy</Link>\n</Button>`}</Code>}
              bad={<Code>{`<Button onClick={() => nav('/today')}>\n  Ir a hoy\n</Button>`}</Code>}
            />
            <Rule title={<><code className="font-mono text-sm">cn()</code> para mezclar clases, nunca concatenar</>}
              why={<>cn resuelve los conflictos de Tailwind: la última gana. Concatenando, <code className="font-mono text-xs">p-2 p-4</code> deja las dos y decide el orden del CSS, que no es el que escribiste.</>}>
              Toda clase condicional pasa por <code className="font-mono text-xs">cn()</code>.
            </Rule>
          </div>
        </Block>

        <Block id="estado" title="Estado"
          note="Todo lo que guarda algo funciona de las dos maneras.">
          <Rule title="Controlado o no controlado, nunca a medias"
            why="Es la convención de los primitivos de Radix y la que espera cualquiera que llegue. Un componente que solo funciona de una forma obliga a envolverlo.">
            Cada componente con estado acepta <code className="font-mono text-xs">value</code> +{' '}
            <code className="font-mono text-xs">onValueChange</code> para controlarlo, o{' '}
            <code className="font-mono text-xs">defaultValue</code> para dejarlo solo.
          </Rule>
        </Block>

        <Block id="accesibilidad" title="Accesibilidad"
          note="No es una capa que se agrega al final: son props obligatorias.">
          <div className="flex flex-col gap-4">
            <Rule title={<>Un botón sin texto lleva <code className="font-mono text-sm">aria-label</code>, y es obligatorio</>}
              why="Es el nombre accesible del botón. Sin él, un lector de pantalla anuncia «botón» y nada más.">
              <code className="font-mono text-xs">IconButton</code> lo pide en el tipo: no compila sin él.
            </Rule>
            <DoDont
              good={<div className="flex items-center gap-3"><IconButton icon={<Icon icon={Trash2} />} label="Borrar la actividad" /><Text size="sm" variant="muted">se anuncia bien</Text></div>}
              bad={<div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md border border-line"><Icon icon={Trash2} /></span><Text size="sm" variant="muted">«botón», y nada más</Text></div>}
            />
            <Rule title="Un icono decorativo no se anuncia"
              why="Si al lado hay texto que dice lo mismo, el lector lo repite dos veces.">
              <code className="font-mono text-xs">Icon</code> es <code className="font-mono text-xs">aria-hidden</code> por
              defecto. El <code className="font-mono text-xs">aria-label</code> es solo para los iconos que
              cargan significado propio.
            </Rule>
            <Rule title="El foco siempre se ve"
              why="Alguien que navega con teclado necesita saber dónde está. Sacar el outline sin poner otro deja la app inusable para esa persona.">
              El anillo de foco sale de <code className="font-mono text-xs">--focus</code> y ningún
              componente lo apaga.
            </Rule>
          </div>
        </Block>

        <Block id="contenido" title="Contenido"
          note="Lo que dicen las pantallas es parte del sistema.">
          <div className="flex flex-col gap-4">
            <Rule title="Un vacío siempre dice qué falta y qué se puede hacer"
              why="«No hay nada» deja a la persona sin salida. El vacío es el mejor momento para enseñar el producto.">
              <code className="font-mono text-xs">EmptyState</code> pide título, explicación y acción.
            </Rule>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card padding="md">
                <EmptyState icon={<Icon icon={Users} size={36} color="subtle" />} title="Todavía nadie se unió"
                  description="Compartí el código del grupo o el QR. Entran con Google y aparecen acá."
                  actions={<Button size="sm">Invitar</Button>} />
              </Card>
              <Card padding="md" className="grid place-items-center">
                <Text variant="subtle">Sin resultados</Text>
              </Card>
            </div>
            <Rule title="El copy va en español; los identificadores, en inglés"
              why="Es la regla del repo y está en AGENTS.md: si lo lee una persona va en español, si lo lee un programa va en inglés.">
              Un componente del sistema no trae texto propio en pantalla. La única excepción son las
              etiquetas ARIA, que van como prop con un default en español.
            </Rule>
          </div>
        </Block>

        <Block id="eleccion" title="Elegir la pieza"
          note="Cuándo uno y cuándo el otro. Lo que más se pregunta.">
          <div className="flex flex-col gap-3">
            <Rule title="Pocas opciones excluyentes y siempre visibles: SegmentedControl"
              why="Si son más de cinco no entran, y la fila se vuelve ilegible.">
              Más de cinco, o si la lista puede crecer: <code className="font-mono text-xs">Select</code>.
            </Rule>
            <div className="flex flex-wrap items-center gap-6">
              <SegmentedControl defaultValue="semana">
                <SegmentedControlItem value="dia">Día</SegmentedControlItem>
                <SegmentedControlItem value="semana">Semana</SegmentedControlItem>
                <SegmentedControlItem value="mes">Mes</SegmentedControlItem>
              </SegmentedControl>
              <Field label="Disciplina" className="w-56"><Input placeholder="Buscar…" /></Field>
            </div>
            <Rule title="Chip para una etiqueta, Badge para un número"
              why="Un badge con texto largo se lee como un chip roto y desalinea la fila.">
              <span className="inline-flex items-center gap-2">
                <Chip color="accent" size="sm">Reto</Chip>
                <Chip size="sm">Pantalla</Chip>
              </span>
            </Rule>
            <Rule title="Avatar toma el nombre, no el color"
              why="El mismo nombre cae siempre en el mismo tinte: la cara del grupo no baila entre recargas.">
              <span className="inline-flex items-center gap-2 pt-1">
                <Avatar name="Sofía" size="sm" /><Avatar name="Benjamín" size="sm" /><Avatar name="Thiago" size="sm" />
              </span>
            </Rule>
          </div>
        </Block>
      </div>
    </>
  )
}

Guidelines.sections = [
  ['color', 'Color'], ['composicion', 'Composición'], ['estado', 'Estado'],
  ['accesibilidad', 'Accesibilidad'], ['contenido', 'Contenido'], ['eleccion', 'Elegir la pieza'],
] as [string, string][]
