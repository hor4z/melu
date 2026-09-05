# AGENTS

## La regla

**El producto habla español. El código habla inglés.**

Si aparece en la pantalla de un docente o de un chico, va en español: consignas, títulos y
rúbricas de las actividades, etiquetas de la interfaz, textos de los lentes. Si lo lee un
programa, va en inglés: tablas, columnas, enums, identificadores, claves JSON, rutas,
nombres de archivo, assets y comentarios.

Los catálogos son el puente: **clave técnica en inglés, etiqueta en español**. Están en
`packages/web/src/lib/composition.ts` y `profile.ts`.

## El glosario

El vocabulario del producto es deliberado —«aprendiz» y «guía» se eligieron para no decir
alumno y maestro— así que los conceptos se piensan en español y el código usa una sola
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
packages/api    Go hexagonal: domain no importa nada, app usa port, adapter implementa port
packages/web    React 19 + Astryx + Tailwind. Reglas de estilo en packages/web/.claude/CLAUDE.md
```

El front escribe su build en `packages/api/internal/web/dist` y el binario lo embebe: un solo
artefacto. La matemática del perfil vive en Go para que el número sea el mismo lo mire el
aprendiz o el guía.

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
cp .env.example .env     # trae MELU_DEV_LOGIN=1: entrás con cualquier email
make db                  # postgres en :5434
make dev                 # api en :8787 + front en :5173
```
