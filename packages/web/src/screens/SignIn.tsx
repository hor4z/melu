import { useLocation } from 'react-router'
import { Button, DoodleGroup, Heading, Logo, Text } from '@melu/ui'

export function SignIn() {
  const { pathname, search } = useLocation()

  // Where the person was headed before we asked them to sign in. It travels to the backend,
  // which parks it for the round trip to Google and brings them back here instead of dropping
  // everyone on the home page.
  const next = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-canvas p-12 lg:flex">
        <Logo size="lg" />
        <div>
          <Heading level={1} size="display" className="max-w-xl text-balance lg:text-hero">Aprender deja huella.</Heading>
          <Text variant="muted" className="mt-6 max-w-md text-lg leading-relaxed">
            Componé una actividad, dásela a un grupo y mirá qué pasa. Lo que los chicos hacen con las
            manos, en el barrio o en la pantalla queda registrado desde el primer día.
          </Text>
        </div>

        <div className="grid h-56 place-items-center rounded-xl bg-teal">
          <DoodleGroup size={140} className="text-ink/70" />
        </div>
      </section>

      <section className="grid place-items-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <Heading level={2} size="2xl">Entrar</Heading>
            <Text variant="muted">
              Con tu cuenta de Google, seas docente o estudiante. Es la misma puerta para todos.
            </Text>
          </div>

          <Button size="lg" block onClick={() => { window.location.href = `/api/auth/google${next}` }}>
            Continuar con Google
          </Button>

          <Text size="sm" variant="subtle">
            Si tu docente ya te sumó a un grupo, vas a encontrarlo esperándote apenas entres.
          </Text>
        </div>
      </section>
    </div>
  )
}
