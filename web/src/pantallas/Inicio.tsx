import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Clock, Inbox, Layers, Sparkles, Target, TrendingDown, UserPlus, Users, Zap } from 'lucide-react'
import { Avatar, Button, Chip, DoodleFoco, Eyebrow, Icon, StatTile, Text } from '@/kit'
import { api, type Panel, type Yo } from '../lib/api'
import { EXPERIENCIAS } from '../lib/composicion'

const TIPO = {
  abandono: { icon: Clock, tint: 'bg-yellow', label: 'Sin terminar' },
  errores: { icon: AlertTriangle, tint: 'bg-orange', label: 'Se traba' },
  lento: { icon: TrendingDown, tint: 'bg-blue', label: 'Le lleva más' },
  brilla: { icon: Zap, tint: 'bg-green', label: 'Vuela' },
} as const

export function Inicio({ yo }: { yo: Yo }) {
  const nav = useNavigate()
  const q = useQuery({ queryKey: ['panel'], queryFn: () => api.get<Panel>('/api/panel') })
  const p = q.data
  if (!p) return null
  const senales = p.senales ?? []
  const porTipo = p.porTipo ?? []
  const recientes = p.entregasRecientes ?? []
  const serie = p.serieSemana ?? []
  const pasos: [string, string, string, string][] = [
    ['grupo', 'Creá un grupo', 'Un aula, un taller, tres alumnos: gente que aprende junta.', '/grupos'],
    ['invitar', 'Invitá a los chicos', 'Compartí el código o el QR del grupo. Entran con Google.', '/grupos'],
    ['actividad', 'Armá una actividad', 'Empezá desde una receta y editala como un documento.', '/actividades/nueva'],
    ['asignar', 'Asignala al grupo', 'Los chicos la ven en «Hoy» y la hacen a su ritmo.', '/actividades'],
    ['corregir', 'Mirá la primera entrega', 'La rúbrica es una botonera: dos minutos por entrega.', '/grupos'],
  ]
  const hechos = pasos.filter(([k]) => p.checklist[k]).length
  const primeraVez = hechos < pasos.length
  const maxSerie = Math.max(1, ...serie.map((d) => Math.max(d.abiertas, d.entregadas)))
  const serieEnt = serie.map((d) => d.entregadas)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Inicio</Eyebrow>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Hola, {yo.persona.Nombre.split(' ')[0]} 👋</h1>
          <Text variant="muted">{p.paraMirar > 0 ? `Tenés ${p.paraMirar} ${p.paraMirar === 1 ? 'entrega' : 'entregas'} para mirar.` : 'Nada pendiente para corregir. Buen momento para armar algo nuevo.'}</Text>
        </div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => nav('/grupos')} startIcon={<Icon icon={UserPlus} />}>Invitar al grupo</Button><Button onClick={() => nav('/actividades/nueva')} startIcon={<Icon icon={Sparkles} />}>Nueva actividad</Button></div>
      </header>

      {primeraVez && (
        <section className="grid gap-6 rounded-2xl border border-line bg-surface p-6 lg:grid-cols-[1fr_auto]">
          <div>
            <Eyebrow>Primeros pasos · {hechos} de {pasos.length}</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-semibold">Así funciona melu, en cinco pasos</h2>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {pasos.map(([k, t, d, to], i) => { const ok = p.checklist[k]; return (
                <li key={k}><Link to={to} className={`flex h-full flex-col gap-2 rounded-xl border p-3 transition ${ok ? 'border-line bg-canvas' : 'border-line hover:border-ink'}`}>
                  <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${ok ? 'bg-brand-text text-white' : 'bg-ink text-white'}`}>{ok ? <Icon icon={Check} size="xs" /> : i + 1}</span>
                  <span className={`text-sm font-semibold ${ok ? 'text-ink-muted line-through' : ''}`}>{t}</span>
                  <span className="text-xs text-ink-muted">{d}</span>
                </Link></li>
              )})}
            </ol>
          </div>
          <DoodleFoco size={120} className="hidden self-center text-ink lg:block" />
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Aprendices" value={p.aprendices} hint={`${p.grupos} ${p.grupos === 1 ? 'grupo' : 'grupos'} · ${p.espacios} ${p.espacios === 1 ? 'espacio' : 'espacios'}`} tint="bg-teal" icon={<Icon icon={Users} size="lg" />} />
        <StatTile label="Para mirar" value={p.paraMirar} hint="entregas sin corregir" tint="bg-yellow" icon={<Icon icon={Inbox} size="lg" />} series={serieEnt} />
        <StatTile label="Tiempo por misión" value={p.minutosProm || '—'} unit={p.minutosProm ? 'min' : undefined} hint="promedio desde que abren hasta que entregan" tint="bg-blue" icon={<Icon icon={Clock} size="lg" />} />
        <StatTile label="Aciertos en chequeos" value={p.aciertos >= 0 ? Math.round(p.aciertos * 100) : '—'} unit={p.aciertos >= 0 ? '%' : undefined} hint="sobre los bloques con opción correcta" tint="bg-lilac" icon={<Icon icon={Target} size="lg" />} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-start justify-between"><div><Eyebrow>Necesitan una mano</Eyebrow><h2 className="mt-1 font-display text-xl font-semibold">Señales y sugerencias</h2></div><Text size="xs" variant="muted">Reglas simples sobre lo que pasó. Nada inferido.</Text></div>
          {senales.length === 0 && <div className="rounded-xl bg-canvas p-6 text-center text-sm text-ink-muted">Sin señales por ahora. Aparecen cuando alguien se traba, tarda mucho, abandona… o vuela.</div>}
          <ul className="flex flex-col gap-3">
            {senales.map((s) => { const t = TIPO[s.tipo]; return (
              <li key={s.aprendizId + s.tipo} className="flex gap-4 rounded-xl border border-line p-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${t.tint}`}><Icon icon={t.icon} size="lg" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{s.aprendiz}</span><Chip size="sm">{t.label}</Chip><Text size="xs" variant="muted">{s.grupo}</Text></div>
                  <p className="mt-1 text-sm text-ink-muted">{s.detalle}</p>
                  <div className="mt-2 rounded-lg bg-teal px-3 py-2 text-sm"><span className="font-semibold text-brand-text">Sugerencia · </span>{s.sugerencia}{s.recetaId && <> <Link to="/actividades" className="font-semibold underline">{s.recetaTitulo}</Link></>}</div>
                </div>
              </li>
            )})}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-surface p-6">
            <Eyebrow>Esta semana</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-semibold">Misiones abiertas y entregadas</h2>
            <div className="mt-5 flex h-36 items-end gap-2">
              {serie.map((d) => (
                <div key={d.dia} className="flex flex-1 flex-col items-center gap-1" title={`${d.abiertas} abiertas · ${d.entregadas} entregadas`}>
                  <div className="flex h-28 w-full items-end justify-center gap-1">
                    <div className="w-2.5 rounded-t bg-line" style={{ height: `${(d.abiertas / maxSerie) * 100}%` }} />
                    <div className="w-2.5 rounded-t bg-brand-text" style={{ height: `${(d.entregadas / maxSerie) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-ink-subtle">{['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(d.dia + 'T12:00:00').getDay()]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-ink-muted"><span className="flex items-center gap-1"><span className="size-2 rounded bg-line" /> abiertas</span><span className="flex items-center gap-1"><span className="size-2 rounded bg-brand-text" /> entregadas</span></div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <Eyebrow>Por tipo de actividad</Eyebrow>
            <h2 className="mt-1 font-display text-xl font-semibold">Qué les cuesta más</h2>
            {porTipo.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Cuando haya entregas, acá ves tiempo y aciertos por experiencia.</p> : (
              <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-ink-subtle"><th className="pb-2 font-medium">Experiencia</th><th className="pb-2 font-medium text-right">Entregas</th><th className="pb-2 font-medium text-right">Min</th><th className="pb-2 font-medium text-right">Aciertos</th></tr></thead>
                <tbody>{porTipo.map((t) => <tr key={t.experiencia} className="border-t border-line"><td className="py-2 font-medium"><span className="flex items-center gap-2"><Icon icon={Layers} size="sm" color="subtle" />{EXPERIENCIAS[t.experiencia] ?? t.experiencia ?? '—'}</span></td><td className="py-2 text-right tabular-nums">{t.entregas}</td><td className="py-2 text-right tabular-nums">{t.minutosProm || '—'}</td><td className={`py-2 text-right tabular-nums ${t.aciertos >= 0 && t.aciertos < 0.6 ? 'font-semibold text-danger' : ''}`}>{t.aciertos >= 0 ? `${Math.round(t.aciertos * 100)}%` : '—'}</td></tr>)}</tbody></table>
            )}
          </section>
        </div>
      </div>

      {recientes.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-end justify-between"><div><Eyebrow>Entregas recientes</Eyebrow><h2 className="mt-1 font-display text-xl font-semibold">Lo último que llegó</h2></div></div>
          <ul className="mt-4 divide-y divide-line">
            {recientes.map((e) => (
              <li key={e.entregaId} className="flex flex-wrap items-center gap-4 py-3">
                <Avatar name={e.aprendiz ?? '?'} size="sm" />
                <div className="min-w-0 flex-1"><div className="font-medium">{e.aprendiz} <span className="text-ink-muted">· {e.titulo}</span></div><Text size="xs" variant="muted">{e.grupo} · {e.minutos ? `${e.minutos} min` : 'sin tiempo'}{e.aciertos >= 0 && ` · ${Math.round(e.aciertos * 100)}% aciertos`}</Text></div>
                <Chip size="sm" color={e.estado === 'corregida' ? 'success' : 'warning'}>{e.estado === 'corregida' ? 'Corregida' : 'Para mirar'}</Chip>
                <Button size="sm" variant={e.estado === 'corregida' ? 'ghost' : 'primary'} onClick={() => nav(`/corregir/${e.asignacionId}`)}>{e.estado === 'corregida' ? 'Ver' : 'Corregir'}</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
