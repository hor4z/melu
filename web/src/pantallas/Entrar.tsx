import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Text } from '@/ui'
import { api, type AuthOpciones } from '../lib/api'

export function Entrar() {
  const qc = useQueryClient()
  const opciones = useQuery({ queryKey: ['auth-opciones'], queryFn: () => api.get<AuthOpciones>('/api/auth/opciones') })
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)

  const entrarDev = async () => {
    setError(null)
    try { await api.post('/api/auth/dev', { email, nombre }); await qc.invalidateQueries({ queryKey: ['yo'] }) }
    catch { setError('No se pudo entrar. Revisá el email.') }
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-teal p-12 lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold"><span className="grid size-8 place-items-center rounded-md bg-brand text-on-brand">m</span> melu</div>
        <div className="max-w-lg">
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-balance">Aprender deja <span className="squiggle">huella</span>.</h1>
          <p className="mt-5 max-w-md text-lg text-ink-muted">Componé una actividad, dásela a un grupo, mirá qué pasa. Puentes de espagueti, mapas del barrio, piezas impresas en 3D, cuentos con números.</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[['🍝', 'bg-yellow', 'Puente de espagueti'], ['🧭', 'bg-blue', 'Cartógrafos del barrio'], ['🖨️', 'bg-lilac', 'Una pieza para alguien'], ['🍳', 'bg-orange', 'Fracciones en la cocina']].map(([e, t, n]) => (
            <div key={n} className={`flex flex-col gap-3 rounded-lg ${t} p-4`}><span className="text-3xl">{e}</span><span className="text-xs font-medium leading-snug">{n}</span></div>
          ))}
        </div>
      </section>

      <section className="grid place-items-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 text-lg font-semibold lg:hidden"><span className="grid size-8 place-items-center rounded-md bg-brand text-on-brand">m</span> melu</div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
            <Text variant="muted">Con tu cuenta de Google. Si enseñás, después creás tu espacio. Si aprendés, ingresás el código de tu grupo.</Text>
          </div>

          {opciones.data?.google && (
            <Button size="lg" block onClick={() => { window.location.href = '/api/auth/google' }}>Continuar con Google</Button>
          )}

          {opciones.data?.dev && (
            <form className="flex flex-col gap-3 rounded-lg border border-dashed border-line-strong bg-muted p-4" onSubmit={(e) => { e.preventDefault(); entrarDev() }}>
              <Text size="sm" variant="muted">Entrada de desarrollo: simula Google con cualquier email. Probá con dos cuentas distintas para ser docente y estudiante.</Text>
              <label className="flex flex-col gap-1 text-sm font-medium">Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label className="flex flex-col gap-1 text-sm font-medium">Nombre <span className="font-normal text-ink-subtle">(opcional)</span><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
              {error && <Text size="sm" variant="danger">{error}</Text>}
              <Button type="submit" variant={opciones.data.google ? 'secondary' : 'primary'}>Entrar</Button>
            </form>
          )}

          {opciones.data && !opciones.data.google && !opciones.data.dev && (
            <Text variant="danger">No hay ninguna forma de entrar configurada. Definí MELU_GOOGLE_CLIENT_ID o MELU_DEV_LOGIN=1.</Text>
          )}
        </div>
      </section>
    </div>
  )
}
