// Cómo se muestra el perfil de aprendizaje. Una sola manera de dibujarlo, la vea quien la vea.
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, Chip, Eyebrow, Icon, Text, cn } from '@/kit'
import { BarrasPerfil } from '../pantallas/Comenzar'
import { BANDAS, EJES, POLOS, confianza, dominante, parejo, titular, type PerfilVivo, type Polo } from '../lib/perfil'

/** La tarjeta completa: la que ve el aprendiz de sí mismo y el docente de cada uno. */
export function TarjetaPerfil({ v, titulo = 'Cómo aprendés', voz = 'tercera' }: { v: PerfilVivo; titulo?: string; voz?: 'vos' | 'tercera' }) {
  if (!v.tiene && v.misiones === 0) {
    return (
      <Card padding="lg">
        <Eyebrow>{titulo}</Eyebrow>
        <Text variant="muted" className="mt-2">Todavía no hay nada: se arma con el recorrido de bienvenida y con las misiones que se van haciendo.</Text>
      </Card>
    )
  }
  const c = confianza(v, voz)
  return (
    <Card padding="lg" className="gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>{titulo}</Eyebrow>
          <Chip size="sm" color={c.nivel === 'sostenido' ? 'success' : 'default'}>
            {c.nivel === 'corazonada' ? 'Corazonada' : c.nivel === 'pista' ? 'Se está acomodando' : 'Sostenido'}
          </Chip>
        </div>
        <p className="font-display text-xl font-semibold tracking-tight text-balance">{titular(v.perfil, voz === 'vos' ? 'vos' : 'tercera')}</p>
      </div>

      <BarrasPerfil perfil={v.perfil} />

      <Text size="sm" variant="muted">{c.texto}</Text>

      {(v.fuertes.length > 0 || v.flojos.length > 0) && (
        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <ListaRendimiento titulo="Le rinde más" signo="+" items={v.fuertes} />
          <ListaRendimiento titulo="Le cuesta más" signo="−" items={v.flojos} />
        </div>
      )}
    </Card>
  )
}

function ListaRendimiento({ titulo, signo, items }: { titulo: string; signo: '+' | '−'; items: PerfilVivo['fuertes'] }) {
  if (items.length === 0) return <div />
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{titulo}</span>
      <ul className="flex flex-col gap-1.5">
        {items.map((r) => (
          <li key={r.polo} className="flex items-center gap-2 text-sm">
            <Icon icon={signo === '+' ? TrendingUp : TrendingDown} size="sm" className={signo === '+' ? 'text-success' : 'text-warning'} />
            <span className="font-medium">{POLOS[r.polo as Polo]?.nombre ?? r.polo}</span>
            <span className="text-ink-muted">{POLOS[r.polo as Polo]?.micro}</span>
            <span className="ml-auto tabular-nums text-xs text-ink-subtle">{signo}{Math.abs(Math.round(r.diferencia * 100))} pts</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Una línea por aprendiz: para la lista del grupo. */
export function PerfilFila({ v }: { v: PerfilVivo }) {
  const ejes = EJES.filter((e) => !parejo(v.perfil, e.clave)).slice(0, 3)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!v.tiene && <Chip size="sm" color="warning">Sin recorrido de bienvenida</Chip>}
      {v.banda && <Chip size="sm" color="outline">{BANDAS[v.banda]}</Chip>}
      {ejes.map((e) => (
        <Chip key={e.clave} size="sm" className={cn(e.tinte, 'border-transparent')}>{POLOS[dominante(v.perfil, e.clave)].nombre}</Chip>
      ))}
      {ejes.length === 0 && <Text size="xs" variant="subtle">Todavía parejo en todo</Text>}
    </div>
  )
}

/** Lo que pasa en el grupo entero: cuántos rinden mejor con cada cosa. */
export function ResumenDelGrupo({ perfiles }: { perfiles: PerfilVivo[] }) {
  if (perfiles.length === 0) return null
  const conteo: Record<string, number> = {}
  for (const v of perfiles) {
    for (const e of EJES) {
      if (parejo(v.perfil, e.clave)) continue
      const p = dominante(v.perfil, e.clave)
      conteo[p] = (conteo[p] ?? 0) + 1
    }
  }
  const top = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const conEvidencia = perfiles.filter((v) => v.misiones >= 3).length
  return (
    <Card padding="lg" className="gap-3">
      <Eyebrow>El grupo, de un vistazo</Eyebrow>
      <div className="flex flex-wrap gap-2">
        {top.map(([polo, n]) => (
          <span key={polo} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <strong className="font-display text-lg tabular-nums">{n}</strong>
            <span className="text-ink-muted">de {perfiles.length} · {POLOS[polo as Polo]?.nombre}</span>
          </span>
        ))}
      </div>
      <Text size="sm" variant="muted">
        {conEvidencia === 0
          ? 'Por ahora todo esto es lo que dijeron de sí mismos. Se va a acomodar con las misiones que hagan.'
          : `${conEvidencia} de ${perfiles.length} ya tienen suficiente trabajo hecho como para que el perfil se apoye en datos y no solo en lo que dijeron.`}
      </Text>
    </Card>
  )
}
