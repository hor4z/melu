# @melu/editor

El motor con el que un guía escribe una actividad. Bloques, texto enriquecido, arrastre, y una
puerta para que un agente escriba por la misma que usa un click.

**Cero dependencias de runtime.** React es peer, y solo lo necesitan los componentes.

```sh
make editor      # el taller, en :5175
npm test -w @melu/editor
```

Por qué está armado así, cómo agregar un bloque y qué falta para integrarlo:
[AGENTS.md](AGENTS.md).

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

## Los bloques que vienen

| Grupo | Bloques |
| --- | --- |
| Básicos | Texto, Título 1/2/3, Lista, Lista numerada, Checklist, Desplegable, Cita, Destacado, Código, Separador |
| Medios | Imagen, Video, Audio, Archivo, Link con tarjeta, Incrustado |
| Estructura | Tabla, Columnas, Índice, Reloj, Fórmula |
| Preguntas | Opciones, Varias correctas, Número, Completar, Ordenar, Emparejar, Pregunta abierta, Evidencia, Autoreporte, Juego, Figura |

Todo lo de medios se redimensiona arrastrando y el ancho se guarda como porcentaje de la columna,
así que la misma actividad entra en un celular en el patio y en un proyector en el aula. Las
columnas se apilan solas en pantalla angosta.

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

Los atajos: `Mod+B/I/U/E`, `Mod+Shift+S` tachado, `Mod+Shift+H` resaltar, `Mod+Shift+C` limpiar,
`Mod+Alt+0..9` convertir el bloque, `Tab`/`Shift+Tab` anidar, `Mod+D` duplicar,
`Mod+Shift+↑/↓` mover, `Escape` seleccionar el bloque, `Mod+Z`/`Mod+Shift+Z` deshacer y rehacer.
La lista completa sale de `editor.keyBindings`, así que un panel de ayuda no se escribe a mano.

## Guardar y cargar

```ts
toJSON(editor.doc)        // [{ id, type, text, props, children }]
docFromJSON(blocks)
toMarkdown(editor.doc)    // lo que se le da a un modelo para reescribir
fromMarkdown(texto)       // lo que un modelo escribe sin que se lo enseñen
toHtml(editor.doc)        // exportar, imprimir, mandar por mail
fromHtml(html)            // pegar de cualquier página
```

## El taller

`make editor` levanta `:5175`. A la izquierda el editor y a la derecha lo que el motor está
pensando: el documento en JSON, el markdown, lo que ve un agente y los números de rendimiento. El
editor queda en `window.melu`, para preguntarle cosas desde la consola.
