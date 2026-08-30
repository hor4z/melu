import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Button, Chip, DoodleGrupo, Eyebrow, Icon, Input, ProgressRing, Text } from '@/ui'
import { api, type Asignacion, type Grupo, type Sala, type Yo } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'
import { Portada } from '../bloques/Portada'

const ESTADO = { null: ['Empezar', 'primary'], en_curso: ['Continuar', 'primary'], entregada: ['Ver', 'ghost'], corregida: ['Ver devolución', 'secondary'] } as const

export function Hoy({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['hoy'], queryFn: () => api.get<Sala[]>('/api/hoy') })
  const todas = q.data?.flatMap((s) => s.misiones) ?? []
  const pendientes = todas.filter((m) => m.miEstado !== 'entregada' && m.miEstado !== 'corregida')
  const hechas = todas.length - pendientes.length
  const proxima: Asignacion | undefined = pendientes.find((m) => m.miEstado === 'en_curso') ?? pendientes[0]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div><Eyebrow>Hoy</Eyebrow><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Hola, {yo.persona.Nombre.split(' ')[0]}</h1><Text variant="muted">{pendientes.length === 0 ? 'Nada pendiente. Bien hecho.' : pendientes.length === 1 ? 'Tenés una misión pendiente.' : `Tenés ${pendientes.length} misiones pendientes.`}</Text></div>
        {todas.length > 0 && <ProgressRing value={hechas / todas.length} size={64}>{hechas}/{todas.length}</ProgressRing>}
      </header>

      {proxima && (
        <section className="grid overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-[220px_1fr]">
          <Portada titulo={proxima.titulo} className="h-40 sm:h-auto" size={110} />
          <div className="flex flex-col gap-3 p-6">
            <Eyebrow>{proxima.miEstado === 'en_curso' ? 'Seguí donde estabas' : 'Empezá por acá'}</Eyebrow>
            <h2 className="font-display text-2xl font-semibold">{proxima.titulo}</h2>
            <ChipsComposicion c={proxima.composicion} compacto />
            <Text size="sm" variant="muted">{proxima.grupoNombre}. Se guarda solo mientras trabajás: podés parar y volver.</Text>
            <div className="mt-auto pt-2"><Button onClick={() => nav(`/mision/${proxima.id}`)} startIcon={<Icon icon={ArrowRight} />}>{proxima.miEstado === 'en_curso' ? 'Continuar' : 'Empezar'}</Button></div>
          </div>
        </section>
      )}

      {q.data?.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong p-10 text-center"><DoodleGrupo size={180} className="text-ink" /><div><div className="font-semibold">Todavía no estás en ningún grupo</div><Text variant="muted">Pedile el código a tu docente y escribilo acá abajo.</Text></div></div>
      )}

      {q.data?.map((s) => (
        <section key={s.grupo.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">{s.grupo.nombre}</h2><Text size="xs" variant="muted">{s.grupo.aprendices} en el grupo</Text></div>
          {s.misiones.length === 0 && <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">Todavía no hay misiones en este grupo.</div>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.misiones.map((m) => { const [label, variant] = ESTADO[String(m.miEstado) as keyof typeof ESTADO]; return (
              <li key={m.id} className="flex overflow-hidden rounded-xl border border-line bg-surface">
                <Portada titulo={m.titulo} className="w-24 shrink-0" size={52} />
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2"><span className="font-semibold leading-snug">{m.titulo}</span>{m.miEstado === 'corregida' && <Chip variant="success" size="sm">Corregida</Chip>}{m.miEstado === 'entregada' && <Chip size="sm">Entregada</Chip>}</div>
                  <ChipsComposicion c={m.composicion} compacto />
                  <div className="mt-auto pt-1"><Button variant={variant} size="sm" onClick={() => nav(`/mision/${m.id}`)}>{label}</Button></div>
                </div>
              </li>
            )})}
          </ul>
        </section>
      ))}
      <OtroGrupo />
    </div>
  )
}

function OtroGrupo() {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [abierto, setAbierto] = useState(false)
  const unirme = useMutation({ mutationFn: () => api.post<Grupo>('/api/unirme', { codigo }), onSuccess: () => { setCodigo(''); setAbierto(false); qc.invalidateQueries({ queryKey: ['hoy'] }) } })
  if (!abierto) return <Button variant="ghost" size="sm" className="self-start" onClick={() => setAbierto(true)}>+ Unirme a otro grupo con un código</Button>
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); unirme.mutate() }}>
      <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123" className="w-40 font-mono uppercase" />
      <Button type="submit" loading={unirme.isPending} disabled={codigo.length < 6}>Unirme</Button>
      <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
      {unirme.isError && <Text size="sm" variant="danger">Ese código no existe.</Text>}
    </form>
  )
}
