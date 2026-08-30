import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Copy } from 'lucide-react'
import { Button, DoodleGrupo, DoodleSaluda, Icon, Input, Logo, Stepper, Text } from '@/kit'
import { api, type Actividad, type Espacio, type Grupo, type Invitacion, type Yo } from '../lib/api'
import { useSalir } from '../lib/sesion'
import { ChipsComposicion } from '../bloques/Chips'

// Primera vez: todavía no sos nada. Elegís por dónde entrar.
export function Bienvenida({ yo }: { yo: Yo }) {
  const [puerta, setPuerta] = useState<'ensenio' | 'aprendo' | null>(null)
  const salir = useSalir()
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between px-8 py-5"><Logo /><Button variant="ghost" size="sm" onClick={salir}>Salir ({yo.persona.Email})</Button></header>
      <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-6">
        {!puerta && (
          <>
            <div className="mb-10 text-center">
              <h1 className="font-display text-4xl font-semibold tracking-tight">Hola, {yo.persona.Nombre.split(' ')[0]}. ¿Qué venís a hacer?</h1>
              <Text variant="muted" className="mt-2">Elegí una puerta. Después podés ser las dos cosas.</Text>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Puerta ilustracion={<DoodleSaluda size={96} className="text-ink" />} tint="bg-teal" titulo="Enseño" texto="Armo actividades y las doy a un grupo: mi aula, mi taller, mis alumnos particulares. Veo cómo les va y qué les cuesta." onClick={() => setPuerta('ensenio')} />
              <Puerta ilustracion={<DoodleGrupo size={150} className="text-ink" />} tint="bg-yellow" titulo="Aprendo" texto="Mi docente me dio un código de seis letras. Quiero ver mis misiones y hacerlas." onClick={() => setPuerta('aprendo')} />
            </div>
          </>
        )}
        {puerta === 'ensenio' && <Onboarding onVolver={() => setPuerta(null)} />}
        {puerta === 'aprendo' && <Unirme onVolver={() => setPuerta(null)} />}
      </div>
    </div>
  )
}

function Puerta({ ilustracion, tint, titulo, texto, onClick }: { ilustracion: React.ReactNode; tint: string; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:shadow-[0_0_0_2px_var(--color-ink)] focus-visible:shadow-[0_0_0_2px_var(--color-ink)] focus-visible:outline-none">
      <div className={`grid h-40 place-items-center ${tint}`}>{ilustracion}</div>
      <div className="flex flex-1 flex-col gap-2 p-6"><span className="font-display text-2xl font-semibold">{titulo}</span><p className="text-sm text-ink-muted">{texto}</p><span className="mt-auto flex items-center gap-1 pt-2 text-sm font-semibold">Seguir <Icon icon={ArrowRight} size="sm" /></span></div>
    </button>
  )
}

// Onboarding del docente en tres pasos: espacio → grupo (con invitación) → primera actividad asignada.
function Onboarding({ onVolver }: { onVolver: () => void }) {
  const qc = useQueryClient()
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('personal')
  const [grupoNombre, setGrupoNombre] = useState('')
  const [espacio, setEspacio] = useState<Espacio | null>(null)
  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [inv, setInv] = useState<Invitacion | null>(null)
  const [copiado, setCopiado] = useState(false)
  const recetas = useQuery({ queryKey: ['actividades'], queryFn: () => api.get<{ recetas: Actividad[]; mias: Actividad[] }>('/api/actividades'), enabled: paso === 2 })

  const crear = useMutation({
    mutationFn: async () => {
      const e = await api.post<Espacio>('/api/espacios', { nombre, tipo })
      const g = await api.post<Grupo>('/api/grupos', { espacioId: e.id, nombre: grupoNombre || 'Mi primer grupo' })
      const i = await api.get<Invitacion>(`/api/grupos/${g.id}/invitacion`)
      return { e, g, i }
    },
    onSuccess: ({ e, g, i }) => { setEspacio(e); setGrupo(g); setInv(i); setPaso(1) },
  })
  const asignar = useMutation({
    mutationFn: async (recetaId: string) => { const a = await api.post<Actividad>('/api/actividades', { espacioId: espacio!.id, desdeReceta: recetaId }); await api.post(`/api/actividades/${a.id}/asignar`, { grupoId: grupo!.id }); return a },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['yo'] }),
  })
  const terminar = () => qc.invalidateQueries({ queryKey: ['yo'] })

  return (
    <div className="flex flex-col gap-6">
      <Stepper pasos={['Tu espacio', 'Invitá a los chicos', 'Primera actividad']} actual={paso} />

      {paso === 0 && (
        <form className="grid gap-6 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[1fr_260px]" onSubmit={(e) => { e.preventDefault(); crear.mutate() }}>
          <div className="flex flex-col gap-5">
            <div><h2 className="font-display text-2xl font-semibold">Tu espacio y tu primer grupo</h2><Text variant="muted">El espacio es quien organiza (vos, tu escuela, tu club). El grupo es la gente que aprende junta.</Text></div>
            <label className="flex flex-col gap-1 text-sm font-medium">Nombre del espacio<Input placeholder="Taller de los sábados" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus /></label>
            <fieldset className="flex flex-wrap gap-2">
              {[['personal', 'Soy yo'], ['apoyo', 'Apoyo / refuerzo'], ['club', 'Club / taller'], ['escuela', 'Escuela']].map(([v, l]) => (
                <label key={v} className={`cursor-pointer rounded-md border-2 px-3 py-1.5 text-sm font-medium ${tipo === v ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}><input type="radio" className="sr-only" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} />{l}</label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1 text-sm font-medium">Tu primer grupo<Input placeholder="4° A · Matemática" value={grupoNombre} onChange={(e) => setGrupoNombre(e.target.value)} required /></label>
            {crear.isError && <Text size="sm" variant="danger">No se pudo crear. Probá de nuevo.</Text>}
            <div className="flex gap-2"><Button type="submit" loading={crear.isPending}>Crear y seguir</Button><Button variant="ghost" onClick={onVolver}>Volver</Button></div>
          </div>
          <div className="rounded-xl bg-teal p-5 text-sm"><div className="font-semibold">Después vas a poder</div><ul className="mt-2 list-disc space-y-1 pl-4 text-ink-muted"><li>Crear más grupos y espacios.</li><li>Invitar a otros docentes a coeditar.</li><li>Cambiar todo esto.</li></ul></div>
        </form>
      )}

      {paso === 1 && inv && (
        <div className="grid gap-6 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[1fr_240px]">
          <div className="flex flex-col gap-5">
            <div><h2 className="font-display text-2xl font-semibold">Invitá a los chicos a «{grupo?.nombre}»</h2><Text variant="muted">Entran con Google y escriben este código, o escanean el QR. Sin registros, sin contraseñas.</Text></div>
            <div className="flex flex-wrap items-center gap-6 rounded-xl bg-yellow p-5">
              <div><div className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Código del grupo</div><div className="font-mono text-4xl font-semibold tracking-[0.3em]">{inv.codigo}</div></div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" startIcon={<Icon icon={copiado ? Check : Copy} />} onClick={() => { navigator.clipboard.writeText(inv.link).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500) }) }}>{copiado ? 'Copiado' : 'Copiar link'}</Button>
                <Text size="xs" variant="muted" mono>{inv.link}</Text>
              </div>
            </div>
            <div className="flex gap-2"><Button onClick={() => setPaso(2)}>Ya lo compartí, seguir</Button><Button variant="ghost" onClick={() => setPaso(2)}>Lo hago después</Button></div>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-line p-4"><img src={inv.qr} alt="QR para unirse" className="size-44" /><Text size="xs" variant="muted">Escanear con el celular</Text></div>
        </div>
      )}

      {paso === 2 && (
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
          <div><h2 className="font-display text-2xl font-semibold">Elegí una primera actividad</h2><Text variant="muted">Son recetas: combinaciones que funcionan. Se asigna al grupo ya mismo y la podés editar después como un documento.</Text></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recetas.data?.recetas.slice(0, 6).map((r) => (
              <button key={r.id} type="button" disabled={asignar.isPending} onClick={() => asignar.mutate(r.id)} className="flex flex-col gap-2 rounded-xl border border-line p-4 text-left transition hover:shadow-[0_0_0_2px_var(--color-ink)] disabled:opacity-60">
                <span className="font-semibold">{r.titulo}</span><ChipsComposicion c={r.composicion} compacto /><span className="line-clamp-2 text-xs text-ink-muted">{r.documento.fases[0]?.bloques.find((b) => b.tipo === 'parrafo')?.texto}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2"><Button variant="ghost" onClick={terminar}>Saltar, voy a Inicio</Button></div>
        </div>
      )}
    </div>
  )
}

function Unirme({ onVolver }: { onVolver: () => void }) {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const unirme = useMutation({ mutationFn: () => api.post<Grupo>('/api/unirme', { codigo: codigo.trim() }), onSuccess: () => qc.invalidateQueries({ queryKey: ['yo'] }) })
  return (
    <form className="mx-auto grid max-w-2xl gap-6 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-[1fr_200px]" onSubmit={(e) => { e.preventDefault(); unirme.mutate() }}>
      <div className="flex flex-col gap-5">
        <div><h2 className="font-display text-2xl font-semibold">El código de tu grupo</h2><Text variant="muted">Te lo da tu docente. Son seis letras y números, tipo <span className="font-mono font-semibold">DEMO4A</span>. Si te mandaron un link, con tocarlo alcanza.</Text></div>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} maxLength={6} autoFocus aria-label="Código" placeholder="ABC123"
          className="w-full rounded-lg border-2 border-line bg-surface px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] uppercase outline-none focus:border-ink" />
        {unirme.isError && <Text size="sm" variant="danger">Ese código no existe. Revisalo con tu docente.</Text>}
        <div className="flex gap-2"><Button type="submit" loading={unirme.isPending} disabled={codigo.length < 6}>Entrar al grupo</Button><Button variant="ghost" onClick={onVolver}>Volver</Button></div>
      </div>
      <div className="grid place-items-center rounded-xl bg-yellow"><DoodleGrupo size={170} className="text-ink" /></div>
    </form>
  )
}
