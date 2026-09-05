# melu

Espacios para aprender. Componé una actividad mezclando disciplinas y métodos, dásela a un grupo, y lo que los chicos hacen deja rastro desde el primer día.

## Correr en local

```sh
cp .env.example .env     # ya trae MELU_DEV_LOGIN=1: entrás con cualquier email
make db                  # postgres en :5434
make dev                 # api en :8787 + front en :5173
```

Abrí http://localhost:5173. Para login real con Google, cargá `MELU_GOOGLE_CLIENT_ID` y `MELU_GOOGLE_CLIENT_SECRET` en `.env`
(redirect URI: `http://localhost:8787/api/auth/google/callback`).

## Estructura

Monorepo con dos packages: el back (Go) y el front (React). Cada uno se para solo —
tiene su build, sus dependencias y sus reglas— y el único punto de contacto es el
directorio donde vite deja el build.

```
packages/api              Go · un módulo, hexagonal
  cmd/server               arma todo y arranca
  internal/domain          entidades y reglas — cero imports externos
  internal/app             casos de uso, orquesta domain a través de port
  internal/port            interfaces
  internal/adapter         postgres · http · google
  internal/web             embebe el build del front (dist/ no se versiona)
  migrations               SQL numerado, embebido, se aplica al arrancar

packages/web             React 19 + Astryx + Tailwind (solo layout) + React Router
  src/screens              una pantalla por ruta
  src/blocks               piezas grandes que arman pantallas
  src/kit                  componentes y tokens
  src/lib                  api, sesión, perfil

docs                       notas que no son de ninguno de los dos
```

Regla del back: `domain` no importa nada; `app` importa `domain` y `port`; `adapter`
implementa `port`. Las flechas van en una sola dirección.

Regla de estilos: Astryx manda en componentes y tokens; Tailwind lee los tokens de
Astryx vía `tailwind-theme.css`. Un hex escrito a mano es un bug.

Cómo se juntan: `npm run build` en el front escribe en
`packages/api/internal/web/dist`, y `go build` embebe ese directorio en el binario.
En desarrollo no hay embed: vite sirve en :5173 y proxea `/api` al back en :8787.
