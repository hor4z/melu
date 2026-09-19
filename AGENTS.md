# AGENTS

## La regla

**El producto habla español. El código habla inglés.**

Si aparece en la pantalla de un docente o de un chico, va en español: consignas, títulos y
rúbricas de las actividades, etiquetas de la interfaz, textos de los lentes. Si lo lee un
programa, va en inglés: tablas, columnas, enums, identificadores, claves JSON, rutas,
nombres de archivo, assets y comentarios.

Los catálogos son el puente: **clave técnica en inglés, etiqueta en español**. Están en
`packages/web/src/lib/composition.ts` y `profile.ts`.

Una consecuencia práctica del monorepo: `npm install` se corre **desde la raíz**, nunca adentro
de un package. Adentro no sube al workspace y recrea un lockfile local.

## El glosario

El vocabulario del producto es deliberado: "aprendiz" y "guía" se eligieron para no decir
alumno y maestro. Los conceptos se piensan en español y el código usa una sola
traducción por concepto:

espacio→`space` · grupo→`group` · persona→`person` · aprendiz→`learner` · guía→`guide` ·
acompañante→`companion` · coordinador→`coordinator` · actividad→`activity` · receta→`recipe`
(una actividad global que sirve de plantilla) · lente→`lens` (el método que le da sus fases) ·
fase→`phase` · bloque→`block` · composición→`composition` · asignación→`assignment` ·
misión→`mission` (la asignación como la ve el aprendiz) · entrega→`submission` · hecho→`fact`
(la fila de la que salen las métricas) · señal→`signal` · panel→`dashboard` · perfil→`profile` ·
eje/polo→`axis`/`pole` · franja→`band` (`small`/`medium`/`large`)

## Estructura

```
packages/api     Go hexagonal: domain no importa nada, app usa port, adapter implementa port
packages/editor  el motor de bloques con el que se escribe una actividad. Cero dependencias
packages/web     React 19 + Tailwind + React Router. Se viste con @milo/ui
```

El front escribe su build en `packages/api/internal/web/dist` y el binario lo embebe: un solo
artefacto. La matemática del perfil vive en Go para que el número sea el mismo lo mire el
aprendiz o el guía.

**El motor de bloques sí es propio**, y es lo único que lo es: vive en `packages/editor`, no
depende de nada en runtime (ni ProseMirror, ni Lexical, ni una librería de arrastre) y se prueba
solo. `make editor` levanta su taller en :5175, que sí se viste con milo (una dependencia de
desarrollo: el motor sigue sin arrastrar ninguna). El core no sabe qué es un párrafo, todo lo que se
puede nombrar viene de un plugin, y un agente escribe por la misma puerta que un click. Todavía no
está integrado en `web`, a propósito. Antes de tocarlo:
[packages/editor/AGENTS.md](packages/editor/AGENTS.md).

**El design system es [`@milo/ui`](https://github.com/hor4z/milo)**, clavado a un tag
(`github:hor4z/milo#v0.1.0`). Es de afuera y no se edita desde acá: lo que cambia una pieza o un
token se cambia allá, sale un tag nuevo y acá se sube la versión. El repo es público, así que
`npm ci` lo instala sin secretos y lo compila en su `prepare`.

El CSS entra en `packages/web/src/index.css` y **el orden no es cosmético**, porque una capa vale
por dónde se la declara: primero `styles/layers.css`, que no tiene más que la lista
(`milo.reset, tw.base, milo.components, tw.utilities, melu.app`), después Tailwind, después
`@milo/ui/theme.css` y `@milo/ui/style.css`, y al final lo de la app.

Dos cosas que se heredaron de atto y no se vuelven a discutir: **el preflight de Tailwind no va**
(aun con las capas en orden les gana a los botones del sistema y los deja sin fondo, y milo ya
trae su reset), y **los nombres de token que los dos sistemas usan** (`--radius-*`,
`--duration-*`, `--font-weight-*`) **no se redeclaran en el `@theme`**: milo los declara sin capa
y gana siempre, así que `rounded-xl` ya mide 16 y `font-semibold` ya pesa 450.

Tailwind se queda para el layout y la coherencia, y su `@theme` apunta a los roles de milo con
`var()` en vez de copiarlos: la utilidad se llama como el rol (`text-text-muted`, `bg-surface`,
`border-border`) y la escala de texto son los siete roles del sistema (`text-meta`, `text-body`,
`text-reading`, `text-title`, `text-heading`, `text-display`), no `text-sm`.

Un hex escrito a mano es un bug: todo color sale de un rol. Lo sostiene
`node scripts/sin-rastros.mjs`, que además falla si vuelve un import, un nombre o un token del
kit viejo. Lo corren `make test` y la CI.

## Migraciones

`0001_init.sql` es el esquema y `0002_recipes.sql` el contenido de fábrica. Las tablas van en
plural porque `group` es palabra reservada en SQL.

Mientras no haya datos que perder, **el esquema se edita en el lugar** y se recrea la base:

```sh
docker exec melu-db psql -U melu -d postgres -c 'drop database melu' -c 'create database melu owner melu'
```

El día que haya datos que preservar esto se invierte: cada cambio pasa a ser una migración
nueva y estas dos no se tocan más.

## Correrlo

```sh
npm install              # una vez, desde la raíz: es un workspace
cp .env.example .env     # cargale las credenciales de Google: son obligatorias
make db                  # postgres en :5434
make dev                 # api en :8787 + front en :5173
make editor              # el taller del motor de bloques, en :5175
make test                # el guardián del design system y los tests del motor
```

## Lo que mira CI

`.github/workflows/ci.yml`, en cada push a `main` y en cada pull request. Corre los mismos
comandos que se corren en local, no otros: tipos, lint y tests del motor de bloques; el guardián
de "sin rastros"; lint y build del front (que incluye su `tsc -b`); `go vet` y `go build` de la
api. Si algo pasa en local y falla ahí,
la diferencia es el lockfile: CI instala con `npm ci`, que no improvisa.
