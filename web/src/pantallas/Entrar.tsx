import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
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
    try {
      await api.post('/api/auth/dev', { email, nombre })
      await qc.invalidateQueries({ queryKey: ['yo'] })
    } catch { setError('No se pudo entrar. Revisá el email.') }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-body p-6">
      <Card padding={6} maxWidth={420} width="100%">
        <div className="flex flex-col gap-5">
          <div>
            <Heading level={1}>melu</Heading>
            <Text color="secondary">Espacios para aprender. Componé una actividad, dásela a un grupo, mirá qué pasa.</Text>
          </div>

          {opciones.data?.google && (
            <Button label="Entrar con Google" variant="primary" onClick={() => { window.location.href = '/api/auth/google' }} />
          )}

          {opciones.data?.dev && (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); entrarDev() }}>
              <Text size="sm" color="secondary">Entrada de desarrollo — cualquier email sirve.</Text>
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
      </Card>
    </div>
  )
}
