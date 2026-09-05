# melu · ui

El design system: los componentes, los tokens y el sitio que los documenta.

```sh
npm run dev      # el sitio, en :5174 — o `make ui` desde la raíz
npm run typecheck
npm run lint
```

## Cómo se consume

Dos entradas, ni una más:

```ts
import '@melu/ui/theme.css'                  // una vez, en el entry de la app
import { Button, Card, Field } from '@melu/ui'
```

Sin subrutas a propósito: mover un componente de archivo nunca rompe a quien lo usa.

Se consume como **fuente**, sin build. Vite come el TSX directo y el `tsc -b` de `web`
type-chequea estos archivos de paso: romper un componente acá hace fallar el build de la app.

```
src/            los componentes, planos, uno por archivo
  brand/        el logo, el subrayado y los doodles
  charts/       sparkline, anillo de progreso, contador
  tokens/       primitivos · semánticos · escalas
  theme.css     los tokens + el @theme de Tailwind + base + animaciones
docs/           el sitio: seis páginas y su marco
```

## Dos cosas que hay que saber antes de tocar el CSS

**El `@source` de `theme.css` no es decorativo.** Tailwind v4 arranca el escaneo automático en
el root de Vite, no en el directorio del CSS. Sin esa línea, las clases que solo usan los
componentes de este package no se generan cuando compila `web` — y falla en silencio: compila,
arranca, y se ve sin estilo.

**El `inline` de `@theme inline` tampoco.** `--color-ink` existe en las dos capas con valores
distintos: `#222f2d` como primitivo y `var(--text)` como semántico. Con `inline`, `text-ink`
emite `var(--text)`. Sin él emitiría el primitivo, salteándose la capa semántica sin que nadie
lo note, porque hoy coinciden en color.

La forma de verificar un cambio de CSS es comparar el bundle emitido por `npm run build -w @melu/web`
antes y después: la salida de Tailwind es determinista dado el mismo contenido y el mismo theme.

## Qué entra acá y qué no

Tres preguntas, en `/goals` del sitio: si se usa en un solo lugar, si sus props hablan de
espacios o misiones, o si trae texto propio en pantalla, entonces es producto y vive en
`packages/web/src/blocks/`.
