import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Chip, Input, Text } from '@/ui'
import { api, type Grupo, type Sala } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'

const ESTADO = { null: ['Empezar', 'primary'], en_curso: ['Continuar', 'primary'], entregada: ['Ver', 'secondary'], corregida: ['Ver devolución', 'secondary'] } as const

export function Hoy() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['hoy'], queryFn: () => api.get<Sala[]>('/api/hoy') })
  const pendientes = q.data?.flatMap((s) => s.misiones).filter((m) => m.miEstado !== 'entregada' && m.miEstado !== 'corregida').length ?? 0
  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-lg bg-brand-subtle text-3xl">🎒</span>
        <div><h1 className="text-2xl font-semibold tracking-tight">Hoy</h1><Text variant="muted">{pendientes === 0 ? 'Nada pendiente. Bien.' : pendientes === 1 ? 'Tenés una misión pendiente.' : `Tenés ${pendientes} misiones pendientes.`}</Text></div>
      </header>

      {q.data?.map((s) => (
        <section key={s.grupo.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><h2 className="text-lg font-semibold">{s.grupo.nombre}</h2><Text size="xs" variant="muted">{s.grupo.aprendices} en el grupo</Text></div>
          {s.misiones.length === 0 && <div className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">Todavía no hay misiones en este grupo.</div>}
          <ul className="flex flex-col gap-3">
            {s.misiones.map((m, i) => { const [label, variant] = ESTADO[String(m.miEstado) as keyof typeof ESTADO]; return (
              <li key={m.id} className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-subtle text-lg font-semibold text-brand-text">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5"><span className="font-semibold">{m.titulo}</span><ChipsComposicion c={m.composicion} compacto /></div>
                <div className="flex items-center gap-3">
                  {m.miEstado === 'corregida' && <Chip variant="success" size="sm">Corregida</Chip>}
                  {m.miEstado === 'entregada' && <Chip size="sm">Entregada</Chip>}
                  <Button variant={variant} size="sm" onClick={() => nav(`/mision/${m.id}`)}>{label}</Button>
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
