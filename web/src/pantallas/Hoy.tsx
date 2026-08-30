import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { api, type Grupo, type Sala } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'

const ESTADO = { null: ['Empezar', 'primary'], en_curso: ['Continuar', 'primary'], entregada: ['Ver', 'secondary'], corregida: ['Ver devolución', 'secondary'] } as const

export function Hoy() {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['hoy'], queryFn: () => api.get<Sala[]>('/api/hoy') })
  const pendientes = q.data?.flatMap((s) => s.misiones).filter((m) => m.miEstado !== 'entregada' && m.miEstado !== 'corregida').length ?? 0
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-3xl font-semibold">Hoy</h1>
        <Text color="secondary">{pendientes === 0 ? 'Nada pendiente. Bien.' : pendientes === 1 ? 'Tenés una misión pendiente.' : `Tenés ${pendientes} misiones pendientes.`}</Text>
      </header>

      {q.data?.map((s) => (
        <section key={s.grupo.id} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-xl font-semibold">{s.grupo.nombre}</h2>
            <Text size="sm" color="secondary">{s.grupo.aprendices} en el grupo</Text>
          </div>
          {s.misiones.length === 0 && <div className="rounded-xl border border-dashed border-strong p-6 text-center text-secondary">Todavía no hay misiones en este grupo.</div>}
          <ul className="flex flex-col gap-3">
            {s.misiones.map((m) => {
              const [label, variant] = ESTADO[String(m.miEstado) as keyof typeof ESTADO]
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default bg-card p-4">
                  <div className="flex flex-col gap-2">
                    <span className="font-heading text-lg font-semibold">{m.titulo}</span>
                    <ChipsComposicion c={m.composicion} compacto />
                  </div>
                  <div className="flex items-center gap-3">
                    {m.miEstado === 'corregida' && <span className="rounded-full bg-success-muted px-2 py-0.5 text-xs text-success">Corregida</span>}
                    {m.miEstado === 'entregada' && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Entregada</span>}
                    <Button label={label} variant={variant} size="sm" onClick={() => nav(`/mision/${m.id}`)} />
                  </div>
                </li>
              )
            })}
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
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="self-start text-sm text-secondary hover:text-primary">+ Unirme a otro grupo con un código</button>
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); unirme.mutate() }}>
      <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123"
        className="rounded-lg border border-default bg-surface px-3 py-2 font-mono text-lg tracking-[0.3em] uppercase focus:border-accent-bg focus:outline-none" />
      <Button label="Unirme" type="submit" variant="primary" isLoading={unirme.isPending} isDisabled={codigo.length < 6} />
      <Button label="Cancelar" variant="ghost" onClick={() => setAbierto(false)} />
      {unirme.isError && <Text size="sm" className="text-error">Ese código no existe.</Text>}
    </form>
  )
}
