import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-accent-bg p-12 text-on-accent lg:flex">
        <span className="font-heading text-2xl font-bold">melu</span>
        <div className="max-w-md">
          <h1 className="font-heading text-5xl font-semibold leading-tight text-balance text-on-accent">Componé una actividad. Dásela a un grupo. Mirá qué pasa.</h1>
          <p className="mt-6 text-lg text-on-accent opacity-90">Puentes de espagueti, mapas del barrio, piezas impresas en 3D, cuentos con números. Lo que los chicos hacen deja rastro desde el primer día.</p>
        </div>
        <p className="text-sm text-on-accent opacity-70">Educabot · experimento</p>
      </section>

      <section className="grid place-items-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div>
            <h2 className="font-heading text-3xl font-semibold">Entrar</h2>
            <Text color="secondary">Con tu cuenta de Google. Si enseñás, después creás tu espacio. Si aprendés, ingresás el código de tu grupo.</Text>
          </div>

          {opciones.data?.google && (
            <Button label="Continuar con Google" variant="primary" size="lg" onClick={() => { window.location.href = '/api/auth/google' }} />
          )}

          {opciones.data?.dev && (
            <form className="flex flex-col gap-3 rounded-lg border border-dashed border-strong p-4" onSubmit={(e) => { e.preventDefault(); entrarDev() }}>
              <Text size="sm" color="secondary">Entrada de desarrollo: simula Google con cualquier email. Probá con dos cuentas distintas para ser docente y estudiante.</Text>
              <TextInput label="Email" type="email" value={email} onChange={setEmail} isRequired />
              <TextInput label="Nombre" value={nombre} onChange={setNombre} isOptional />
              {error && <Text size="sm" className="text-error">{error}</Text>}
              <Button label="Entrar" type="submit" variant={opciones.data.google ? 'secondary' : 'primary'} />
            </form>
          )}

          {opciones.data && !opciones.data.google && !opciones.data.dev && (
            <Text className="text-error">No hay ninguna forma de entrar configurada. Definí MELU_GOOGLE_CLIENT_ID o MELU_DEV_LOGIN=1.</Text>
          )}
        </div>
      </section>
    </div>
  )
}
