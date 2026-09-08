# AGENTS · @melu/editor

Lo que hay que saber para tocar el motor. Cómo se usa está en [README.md](README.md), y las reglas
del repo en [../../AGENTS.md](../../AGENTS.md).

## Cómo está armado

```
core/       el motor. No sabe qué es un párrafo.
  text        el texto de un bloque: una lista de runs con su formato
  doc         el documento: un mapa plano de bloques con punteros
  schema      qué tipos existen y cómo se portan
  steps       la única forma en que cambia un documento, invertible y en JSON
  transaction todo lo que hace un gesto, junto
  commands    cada gesto, como una función con nombre
  history     deshacer, como el inverso de lo que se hizo
  plugins     el contrato de extensión
  editor      el objeto que junta todo y avisa qué cambió
  serialize   JSON, markdown y HTML, para adentro y para afuera
  agent       manifiesto, esquema del documento y lotes atómicos

plugins/    todo lo que se puede nombrar
  text        párrafo, títulos, listas, checklist, desplegable, cita, destacado, código, separador
  media       imagen, video, audio, archivo, link con tarjeta, incrustado
  layout      tabla, columnas, índice, reloj, fórmula
  activity    las once preguntas de la plataforma
  paste       cómo entra lo que viene de otro lado

react/      la vista. Un contenteditable por bloque.
ui/         lo que flota: asa, menú "/", barra de formato, caja de herramientas
```

## Las decisiones que importan

**Un `contenteditable` por bloque, y uno más envolviendo la página.** Es lo que hace Notion, y está
medido: su página tiene un editable por bloque y además un `div.whenContentEditable` con todos
adentro. El de afuera es el que cuenta, porque por spec una región editable es la que tiene un padre
no editable: un `contenteditable` adentro de otro no abre una región nueva. Así que abajo hay una
sola región, la superficie, y los de cada bloque quedan para declarar qué es texto y qué no.

De eso sale lo que hace que se sienta como Notion: **la selección nativa cruza de un bloque a otro**.
Arrastrar sobre tres párrafos pinta letra por letra, `Shift+↓` sale del bloque sin saltar a otra
cosa, y la barra de formato aparece sobre un rango que abarca cinco bloques. El modelo ya sabía
hacerlo (`spansBlocks`, `ordered`, y `deleteSelection` con su rama de "cruza bloques"); lo que no
sabía era la vista.

**Y el precio, que hay que pagarlo en un solo lugar:** el navegador ahora también puede *editar*
cruzando, moviendo nodos de un bloque a otro por atrás de React y del modelo. Eso se cancela en
`beforeinput`, sobre la superficie, y lo hace el motor con comandos. La regla es corta: el navegador
solo puede tocar el texto de adentro de un bloque, que es de donde salen los acentos con tecla
muerta, el dictado y el teclado del celular. Todo lo que cruce un borde, arme o rompa un bloque
(`insertParagraph`, un borrado parado en el borde, arrastrar texto y soltarlo en otro lado) es del
motor. Es la misma línea que traza Lexical, que tiene 2222 líneas de `LexicalEvents.ts` haciendo
exactamente esto.

**El foco es de la superficie, no de cada bloque,** y de ahí sale una consecuencia que sorprende:
enfocar el elemento de un bloque manda el foco al editable de arriba, así que **las teclas llegan
todas a `Surface`**. La capa de eventos vive ahí: el keymap, el `input` que lee de vuelta lo que se
escribió, la composición y el `blur`. `BlockText` quedó con lo suyo, que es dibujar los runs a mano y
poner el caret cuando el rango es de su bloque. Un rango que cruza lo pone la superficie, que ve las
dos puntas.

**Lo que no es texto se declara.** Adentro de una región editable, una viñeta, un checkbox, un asa o
un menú son contenido que el navegador cree suyo. Todos llevan `{...SKIP}` (`react/dom.ts`): el
`data-melu-skip` que ya miraba el motor para no leerlos como texto, más el `contenteditable=false`
que le dice al navegador que ahí no va el caret. Un control nuevo sin eso deja escribir adentro de
una viñeta.

**React no maneja los hijos de la región editable.** Dibuja el elemento y sus atributos y ahí para;
los runs de adentro se ponen a mano. No es preferencia, es obligación: React compara contra el árbol
que dibujó la última vez, y el navegador estuvo editando ese árbol por atrás, así que su idea de
"antes" es una ficción. Si se lo deja reconciliar, duplica texto. Está probado en
`react/BlockText.test.tsx`.

**Un paso es un dato JSON, determinista e invertible.** De ahí salen tres cosas: deshacer es el
inverso de lo que se hizo y no una copia del documento, un agente puede mandar pasos, y algún día
pueden viajar por un socket. La alternativa (guardar una copia por tecla) copiaría mil bloques para
recordar una letra.

**El documento es un mapa plano con punteros, no un árbol anidado.** Encontrar un bloque es O(1) y
reemplazar uno copia una entrada. Tipear en el bloque 900 de 1000 reescribe un objeto, así que la
vista se suscribe por bloque y repinta un párrafo por tecla.

**La suscripción es por bloque y está medida.** `core/editor.test.ts` afirma que una tecla toca un
solo bloque con 5 bloques y con 2000, y `react/hooks.test.tsx` cuenta los renders. Lo único O(n) del
motor es copiar el mapa al producir el documento nuevo: en una página de 3000 bloques una tecla
cuesta 0,79 ms y 0,73 son esa copia. Está explicado arriba de `setBlock`, con la salida que
corresponde el día que un documento crezca de verdad.

**Las asas viven en un canal reservado adentro de la superficie** (`--melu-rail`), y no afuera:
pintarlas afuera anda hasta que un ancestro tiene scroll, y ahí desaparecen. El bloque que señalan
se decide por la posición del puntero y no por lo que hay debajo, que es lo que evita que se borren
justo cuando uno va a clickearlas.

**Pegar un link no adivina.** Adivinar está mal en las dos direcciones: pegarlo sobre una oración no
puede meter un iframe en el medio de la frase, y pegarlo en un renglón vacío tampoco puede decidir
solo que lo que alguien quería era un reproductor. Así que el pegado hace lo menos destructivo (el
texto con su link) y un menú al lado ofrece el resto. Lo que se ofrece sale del reconocedor de
`media.ts`, así que una dirección de YouTube con lista y radio adentro igual ofrece el video con la
dirección que se puede incrustar.

**El markdown es a propósito con pérdida:** un color no tiene markdown, y la alternativa era
inventar un dialecto que nadie más puede leer. Un tipo que markdown no conoce se anuncia
(`**[choice]** ...`) y no se pierde el texto.

La fórmula no trae un renderizador de LaTeX, porque sería una dependencia grande. La plataforma le
inyecta uno por `view.math` y hasta entonces el bloque muestra la fuente, que es honesto y sigue
siendo editable.

## Agregar un bloque

Los plugins son complementarios al core, no una capa encima. El core no tiene un párrafo adentro:
sabe partir, pegar, mover, formatear y deshacer, y le pregunta al schema qué quiere cada tipo.

```ts
const sensores = (): Plugin => ({
  name: 'sensores',
  blocks: [{
    type: 'sensor',
    name: 'Sensor',
    hint: 'Una lectura de la placa',
    group: 'Robótica',
    icon: 'timer',
    content: 'text',
    props: { pin: { kind: 'number', default: 13, min: 0, max: 53, label: 'Pin' } },
  }],
  keys: [{ key: 'Mod-Alt-s', run: 'insertBlock', args: { type: 'sensor' }, label: 'Sensor' }],
  rules: [{ name: 'sensor', match: /^sensor $/, run: ({ ctx, id }) => setBlockType(ctx, { type: 'sensor', id }) }],
})

new Editor({ plugins: [...activityKit(), sensores()] })
```

Con eso ya aparece en el menú "/", en la caja de herramientas, en el manifiesto del agente, en el
menú de "convertir en", en el markdown y en el JSON. Nadie tuvo que tocar el core.

## La puerta del agente

No hay una segunda implementación para la máquina. Un agente manda los mismos comandos con nombre
que manda un click, y aprende cuáles existen leyendo un manifiesto generado de los mismos specs con
los que corre el editor. Cuando alguien agrega un bloque, el agente lo puede usar esa tarde.

```ts
import { manifest, brief, outline, apply, authorMarkdown } from '@melu/editor/core'

manifest(editor)   // qué existe: tipos, props con sus rangos y opciones, comandos, atajos
outline(editor)    // qué hay ahora, corto y con los ids, para poder apuntarle a un bloque
brief(editor)      // las dos cosas juntas, para un system prompt

apply(editor, [
  { do: 'markdown', args: { text: '# Medir el patio\n\nSalimos con la cinta.' } },
  { do: 'insertBlock', args: { type: 'number', text: [{ text: '¿Cuántos metros?' }], props: { answer: 12, tolerance: 0.5, unit: 'm' } } },
])
```

Un lote es todo o nada, y entra al historial como un solo deshacer: una actividad a medio escribir
por un modelo que se perdió es peor que una que no se escribió, y una sola vez de `Mod+Z` tiene que
llevarse todo. Las props se validan contra el spec, así que un ancho de cinco mil se recorta y un
valor que no está entre las opciones cae en el que corresponde en lugar de desaparecer. En solo
lectura `apply` no escribe.

## Los tests

449, y están escritos como se siente lo que prueban: "un ítem de lista vacío deja de ser lista" y
no "splitBlock con texto vacío". Cada archivo vive al lado del que prueba, y `src/test/` tiene el
andamio que comparten (un motor armado, una vista montada).

```
core/text         el modelo de texto: cortar, pegar, marcar, qué formato hereda lo que se escribe
core/doc          el mapa plano, el orden de lectura, el chequeo de consistencia
core/steps        que aplicar un paso y su inverso devuelva el documento exacto
core/schema       el registro, la búsqueda del menú, la validación de props
core/history      deshacer, y que escribir una palabra sea un solo deshacer
core/commands     el tacto: Enter, Backspace, Tab, borrar una selección que cruza bloques, formato
core/serialize    JSON, markdown y HTML, de ida y de vuelta
core/agent        el manifiesto, el esquema, que un lote sea atómico, y que en solo lectura no
                  escriba
core/editor       la transacción, los avisos, y que una tecla toque un bloque con 5 y con 2000
plugins/text      lo que se escribe sin abrir un menú, y lo que el normalizador arregla solo
plugins/layout    tabla y columnas
plugins/activity  los bloques de pregunta y sus props
plugins/media     las direcciones que rompían: un % suelto, un mapa sin parámetros
plugins/paste     el orden de los formatos, y que pegar prosa en el medio de una oración no la corte
react/renderers   que cada bloque se dibuje con su rol y sus atributos
react/BlockText   la costura con el DOM: los runs a mano, el caret, el foco
react/hooks       las suscripciones, y cuántos componentes se repintan por tecla
react/Surface     la superficie de punta a punta: teclas, copiar, pegar, selección de bloques
ui/SlashMenu      el menú "/", su filtro y lo que inserta
ui/FormatBar      la barra que aparece con la selección, y también sobre bloques
ui/Toolbox        la caja de herramientas y su arrastre
ui/BlockHandle    el asa: qué bloque señala, el más y el menú de mover
ui/PasteMenu      qué se ofrece al pegar una dirección
```

Lo que depende de geometría (dónde se ubica un menú, en qué renglón está el caret, el arrastre) no
entra en jsdom: eso se prueba en el taller, con el navegador.

## Integrarlo en la plataforma

No está integrado todavía, a propósito: el package es autónomo y la integración es un cambio en
`packages/web` que se hace aparte. Lo que hace falta:

1. `import '@melu/editor/editor.css'` una vez. Los colores del editor son tokens con fallback
   (`var(--text, #1b2624)`), así que montado adentro de la app toma el theme de melu solo.
2. En `screens/Editor.tsx`, reemplazar la lista de bloques por `<BlockEditor value={...}
   onChange={...} />`. El formato de `document.phases[].blocks` es el mismo árbol que
   `toJSON`/`docFromJSON`, con una diferencia: la plataforma tiene un tipo `heading` con nivel y acá
   son `heading_1/2/3`. La conversión son diez líneas y va en `web`, no acá.
3. Los bloques de pregunta se dibujan del lado del guía con lo que trae este package, y del lado del
   aprendiz con los componentes que ya existen en `web/src/blocks`. La corrección sigue en Go: el
   número tiene que ser el mismo lo mire el aprendiz o el guía.
