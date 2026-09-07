# @melu/editor

El motor con el que un guía escribe una actividad. Bloques, texto enriquecido, arrastre, y una
puerta para que un agente escriba por la misma que usa un click.

**Cero dependencias de runtime.** React es peer, y solo lo necesitan los componentes. El core no
importa nada: ni ProseMirror, ni Lexical, ni una librería de arrastre, ni una de posicionamiento,
ni un set de iconos.

```sh
make editor      # el taller, en :5175
npm test -w @melu/editor
```

## Las tres puertas

```tsx
// 1. todo armado, para el caso común
import { BlockEditor } from '@melu/editor'
import '@melu/editor/editor.css'

<BlockEditor value={actividad.document} onChange={(blocks) => guardar(blocks)} />
```

```tsx
// 2. la página, con tu propio marco alrededor
import { Surface, SlashMenu, BlockHandle, useNewEditor, activityKit } from '@melu/editor'

const editor = useNewEditor({ plugins: activityKit(), blocks })
<Surface editor={editor} renderers={misRenderizadores}>
  <BlockHandle />
  <SlashMenu />
  <MiPropiaBarra />
</Surface>
```

```ts
// 3. el motor solo, sin React y sin DOM: un script, el servidor, un test
import { Editor, toMarkdown, activityKit } from '@melu/editor/core'

const editor = new Editor({ plugins: activityKit(), blocks })
editor.run('insertBlock', { type: 'number', props: { answer: 12, unit: 'm' } })
console.log(toMarkdown(editor.doc))
```

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

**Un `contenteditable` por bloque, no uno para todo.** Es lo que hace Notion y no lo que hacen
ProseMirror o Lexical. El navegador se queda con lo que pasa adentro de un párrafo (los acentos con
tecla muerta, el teclado de un celular, el dictado, los métodos de entrada que componen varias
teclas en una letra) y el motor se queda con todo lo que cruza un borde de bloque. Un error solo
puede dañar un párrafo, porque es todo lo que el navegador alcanza.

Cuesta una cosa y hay que decirla: una selección nativa no puede cruzar dos regiones editables. Así
que arrastrar sobre varios párrafos no da una selección de texto, da bloques enteros seleccionados.
Eso es exactamente lo que hace Notion, y resulta que es lo que la gente espera.

**React no maneja los hijos de la región editable.** Dibuja el elemento y sus atributos y ahí para;
los runs de adentro se ponen a mano. No es preferencia, es obligación: React compara contra el árbol
que dibujó la última vez, y el navegador estuvo editando ese árbol por atrás, así que su idea de
"antes" es una ficción. Si se lo deja reconciliar, duplica texto. Está probado en `react.test.tsx`.

**Un paso es un dato JSON, determinista e invertible.** De ahí salen tres cosas: deshacer es el
inverso de lo que se hizo y no una copia del documento, un agente puede mandar pasos, y algún día
pueden viajar por un socket. La alternativa (guardar una copia por tecla) copiaría mil bloques para
recordar una letra.

**El documento es un mapa plano con punteros, no un árbol anidado.** Encontrar un bloque es O(1) y
reemplazar uno copia una entrada. Tipear en el bloque 900 de 1000 reescribe un objeto, así que la
vista se suscribe por bloque y repinta un párrafo por tecla.

**La suscripción es por bloque y está medida.** `perf.test.ts` afirma que una tecla toca un solo
bloque con 5 bloques y con 2000, y `react.test.tsx` cuenta los renders. Lo único O(n) del motor es
copiar el mapa al producir el documento nuevo: en una página de 3000 bloques una tecla cuesta
0,79 ms y 0,73 son esa copia. Está explicado arriba de `setBlock`, con la salida que corresponde el
día que un documento crezca de verdad.

**Los plugins son complementarios al core, no una capa encima.** El core no tiene un párrafo
adentro: sabe partir, pegar, mover, formatear y deshacer, y le pregunta al schema qué quiere cada
tipo. Agregar un bloque es un objeto:

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

## Los bloques que vienen

| Grupo | Bloques |
| --- | --- |
| Básicos | Texto, Título 1/2/3, Lista, Lista numerada, Checklist, Desplegable, Cita, Destacado, Código, Separador |
| Medios | Imagen, Video, Audio, Archivo, Link con tarjeta, Incrustado |
| Estructura | Tabla, Columnas, Índice, Reloj, Fórmula |
| Preguntas | Opciones, Varias correctas, Número, Completar, Ordenar, Emparejar, Pregunta abierta, Evidencia, Autoreporte, Juego, Figura |

Todo lo de medios se redimensiona arrastrando, y el ancho se guarda como porcentaje de la columna:
la misma actividad entra en un celular en el patio y en un proyector en el aula sin que nadie
redimensione dos veces. Las columnas se apilan solas en pantalla angosta. Un incrustado reconoce
YouTube, Vimeo, GeoGebra, Scratch, Desmos, Google Maps y Genially, y agregar otro es una fila en una
tabla de `media.ts`.

La fórmula no trae un renderizador de LaTeX, porque sería una dependencia grande. La plataforma le
inyecta uno por `view.math` y hasta entonces el bloque muestra la fuente, que es honesto y sigue
siendo editable.

## Lo que se escribe sin abrir un menú

| Se teclea | Aparece |
| --- | --- |
| `# ` `## ` `### ` | Los tres títulos |
| `- ` `* ` `+ ` | Lista |
| `1. ` | Lista numerada |
| `[] ` | Checklist |
| `> ` | Desplegable |
| `\| ` | Cita |
| `!! ` | Destacado |
| ` ``` ` + lenguaje | Código |
| `--- ` | Separador |
| `**negrita**` `*cursiva*` `` `código` `` `~~tachado~~` `==resaltado==` | El formato, y se come la puntuación |
| una dirección + espacio | Link, o el bloque de medios que corresponda |
| `/` | El menú de bloques |

Al costado de cada bloque están el más y el agarre, a la altura de su primer renglón. Aparecen al
pasar el puntero y también acompañan al caret, así que están a mano mientras alguien escribe. Viven
en un canal reservado adentro de la superficie (`--melu-rail`), y no afuera: pintarlos afuera anda
hasta que un ancestro tiene scroll, y ahí desaparecen. El bloque que señalan se decide por la
posición del puntero y no por lo que hay debajo, que es lo que evita que se borren justo cuando uno
va a clickearlos.

**Pegar un link no adivina.** Adivinar está mal en las dos direcciones: pegarlo sobre una oración no
puede meter un iframe en el medio de la frase, y pegarlo en un renglón vacío tampoco puede decidir
solo que lo que alguien quería era un reproductor. Así que el pegado hace lo menos destructivo (el
texto con su link) y un menú al lado ofrece el resto: el video, la tarjeta con miniatura, o dejarlo
como link. Seguir escribiendo lo cierra. Lo que se ofrece sale del reconocedor de `media.ts`, así
que una dirección de YouTube con lista y radio adentro igual ofrece el video con la dirección que
se puede incrustar.

Los atajos: `Mod+B/I/U/E`, `Mod+Shift+S` tachado, `Mod+Shift+H` resaltar, `Mod+Shift+C` limpiar,
`Mod+Alt+0..9` convertir el bloque, `Tab`/`Shift+Tab` anidar, `Mod+D` duplicar,
`Mod+Shift+↑/↓` mover, `Escape` seleccionar el bloque, `Mod+Z`/`Mod+Shift+Z` deshacer y rehacer.
La lista completa sale de `editor.keyBindings`, así que un panel de ayuda no se escribe a mano.

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
valor que no está entre las opciones cae en el que corresponde en lugar de desaparecer.

## Guardar y cargar

El documento viaja como el árbol que ya guarda la plataforma:

```ts
toJSON(editor.doc)        // [{ id, type, text, props, children }]
docFromJSON(blocks)
toMarkdown(editor.doc)    // lo que se le da a un modelo para reescribir
fromMarkdown(texto)       // lo que un modelo escribe sin que se lo enseñen
toHtml(editor.doc)        // exportar, imprimir, mandar por mail
fromHtml(html)            // pegar de cualquier página
```

El markdown es a propósito con pérdida: un color no tiene markdown, y la alternativa era inventar un
dialecto que nadie más puede leer. Un tipo que markdown no conoce se anuncia (`**[choice]** ...`) y
no se pierde el texto.

## Los tests

418, y están escritos como se siente lo que prueban: "un ítem de lista vacío deja de ser lista" y no
"splitBlock con texto vacío". Once archivos:

```
text          el modelo de texto: cortar, pegar, marcar, qué formato hereda lo que se escribe
doc           el mapa plano, el orden de lectura, el chequeo de consistencia
steps         que aplicar un paso y su inverso devuelva el documento exacto
commands      el tacto: Enter, Backspace, Tab, borrar una selección que cruza bloques
marks         formato, incluso sobre varios bloques
history       deshacer, y que escribir una palabra sea un solo deshacer
schema        el registro, la búsqueda del menú, la validación de props
rules         lo que se escribe sin abrir un menú, y lo que el normalizador arregla solo
serialize     JSON, markdown y HTML, de ida y de vuelta
paste         el orden de los formatos, que pegar prosa en el medio de una oración no la corte, y
              qué ofrece el menú al pegar una dirección
agent         el manifiesto, el esquema y que un lote sea atómico
perf          que una tecla toque un bloque con 5 y con 2000, contando y no cronometrando
react         la costura con el DOM, cuántos componentes se repintan por tecla, el asa y el menú
              de pegado, de punta a punta
```

Lo que depende de geometría (dónde se ubica un menú, en qué renglón está el caret, el arrastre) no
entra en jsdom: eso se prueba en el taller, con el navegador.

## El taller

`make editor` levanta `:5175`. A la izquierda el editor y a la derecha lo que el motor está
pensando: el documento en JSON, el markdown, lo que ve un agente y los números de rendimiento. La
mayoría de los errores de un editor se ven mucho antes en el modelo que en la pantalla. El editor
queda en `window.melu`, para poder preguntarle cosas desde la consola.

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
