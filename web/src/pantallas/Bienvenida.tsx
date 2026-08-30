import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Button, Icon, Input, Text } from '@/ui'
import { api, type Espacio, type Grupo, type Yo } from '../lib/api'
import { useSalir } from '../lib/sesion'

export function Bienvenida({ yo }: { yo: Yo }) {
  const [puerta, setPuerta] = useState<'ensenio' | 'aprendo' | null>(null)
  const salir = useSalir()
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Hola, {yo.persona.Nombre.split(' ')[0]}</h1>
          <Text variant="muted">¿Qué venís a hacer?</Text>
        </div>
        {!puerta && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Puerta emoji="🧑‍🏫" tint="bg-brand-subtle" titulo="Enseño" texto="Armo actividades y las doy a un grupo: mi aula, mi taller, mis alumnos particulares." onClick={() => setPuerta('ensenio')} />
            <Puerta emoji="🎒" tint="bg-yellow" titulo="Aprendo" texto="Tengo un código de mi docente y quiero ver mis misiones." onClick={() => setPuerta('aprendo')} />
          </div>
        )}
        {puerta === 'ensenio' && <CrearEspacio onVolver={() => setPuerta(null)} />}
        {puerta === 'aprendo' && <Unirme onVolver={() => setPuerta(null)} />}
        <div className="mt-8 text-center"><Button variant="ghost" size="sm" onClick={salir}>Salir ({yo.persona.Email})</Button></div>
      </div>
    </div>
  )
}

function Puerta({ emoji, tint, titulo, texto, onClick }: { emoji: string; tint: string; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 text-left transition hover:border-line-strong hover:shadow-md focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none">
      <span className={`grid size-14 place-items-center rounded-lg text-3xl ${tint}`}>{emoji}</span>
      <div><span className="text-xl font-semibold">{titulo}</span><p className="mt-1 text-sm text-ink-muted">{texto}</p></div>
      <span className="mt-auto flex items-center gap-1 text-sm font-medium text-brand-text">Seguir <Icon icon={ArrowRight} size="sm" /></span>
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
    <form className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
      <div><h2 className="text-xl font-semibold">Tu espacio</h2><Text variant="muted">Quien organiza: una escuela, un club, un centro de apoyo, o vos.</Text></div>
      <label className="flex flex-col gap-1 text-sm font-medium">Nombre del espacio<Input placeholder="Taller de los sábados" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus /></label>
      <fieldset className="flex flex-wrap gap-2">
        {[['personal', 'Personal'], ['apoyo', 'Apoyo / refuerzo'], ['club', 'Club / taller'], ['escuela', 'Escuela']].map(([v, l]) => (
          <label key={v} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${tipo === v ? 'border-brand bg-brand-subtle font-medium text-brand-text' : 'border-line hover:bg-hover'}`}>
            <input type="radio" className="sr-only" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} />{l}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm font-medium">Tu primer grupo <span className="font-normal text-ink-subtle">(podés crear más después)</span><Input placeholder="Robótica 1" value={grupo} onChange={(e) => setGrupo(e.target.value)} /></label>
      {crear.isError && <Text size="sm" variant="danger">No se pudo crear. Probá de nuevo.</Text>}
      <div className="flex gap-2"><Button type="submit" loading={crear.isPending}>Crear y empezar</Button><Button variant="ghost" onClick={onVolver}>Volver</Button></div>
    </form>
  )
}

function Unirme({ onVolver }: { onVolver: () => void }) {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const unirme = useMutation({ mutationFn: () => api.post<Grupo>('/api/unirme', { codigo: codigo.trim() }), onSuccess: () => qc.invalidateQueries({ queryKey: ['yo'] }) })
  return (
    <form className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6" onSubmit={(e) => { e.preventDefault(); unirme.mutate() }}>
      <div><h2 className="text-xl font-semibold">El código de tu grupo</h2><Text variant="muted">Te lo da tu docente. Son seis letras y números.</Text></div>
      <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123"
        className="w-full rounded-md border border-line bg-surface px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] uppercase outline-none focus:border-brand focus:ring-3 focus:ring-brand/25" />
      {unirme.isError && <Text size="sm" variant="danger">Ese código no existe. Revisalo con tu docente.</Text>}
      <div className="flex gap-2"><Button type="submit" loading={unirme.isPending} disabled={codigo.length < 6}>Entrar al grupo</Button><Button variant="ghost" onClick={onVolver}>Volver</Button></div>
    </form>
  )
}
