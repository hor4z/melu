# melu · web

El front: React 19 + Astryx + Tailwind (solo layout) + React Router, servido por Vite.

```sh
npm install
npm run dev      # :5173, proxea /api a http://localhost:8787
npm run build    # escribe en packages/api/internal/web/dist
npm run lint     # oxlint
```

`npm run build` no deja el resultado acá: lo escribe adentro del package `api`, que es
quien lo embebe en el binario. Es el único punto de contacto entre los dos packages.

```
src/screens     una pantalla por ruta
src/blocks      piezas grandes que arman pantallas
src/kit         componentes y tokens
src/lib         api, sesión, perfil, composición
public          estático tal cual (voice, character, cards)
```

Astryx manda en componentes y tokens; Tailwind lee los tokens de Astryx vía
`tailwind-theme.css`. Un hex escrito a mano es un bug — ver `.claude/CLAUDE.md`.
