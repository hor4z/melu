import { useLocation } from 'react-router'
import { Button, Icon } from '@milo/ui'
import { Logo } from '../brand/logo'

export function SignIn() {
  const { pathname, search } = useLocation()

  // A dónde iba la persona antes de que le pidiéramos entrar. Viaja al backend, que lo guarda
  // para la vuelta de Google y la trae acá en vez de dejar a todo el mundo en la portada.
  const next = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[1.15fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-border bg-canvas p-12 lg:flex">
        <Logo size="lg" />
        <div>
          <h1 className="max-w-xl text-balance text-display">Aprender deja huella.</h1>
          <p className="mt-6 max-w-md text-reading text-text-muted">
            Componé una actividad, dásela a un grupo y mirá qué pasa. Lo que los chicos hacen con las
            manos, en el barrio o en la pantalla queda registrado desde el primer día.
          </p>
        </div>
        <div className="grid h-56 place-items-center rounded-[var(--radius-2xl)] bg-surface-muted">
          <Icon name="school" size={96} className="icon-muted" weight={200} />
        </div>
      </section>

      <section className="grid place-items-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-heading">Entrar</h2>
            <p className="text-body text-text-muted">
              Con tu cuenta de Google, seas docente o estudiante. Es la misma puerta para todos.
            </p>
          </div>

          <Button size="lg" block variant="brand" onClick={() => { window.location.href = `/api/auth/google${next}` }}>
            Continuar con Google
          </Button>

          <p className="text-meta text-text-muted">
            Si tu docente ya te sumó a un grupo, vas a encontrarlo esperándote apenas entres.
          </p>
        </div>
      </section>
    </div>
  )
}
