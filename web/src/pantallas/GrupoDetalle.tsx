import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, Copy, Printer, QrCode } from 'lucide-react'
import { Avatar, Button, Eyebrow, Icon, Tabs, Text } from '@/ui'
import { api, type GrupoDetalle as GD, type Invitacion } from '../lib/api'
import { ChipsComposicion } from '../bloques/Chips'
import { Modal, Vacio } from '../bloques/Modal'

export function GrupoDetalle() {
  const { id } = useParams()
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['grupo', id], queryFn: () => api.get<GD>(`/api/grupos/${id}/detalle`) })
  const [tab, setTab] = useState('misiones')
  const [invitar, setInvitar] = useState(false)
  if (!q.data) return null
  const { grupo: g, asignaciones, aprendices } = q.data
  const pendientes = asignaciones.reduce((n, a) => n + a.entregas, 0)

  return (
    <div className="flex flex-col gap-6">
      <Link to="/grupos" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Mis grupos</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Eyebrow>Grupo</Eyebrow><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{g.nombre}</h1><Text variant="muted">{aprendices.length} {aprendices.length === 1 ? 'aprendiz' : 'aprendices'} · {asignaciones.length} {asignaciones.length === 1 ? 'misión' : 'misiones'}{pendientes > 0 && ` · ${pendientes} entregas para mirar`}</Text></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => setInvitar(true)} startIcon={<Icon icon={QrCode} />}>Invitar</Button><Button onClick={() => nav('/actividades/nueva')}>Nueva actividad</Button></div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <Tabs.List>
          <Tabs.Trigger value="misiones">Misiones ({asignaciones.length})</Tabs.Trigger>
          <Tabs.Trigger value="aprendices">Aprendices ({aprendices.length})</Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      {tab === 'misiones' && (asignaciones.length === 0
        ? <Vacio titulo="Nada asignado todavía" texto="Elegí una plantilla o componé una actividad y asignala a este grupo. Los chicos la van a ver en «Hoy»." accion={<Button onClick={() => nav('/actividades/nueva')}>Nueva actividad</Button>} />
        : <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {asignaciones.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal font-bold text-brand-text">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5"><span className="font-semibold">{a.titulo}</span><ChipsComposicion c={a.composicion} compacto /></div>
                <div className="flex items-center gap-4">
                  <div className="w-32"><div className="mb-1 flex justify-between text-xs text-ink-muted"><span>Entregas</span><span className="tabular-nums">{a.entregas}/{a.entregasTotales}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand-text" style={{ width: `${a.entregasTotales ? (a.entregas / a.entregasTotales) * 100 : 0}%` }} /></div></div>
                  <Button size="sm" variant={a.entregas > 0 ? 'primary' : 'secondary'} onClick={() => nav(`/corregir/${a.id}`)}>Corregir</Button>
                </div>
              </li>
            ))}
          </ul>)}

      {tab === 'aprendices' && (aprendices.length === 0
        ? <Vacio titulo="Todavía nadie se unió" texto="Compartí el código o el QR con «Invitar». Entran con Google y listo." accion={<Button onClick={() => setInvitar(true)}>Invitar</Button>} />
        : <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{aprendices.map((a) => <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"><Avatar name={a.nombre} size="sm" />{a.nombre}</li>)}</ul>)}

      <Invitar abierto={invitar} onCerrar={() => setInvitar(false)} grupoId={g.id} />
    </div>
  )
}

function Invitar({ abierto, onCerrar, grupoId }: { abierto: boolean; onCerrar: () => void; grupoId: string }) {
  const q = useQuery({ queryKey: ['invitacion', grupoId], queryFn: () => api.get<Invitacion>(`/api/grupos/${grupoId}/invitacion`), enabled: abierto })
  const [copiado, setCopiado] = useState(false)
  const i = q.data
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} ancho={560} titulo="Invitar al grupo" descripcion="Los chicos entran con Google y escriben el código, o escanean el QR. Sin registro ni contraseñas."
      pie={<><Button variant="ghost" onClick={() => window.print()} startIcon={<Icon icon={Printer} />}>Imprimir tarjeta</Button><Button onClick={onCerrar}>Listo</Button></>}>
      {i && (
        <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-yellow p-5"><div className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Código</div><div className="font-mono text-4xl font-semibold tracking-[0.3em]">{i.codigo}</div></div>
            <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2"><span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-muted">{i.link}</span><Button size="sm" variant="ghost" startIcon={<Icon icon={copiado ? Check : Copy} />} onClick={() => navigator.clipboard.writeText(i.link).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500) })}>{copiado ? 'Copiado' : 'Copiar'}</Button></div>
          </div>
          <div className="flex flex-col items-center gap-2"><img src={i.qr} alt="QR para unirse" className="size-44 rounded-lg border border-line" /><Text size="xs" variant="muted">Escanear con el celular</Text></div>
        </div>
      )}
    </Modal>
  )
}
