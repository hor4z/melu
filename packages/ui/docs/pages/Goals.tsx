import { Card, Text } from '@melu/ui'
import { Block, PageHead, Rule } from '../pieces'

export function Goals() {
  return (
    <>
      <PageHead title="Objetivos">
        Un design system es un acuerdo, no una carpeta de componentes. Esto es lo que este acuerdo
        se propone — y lo que deja explícitamente afuera, que suele ser lo más útil de escribir.
      </PageHead>

      <div className="flex flex-col gap-12">
        <Block id="busca" title="Qué busca">
          <div className="flex flex-col gap-3">
            <Rule title="Que una decisión se tome una sola vez"
              why="El caso testigo es el cursor: en Tailwind v4 el preflight deja los botones con la flecha del sistema y nada se siente clickeable. Se arregla una vez, sobre los roles, en vez de acordarse en cada componente nuevo.">
              Si algo se resolvió bien, tiene que quedar resuelto para siempre y para todos. El
              sistema es el lugar donde viven esas decisiones.
            </Rule>
            <Rule title="Que la pantalla se pueda leer a los seis años y a los cuarenta"
              why="melu lo usa un chico que está aprendiendo a leer y un docente apurado entre dos clases. Los dos tienen que poder.">
              Contraste real, foco siempre visible, área de toque generosa, y texto que se puede
              escuchar cuando hace falta.
            </Rule>
            <Rule title="Que el movimiento signifique algo"
              why="El repertorio está para que la corrección se sienta. Una animación que solo decora agrega ruido y cansa.">
              Cada animación del sistema responde a un hecho: algo salió bien, algo salió mal, algo
              apareció. Ninguna está porque quedaba linda.
            </Rule>
            <Rule title="Que cambiar el tema no obligue a tocar componentes"
              why={<>Los componentes se estilan contra roles, no contra valores. Cambiar <code className="font-mono text-xs">--accent</code> cambia la app entera sin abrir un solo .tsx.</>}>
              Los tokens son la única fuente de verdad visual. Un hex escrito a mano en un
              componente es un bug.
            </Rule>
          </div>
        </Block>

        <Block id="no-busca" title="Qué no busca"
          note="Esto es tan importante como lo de arriba: marca dónde no vale la pena poner esfuerzo.">
          <div className="flex flex-col gap-3">
            <Rule title="No busca ser genérico"
              why="Cada pieza existe porque una pantalla de melu la necesitó. Anticipar usos que no existen es cómo un sistema se llena de props que nadie usa.">
              No es una librería para cualquier producto. Es el sistema de melu, y puede darse el
              lujo de tener opinión.
            </Rule>
            <Rule title="No busca cubrir todos los casos"
              why="Un sistema fuerte cura, uno débil acumula. Si algo se usa una sola vez, vive en la app, no acá.">
              Un componente entra cuando aparece la segunda pantalla que lo necesita, no cuando
              alguien imagina que podría servir.
            </Rule>
            <Rule title="No busca tener dos temas"
              why="Docente y aprendiz ven los mismos colores a propósito: es el mismo lugar, no dos productos. Sostener un modo oscuro cuesta el doble en cada decisión de color.">
              Un solo tema, claro, declarado en <code className="font-mono text-xs">color-scheme: light</code>.
              El día que haga falta el oscuro, la capa semántica ya está preparada para soportarlo.
            </Rule>
            <Rule title="No busca reemplazar el criterio"
              why="Las reglas de acá resuelven lo repetido. Lo que no está escrito se decide mirando la pantalla, no buscando permiso.">
              Si una regla estorba en un caso concreto, el problema puede ser la regla. Se discute y
              se cambia acá, no se esquiva en silencio.
            </Rule>
          </div>
        </Block>

        <Block id="entra" title="Cuándo entra algo al sistema"
          note="Tres preguntas. Si alguna da que no, vive en la app.">
          <div className="grid gap-4 sm:grid-cols-3">
            {[['¿Se usa en dos lugares?', 'Uno solo no es un patrón: es una pantalla.'],
              ['¿Sabe algo de melu?', 'Si sus props hablan de espacios, grupos o misiones, es producto y no sistema.'],
              ['¿Trae texto propio?', 'Un componente con copy adentro no se puede reusar sin traicionar su contenido.']].map(([p, d]) => (
              <Card key={p} padding="md" className="gap-2">
                <Text weight="semibold">{p}</Text>
                <Text size="sm" variant="muted">{d}</Text>
              </Card>
            ))}
          </div>
          <Text size="sm" variant="muted" className="mt-4 max-w-2xl">
            La marca sí entra, aunque no sea reusable fuera de melu: el logo y los doodles están
            dibujados contra los mismos tokens que todo lo demás, y separarlos dejaría dos fuentes
            visuales en vez de una.
          </Text>
        </Block>
      </div>
    </>
  )
}

Goals.sections = [
  ['busca', 'Qué busca'], ['no-busca', 'Qué no busca'], ['entra', 'Qué entra'],
] as [string, string][]
