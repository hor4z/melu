# CLAUDE

Guía para agentes y para quien llega nuevo al repo.

## Dos idiomas, y dónde va cada uno

**El producto habla español. El código habla inglés.** No es una transición a medias: es la
regla, y se sostiene en los dos sentidos.

En **inglés** va todo lo técnico, sin excepción:

- nombres de tabla, columna y valor de enum en la base
- identificadores de Go y de TypeScript: tipos, campos, funciones, variables locales
- claves JSON del contrato de la API
- rutas de la API y del router del front
- nombres de archivo, de carpeta y de asset
- comentarios del código

En **español** va todo lo que lee una persona que usa melu:

- las consignas, títulos y rúbricas de las actividades (viven como datos, en las migraciones)
- las etiquetas de la interfaz y el copy de las pantallas
- el nombre, la descripción y el «pide» de cada lente
- los documentos del repo, este incluido

La prueba práctica: si aparece en la pantalla de un docente o de un chico, va en español.
Si lo lee un programa, va en inglés.

## El glosario

El vocabulario del producto es deliberado. «Aprendiz» y «guía» se eligieron para no decir
alumno y maestro; «espacio» para no decir escuela; «lente» para no decir metodología. Los
conceptos se piensan y se discuten con estas palabras. El código usa su representación en
inglés, una sola por concepto.

| Concepto | En el código | Qué es |
|---|---|---|
| espacio | `space` | dónde vive un grupo: una escuela, un club, un apoyo, algo personal |
| grupo | `group` | gente que aprende junta. Se entra con un código |
| persona | `person` | una cuenta. El rol depende del espacio, no de la persona |
| aprendiz | `learner` | quien hace las misiones |
| guía | `guide` | quien arma y asigna. En la UI se lo llama «docente» |
| acompañante | `companion` | familia o tutor que mira, no corrige |
| coordinador | `coordinator` | quien administra un espacio |
| actividad | `activity` | un documento con fases y bloques |
| receta | `recipe` | una actividad global que sirve de plantilla (`is_recipe`) |
| lente | `lens` | el método que recorre la actividad y le da sus fases (CPA, Polya, 5E…) |
| fase | `phase` | un tramo de la actividad, con su nombre y su «pide» |
| bloque | `block` | la unidad de la pantalla: un texto, una pregunta, un juego, una figura |
| composición | `composition` | los seis ejes que definen una actividad |
| asignación | `assignment` | una actividad congelada y dada a un grupo |
| misión | `mission` | la asignación tal como la ve el aprendiz |
| entrega | `submission` | lo que el aprendiz produjo: respuestas, pasos, puntajes |
| hecho | `fact` | una entrega con su contexto y sus tiempos; de acá salen las métricas |
| señal | `signal` | una regla simple sobre lo que pasó («se traba», «abandona») |
| panel | `dashboard` | lo que ve el guía al entrar |
| perfil | `profile` | cómo le entra el contenido a alguien: declarado + observado |
| eje / polo | `axis` / `pole` | las seis dimensiones del perfil y sus extremos |
| franja | `band` | por dónde anda: `small`, `medium`, `large` |

Los seis ejes de la composición y sus valores viven en `packages/web/src/lib/composition.ts`
(claves técnicas, etiquetas en español). Los del perfil, en `packages/web/src/lib/profile.ts`
y en `packages/api/internal/app/profile.go` — la matemática está en Go para que el número
sea el mismo lo mire el aprendiz o el guía.

## Estructura

Monorepo con dos packages. El único punto de contacto es el directorio donde vite deja el
build: `packages/web` lo escribe en `packages/api/internal/web/dist` y el binario lo embebe.

```
packages/api              Go, hexagonal
  internal/domain         entidades y reglas — cero imports externos
  internal/app            casos de uso; orquesta domain a través de port
  internal/port           interfaces
  internal/adapter        postgres · http · google
  migrations              0001 el esquema · 0002 las recetas · demo/ datos de ejemplo

packages/web              React 19 + Astryx + Tailwind (solo layout) + React Router
  src/screens             una pantalla por ruta
  src/blocks              piezas grandes que arman pantallas
  src/kit                 componentes y tokens
  src/lib                 api, sesión, perfil, composición
```

Regla del back: `domain` no importa nada; `app` importa `domain` y `port`; `adapter`
implementa `port`. Las flechas van en una sola dirección.

Regla de estilos: Astryx manda en componentes y tokens; Tailwind lee los tokens de Astryx.
Un hex escrito a mano es un bug. Ver `packages/web/.claude/CLAUDE.md`.

## Cómo correrlo

```sh
cp .env.example .env     # trae MELU_DEV_LOGIN=1: entrás con cualquier email
make db                  # postgres en :5434
make dev                 # api en :8787 + front en :5173
```

Las tablas están en plural porque `group` es palabra reservada en SQL.

Las migraciones se aplican solas al arrancar y `schema_migrations` las indexa por nombre de
archivo. Mientras melu no tenga una base que preservar, **el esquema se edita en el lugar**:
`0001_init.sql` es el esquema y `0002_recipes.sql` el contenido que viene de fábrica. Cambiar
una que ya corrió pide recrear la base:

```sh
docker exec melu-db psql -U melu -d postgres -c 'drop database melu' -c 'create database melu owner melu'
```

El día que haya datos que no se puedan perder, esto se invierte: a partir de ahí cada cambio
es una migración nueva y las dos primeras no se tocan más.
