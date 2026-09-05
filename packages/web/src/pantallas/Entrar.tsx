import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { Button, DoodleGrupo, DoodleSaluda, Input, Logo, Subrayado, Text } from '@/kit'
import { api, type AuthOpciones } from '../lib/api'

export function Entrar() {
  const qc = useQueryClient()
  const { codigo } = useParams()
  const opciones = useQuery({ queryKey: ['auth-opciones'], queryFn: () => api.get<AuthOpciones>('/api/auth/opciones') })
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const entrarDev = async () => {
    setError(null)
    try { await api.post('/api/auth/dev', { email }); await qc.invalidateQueries({ queryKey: ['yo'] }) }
    catch { setError('No se pudo entrar. Revisá el email.') }
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-canvas p-12 lg:flex">
        <Logo size="lg" />
        <div className="relative">
          <DoodleSaluda size={110} className="absolute -left-4 -top-28 text-ink" />
          <DoodleGrupo size={220} className="absolute -top-24 right-0 text-ink" />
          <h1 className="max-w-xl font-display text-[56px] font-semibold leading-[1.05] tracking-tight text-balance">Aprender deja <Subrayado>huella</Subrayado>.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">Componé una actividad, dásela a un grupo y mirá qué pasa. Lo que los chicos hacen con las manos, en el barrio o en la pantalla queda registrado desde el primer día.</p>
        </div>
        <div className="relative -mx-12 -mb-12 h-64 overflow-hidden"><img src="/ref/img_home_01.png" alt="" className="absolute bottom-0 left-0 w-[115%] max-w-none" /></div>
      </section>

      <section className="grid place-items-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="lg:hidden"><Logo /></div>
          {codigo && <div className="rounded-xl bg-yellow p-4 text-sm"><span className="font-semibold">Te invitaron a un grupo.</span> Entrá y te unimos automáticamente con el código <span className="font-mono font-bold tracking-widest">{codigo}</span>.</div>}
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">Entrar</h2>
            <Text variant="muted">Con tu cuenta de Google. Si enseñás, después creás tu espacio. Si aprendés, ingresás el código de tu grupo.</Text>
          </div>

          {opciones.data?.google && <Button size="lg" block onClick={() => { window.location.href = '/api/auth/google' }}>Continuar con Google</Button>}

          {opciones.data?.dev && (
            <form className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong bg-canvas p-4" onSubmit={(e) => { e.preventDefault(); entrarDev() }}>
              <Text size="sm" variant="muted">Entrada de desarrollo: simula Google con cualquier email. Probá con dos cuentas distintas para ser docente y estudiante.</Text>
              <label className="flex flex-col gap-1 text-sm font-medium">Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              {error && <Text size="sm" variant="danger">{error}</Text>}
              <Button type="submit" variant={opciones.data.google ? 'secondary' : 'primary'}>Entrar</Button>
            </form>
          )}
          {opciones.data && !opciones.data.google && !opciones.data.dev && <Text variant="danger">No hay ninguna forma de entrar configurada. Definí MELU_GOOGLE_CLIENT_ID o MELU_DEV_LOGIN=1.</Text>}
        </div>
      </section>
    </div>
  )
}
