import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronLeft, Plus, X } from 'lucide-react'
import { Button, Icon, Text } from '@/ui'
import { api, nuevoId, type Actividad, type Bloque, type Criterio, type Grupo, type TipoBloque } from '../lib/api'
import { TIPOS_BLOQUE } from '../lib/composicion'
import { ChipsComposicion, Rotulo } from '../bloques/Chips'
import { Modal } from '../bloques/Modal'

// El editor: un textarea chico por bloque, el árbol en React. Enter crea, "/" elige tipo, Backspace en vacío borra.
export function Editor() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['actividad', id], queryFn: () => api.get<Actividad>(`/api/actividades/${id}`) })
  if (!q.data) return null
  return <EditorCargado key={q.data.id} inicial={q.data} />
}

const nuevoBloque = (tipo: TipoBloque): Bloque => ({ id: nuevoId(), tipo, texto: '', ...(tipo === 'chequeo' ? { opciones: ['', ''], correcta: 0 } : {}), ...(tipo === 'evidencia' ? { kind: 'foto' as const } : {}) })

function EditorCargado({ inicial }: { inicial: Actividad }) {
  const [a, setA] = useState(inicial)
  const [fase, setFase] = useState(0)
  const [estado, setEstado] = useState<'guardado' | 'editando' | 'guardando'>('guardado')
  const [asignar, setAsignar] = useState(false)
  const [foco, setFoco] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const guardar = useMutation({ mutationFn: (x: Actividad) => api.put(`/api/actividades/${x.id}`, x), onMutate: () => setEstado('guardando'), onSuccess: () => setEstado('guardado'), onError: () => setEstado('editando') })
  const cambiar = (fn: (x: Actividad) => Actividad) => setA((prev) => { const next = fn(prev); setEstado('editando'); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => guardar.mutate(next), 700); return next })
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const f = a.documento.fases[fase]
  const setBloques = (bloques: Bloque[]) => cambiar((x) => ({ ...x, documento: { fases: x.documento.fases.map((ff, i) => (i === fase ? { ...ff, bloques } : ff)) } }))
  const insertar = (idx: number, tipo: TipoBloque = 'parrafo') => { const b = nuevoBloque(tipo); const arr = [...f.bloques]; arr.splice(idx, 0, b); setBloques(arr); setFoco(b.id) }
  const actualizar = (id: string, patch: Partial<Bloque>) => setBloques(f.bloques.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  const borrar = (id: string) => { const i = f.bloques.findIndex((b) => b.id === id); setBloques(f.bloques.filter((b) => b.id !== id)); setFoco(f.bloques[i - 1]?.id ?? null) }
  const mover = (id: string, d: -1 | 1) => { const i = f.bloques.findIndex((b) => b.id === id); const j = i + d; if (j < 0 || j >= f.bloques.length) return; const arr = [...f.bloques]; [arr[i], arr[j]] = [arr[j], arr[i]]; setBloques(arr) }
  const setRubrica = (rubrica: Criterio[]) => cambiar((x) => ({ ...x, rubrica }))

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link to="/actividades" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Actividades</Link>
          <Text size="xs" variant="muted">{{ guardado: 'Guardado', editando: 'Editando…', guardando: 'Guardando…' }[estado]}</Text>
        </div>
        <input value={a.titulo} onChange={(e) => cambiar((x) => ({ ...x, titulo: e.target.value }))} aria-label="Título" placeholder="Sin título"
          className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-ink-subtle" />
        <ChipsComposicion c={a.composicion} />

        {a.documento.fases.length > 1 && (
          <nav className="flex flex-wrap gap-1 border-b border-line" aria-label="Fases">
            {a.documento.fases.map((ff, i) => (
              <button key={ff.clave} type="button" onClick={() => setFase(i)} className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm ${i === fase ? 'border-brand font-medium text-brand-text' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                <span className={`grid size-5 place-items-center rounded text-xs font-semibold ${i === fase ? 'bg-brand text-on-brand' : 'bg-muted'}`}>{i + 1}</span>{ff.nombre}
              </button>
            ))}
          </nav>
        )}
        {f.pide && <Text size="sm" variant="muted">Esta fase pide: {f.pide}</Text>}

        <div className="rounded-lg border border-line bg-surface p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            {f.bloques.map((b, i) => (
              <BloqueEditor key={b.id} b={b} conFoco={foco === b.id} esPrimero={i === 0} esUltimo={i === f.bloques.length - 1}
                onChange={(p) => actualizar(b.id, p)} onEnter={() => insertar(i + 1)} onBorrar={() => borrar(b.id)} onMover={(d) => mover(b.id, d)} onFoco={() => setFoco(b.id)} />
            ))}
            <button type="button" onClick={() => insertar(f.bloques.length)} className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-ink-muted hover:bg-hover">
              <Icon icon={Plus} size="sm" /> Escribí, o tipeá <kbd className="rounded border border-line bg-muted px-1.5 font-mono text-xs">/</kbd> para elegir un tipo de bloque
            </button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
        <Button block onClick={() => setAsignar(true)}>Asignar a un grupo</Button>
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <div><h2 className="font-semibold">Rúbrica</h2><Text size="xs" variant="muted">Qué vas a mirar cuando corrijas. Tres niveles por criterio.</Text></div>
          {a.rubrica.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-md border border-line bg-canvas p-3">
              <textarea value={c.label} rows={2} onChange={(e) => setRubrica(a.rubrica.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Criterio" placeholder="Qué mirás"
                className="w-full resize-none bg-transparent text-sm font-medium outline-none placeholder:text-ink-subtle" />
              <div className="flex gap-1">
                {c.niveles.map((n, k) => <input key={k} value={n} aria-label={`Nivel ${k + 1}`} onChange={(e) => setRubrica(a.rubrica.map((x, j) => (j === i ? { ...x, niveles: x.niveles.map((nn, kk) => (kk === k ? e.target.value : nn)) } : x)))} className="min-w-0 flex-1 rounded border border-line bg-surface px-1.5 py-1 text-xs" />)}
              </div>
              <button type="button" onClick={() => setRubrica(a.rubrica.filter((_, j) => j !== i))} className="self-end text-xs text-ink-subtle hover:text-danger">quitar</button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setRubrica([...a.rubrica, { id: nuevoId(), label: '', niveles: ['Todavía no', 'A veces', 'Siempre'] }])} startIcon={<Icon icon={Plus} />}>Agregar criterio</Button>
        </section>
        <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
          <h2 className="font-semibold">Fases</h2>
          <ol className="flex flex-col gap-1 text-sm">{a.documento.fases.map((ff) => <li key={ff.clave} className="flex justify-between text-ink-muted"><span>{ff.nombre}</span><span className="tabular-nums">{ff.bloques.length}</span></li>)}</ol>
        </section>
      </aside>

      <Asignar abierto={asignar} onCerrar={() => setAsignar(false)} actividadId={a.id} />
    </div>
  )
}

function BloqueEditor({ b, conFoco, esPrimero, esUltimo, onChange, onEnter, onBorrar, onMover, onFoco }: {
  b: Bloque; conFoco: boolean; esPrimero: boolean; esUltimo: boolean
  onChange: (p: Partial<Bloque>) => void; onEnter: () => void; onBorrar: () => void; onMover: (d: -1 | 1) => void; onFoco: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [menu, setMenu] = useState(false)
  useEffect(() => { if (conFoco) ref.current?.focus() }, [conFoco])
  useEffect(() => { const el = ref.current; if (el) { el.style.height = '0'; el.style.height = el.scrollHeight + 'px' } }, [b.texto, b.tipo])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && b.tipo !== 'lista') { e.preventDefault(); onEnter() }
    if (e.key === 'Backspace' && b.texto === '') { e.preventDefault(); onBorrar() }
    if (e.key === 'Escape') setMenu(false)
  }
  const onInput = (v: string) => { if (v === '/' && b.texto === '') { setMenu(true); return } onChange({ texto: v }) }
  const elegir = (tipo: TipoBloque) => { setMenu(false); onChange({ ...nuevoBloque(tipo), id: b.id }); ref.current?.focus() }

  const t = TIPOS_BLOQUE[b.tipo]
  const clases: Record<TipoBloque, string> = { parrafo: 'text-base', titulo: 'text-xl font-semibold', lista: 'text-base', destacado: 'text-base font-medium text-brand-text', pregunta: 'font-medium', chequeo: 'font-medium', evidencia: 'font-medium', autoreporte: 'font-medium' }
  const marco = t.semantico ? 'rounded-md border border-line bg-canvas p-3' : b.tipo === 'destacado' ? 'rounded-md border-l-4 border-brand bg-brand-subtle px-4 py-2' : ''

  return (
    <div className="group relative flex gap-2" onFocus={onFoco}>
      <div className="flex w-24 shrink-0 flex-col items-end gap-0.5 pt-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" onClick={() => setMenu((m) => !m)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted hover:bg-hover" title={t.pista}>{t.nombre}</button>
        <div className="flex">
          <button type="button" onClick={() => onMover(-1)} disabled={esPrimero} className="rounded p-1 text-ink-subtle hover:bg-hover disabled:opacity-30" aria-label="Subir"><Icon icon={ArrowUp} size="xs" /></button>
          <button type="button" onClick={() => onMover(1)} disabled={esUltimo} className="rounded p-1 text-ink-subtle hover:bg-hover disabled:opacity-30" aria-label="Bajar"><Icon icon={ArrowDown} size="xs" /></button>
          <button type="button" onClick={onBorrar} className="rounded p-1 text-ink-subtle hover:bg-hover hover:text-danger" aria-label="Borrar"><Icon icon={X} size="xs" /></button>
        </div>
      </div>
      <div className={`relative min-w-0 flex-1 ${marco}`}>
        {t.semantico && <Rotulo className="mb-1 block">{t.nombre}{b.tipo === 'evidencia' && ` · ${b.kind}`}</Rotulo>}
        <textarea ref={ref} value={b.texto} rows={1} onChange={(e) => onInput(e.target.value)} onKeyDown={onKey} aria-label={t.nombre} placeholder={b.tipo === 'lista' ? 'Un ítem por línea' : t.pista}
          className={`w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-ink-subtle ${clases[b.tipo]}`} />
        {b.tipo === 'chequeo' && (
          <div className="mt-2 flex flex-col gap-1.5">
            {(b.opciones ?? []).map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={`c-${b.id}`} checked={b.correcta === i} onChange={() => onChange({ correcta: i })} aria-label="Correcta" className="accent-(--accent)" />
                <input value={o} onChange={(e) => onChange({ opciones: (b.opciones ?? []).map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Opción ${i + 1}`} className="flex-1 rounded-md border border-line bg-surface px-2 py-1 text-sm" />
                <button type="button" onClick={() => onChange({ opciones: (b.opciones ?? []).filter((_, j) => j !== i) })} className="text-ink-subtle hover:text-danger" aria-label="Quitar opción"><Icon icon={X} size="xs" /></button>
              </div>
            ))}
            <button type="button" onClick={() => onChange({ opciones: [...(b.opciones ?? []), ''] })} className="self-start text-xs font-medium text-brand-text">+ opción</button>
          </div>
        )}
        {b.tipo === 'evidencia' && (
          <div className="mt-2 flex gap-1">{(['foto', 'audio', 'archivo'] as const).map((k) => <button key={k} type="button" onClick={() => onChange({ kind: k })} className={`rounded-md border px-2 py-0.5 text-xs ${b.kind === k ? 'border-brand bg-brand-subtle text-brand-text' : 'border-line'}`}>{k}</button>)}</div>
        )}
        {menu && (
          <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-line bg-surface p-1 shadow-lg" role="menu">
            {Object.entries(TIPOS_BLOQUE).map(([k, v]) => (
              <button key={k} type="button" role="menuitem" onClick={() => elegir(k as TipoBloque)} className="flex w-full flex-col rounded-md px-3 py-1.5 text-left hover:bg-hover">
                <span className="text-sm font-medium">{v.nombre}</span><span className="text-xs text-ink-muted">{v.pista}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Asignar({ abierto, onCerrar, actividadId }: { abierto: boolean; onCerrar: () => void; actividadId: string }) {
  const grupos = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Grupo[]>('/api/grupos'), enabled: abierto })
  const [listo, setListo] = useState<string | null>(null)
  const asignar = useMutation({ mutationFn: (grupoId: string) => api.post(`/api/actividades/${actividadId}/asignar`, { grupoId }), onSuccess: (_, gid) => setListo(gid) })
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Asignar a un grupo" descripcion="Se congela una copia: si editás después, lo asignado no cambia." pie={<Button variant="ghost" onClick={onCerrar}>Cerrar</Button>}>
      <div className="flex flex-col gap-2">
        {grupos.data?.length === 0 && <Text variant="muted">Todavía no tenés grupos.</Text>}
        {grupos.data?.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-md border border-line px-4 py-3">
            <div><div className="font-medium">{g.nombre}</div><Text size="xs" variant="muted">{g.aprendices} aprendices</Text></div>
            {listo === g.id ? <Text size="sm" className="text-success">Asignada ✓</Text> : <Button size="sm" onClick={() => asignar.mutate(g.id)} loading={asignar.isPending && asignar.variables === g.id}>Asignar</Button>}
          </div>
        ))}
      </div>
    </Modal>
  )
}
