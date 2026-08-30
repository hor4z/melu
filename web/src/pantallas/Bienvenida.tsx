import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { api, type Espacio, type Grupo, type Yo } from '../lib/api'
import { useSalir } from '../lib/sesion'

// Primera vez: todavía no sos nada. Elegís por dónde entrar.
export function Bienvenida({ yo }: { yo: Yo }) {
  const [puerta, setPuerta] = useState<'ensenio' | 'aprendo' | null>(null)
  const salir = useSalir()
  return (
    <div className="grid min-h-screen place-items-center bg-body p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-semibold">Hola, {yo.persona.Nombre.split(' ')[0]}</h1>
          <Text color="secondary">¿Qué venís a hacer?</Text>
        </div>
        {!puerta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Puerta titulo="Enseño" texto="Armo actividades y las doy a un grupo: mi aula, mi taller, mis alumnos particulares." onClick={() => setPuerta('ensenio')} />
            <Puerta titulo="Aprendo" texto="Tengo un código de mi docente y quiero ver mis misiones." onClick={() => setPuerta('aprendo')} />
          </div>
        )}
        {puerta === 'ensenio' && <CrearEspacio onVolver={() => setPuerta(null)} />}
        {puerta === 'aprendo' && <Unirme onVolver={() => setPuerta(null)} />}
        <div className="mt-8 text-center"><Button label={`Salir (${yo.persona.Email})`} variant="ghost" size="sm" onClick={salir} /></div>
      </div>
    </div>
  )
}

function Puerta({ titulo, texto, onClick }: { titulo: string; texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-xl border border-default bg-card p-6 text-left transition hover:border-accent-bg hover:bg-accent-muted focus-visible:outline-2">
      <span className="font-heading text-2xl font-semibold">{titulo}</span>
      <p className="mt-2 text-secondary">{texto}</p>
      <span className="mt-4 inline-block text-sm font-medium text-accent">Seguir →</span>
    </button>
  )
}

function CrearEspacio({ onVolver }: { onVolver: () => void }) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [grupo, setGrupo] = useState('')
  const [tipo, setTipo] = useState('personal')
  const crear = useMutation({
    mutationFn: async () => {
      const e = await api.post<Espacio>('/api/espacios', { nombre, tipo })
      if (grupo.trim()) await api.post<Grupo>('/api/grupos', { espacioId: e.id, nombre: grupo })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['yo'] }),
  })
  return (
    <form className="flex flex-col gap-5 rounded-xl border border-default bg-card p-6" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
      <div>
        <h2 className="font-heading text-2xl font-semibold">Tu espacio</h2>
        <Text color="secondary">Quien organiza: una escuela, un club, un centro de apoyo, o vos.</Text>
      </div>
      <TextInput label="Nombre del espacio" placeholder="Taller de los sábados" value={nombre} onChange={setNombre} isRequired hasAutoFocus />
      <fieldset className="flex flex-wrap gap-2">
        {[['personal', 'Personal'], ['apoyo', 'Apoyo / refuerzo'], ['club', 'Club / taller'], ['escuela', 'Escuela']].map(([v, l]) => (
          <label key={v} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${tipo === v ? 'border-accent-bg bg-accent-muted' : 'border-default'}`}>
            <input type="radio" className="sr-only" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} />{l}
          </label>
        ))}
      </fieldset>
      <TextInput label="Tu primer grupo" description="Podés crear más después." placeholder="Robótica 1" value={grupo} onChange={setGrupo} isOptional />
      {crear.isError && <Text size="sm" className="text-error">No se pudo crear. Probá de nuevo.</Text>}
      <div className="flex gap-2">
        <Button label="Crear y empezar" type="submit" variant="primary" isLoading={crear.isPending} />
        <Button label="Volver" variant="ghost" onClick={onVolver} />
      </div>
    </form>
  )
}

function Unirme({ onVolver }: { onVolver: () => void }) {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const unirme = useMutation({
    mutationFn: () => api.post<Grupo>('/api/unirme', { codigo: codigo.trim() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['yo'] }),
  })
  return (
    <form className="flex flex-col gap-5 rounded-xl border border-default bg-card p-6" onSubmit={(e) => { e.preventDefault(); unirme.mutate() }}>
      <div>
        <h2 className="font-heading text-2xl font-semibold">El código de tu grupo</h2>
        <Text color="secondary">Te lo da tu docente. Son seis letras y números.</Text>
      </div>
      <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código"
        className="w-full rounded-lg border border-default bg-surface px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] uppercase focus:border-accent-bg focus:outline-none" placeholder="ABC123" />
      {unirme.isError && <Text size="sm" className="text-error">Ese código no existe. Revisalo con tu docente.</Text>}
      <div className="flex gap-2">
        <Button label="Entrar al grupo" type="submit" variant="primary" isLoading={unirme.isPending} isDisabled={codigo.length < 6} />
        <Button label="Volver" variant="ghost" onClick={onVolver} />
      </div>
    </form>
  )
}
