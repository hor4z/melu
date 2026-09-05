# melu · web

El front: React 19 + Tailwind (solo layout) + React Router, servido por Vite.
Los componentes y los tokens vienen de `@melu/ui`.

Las dependencias se instalan una sola vez desde la raíz del repo (`npm install`): es un
workspace, y adentro de un package `@melu/ui` no resuelve porque no está en ningún registry.

```sh
npm run dev      # :5173, proxea /api a http://localhost:8787
npm run build    # escribe en packages/api/internal/web/dist
npm run lint     # oxlint
```

`npm run build` no deja el resultado acá: lo escribe adentro del package `api`, que es
quien lo embebe en el binario. Es el único punto de contacto entre los dos packages.

```
src/screens     una pantalla por ruta
src/blocks      piezas grandes que arman pantallas
src/lib         api, sesión, perfil, composición
public          estático tal cual (voice, character, cards)
```

Los componentes y los tokens salen de `@melu/ui`; Tailwind lee esos tokens. Un hex escrito
a mano es un bug. El sistema se documenta solo: `make ui`, en :5174.
