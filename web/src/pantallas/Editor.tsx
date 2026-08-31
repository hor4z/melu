import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronLeft, Eye, EyeOff, GripVertical, LayoutTemplate, Plus, Send, X } from 'lucide-react'
import { Button, Card, Chip, Eyebrow, Icon, Kbd, Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Text, Toggle, cn } from '@/kit'
import { api, nuevoId, type Actividad, type Bloque, type Criterio, type FiguraManipulable, type Grupo, type Lente, type MotorJuego, type TipoBloque } from '../lib/api'
import { ES_INTERACTIVO, ESCENARIOS, EXPERIENCIAS, FIGURAS, JUEGOS, SOCIAL, TIPOS_BLOQUE } from '../lib/composicion'
import { ChipsComposicion, Rotulo } from '../bloques/Chips'
import { BloqueInteractivo, BloqueLectura, partirHuecos } from '../bloques/Interactivo'
import { Programar } from '../bloques/Programar'
import { Modal } from '../bloques/Modal'
import { Portada } from '../bloques/Portada'

// El editor: una hoja tipo Notion. Portada, título, propiedades, fases, bloques con "/" y arrastre.
export function Editor() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['actividad', id], queryFn: () => api.get<Actividad>(`/api/actividades/${id}`) })
  if (!q.data) return null
  return <EditorCargado key={q.data.id} inicial={q.data} />
}

const nuevoBloque = (tipo: TipoBloque): Bloque => ({
  id: nuevoId(), tipo, texto: '',
  ...(tipo === 'chequeo' || tipo === 'opciones' ? { opciones: ['', ''], correcta: 0 } : {}),
  ...(tipo === 'evidencia' ? { kind: 'foto' as const } : {}),
  ...(tipo === 'juego' ? { motor: 'clasificar' as MotorJuego, categorias: [{ nombre: '', items: [] }, { nombre: '', items: [] }] } : {}),
  ...(tipo === 'manipulable' ? { figura: 'recta' as FiguraManipulable, min: 0, max: 5, paso: 0.25, respuesta: 2.5, tolerancia: 0 } : {}),
})

function EditorCargado({ inicial }: { inicial: Actividad }) {
  const nav = useNavigate()
  const [a, setA] = useState(inicial)
  const historial = useRef<Actividad[]>([])
  const [fase, setFase] = useState(0)
  const [estado, setEstado] = useState<'guardado' | 'editando' | 'guardando'>('guardado')
  const [asignar, setAsignar] = useState(false)
  const [preview, setPreview] = useState(false)
  const [foco, setFoco] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const lentes = useQuery({ queryKey: ['lentes'], queryFn: () => api.get<Lente[]>('/api/lentes'), staleTime: Infinity })

  const guardar = useMutation({ mutationFn: (x: Actividad) => api.put(`/api/actividades/${x.id}`, x), onMutate: () => setEstado('guardando'), onSuccess: () => setEstado('guardado'), onError: () => setEstado('editando') })
  const plantilla = useMutation({ mutationFn: () => api.post<Actividad>(`/api/actividades/${a.id}/plantilla`) })
  const cambiar = useCallback((fn: (x: Actividad) => Actividad, snapshot = true) => setA((prev) => {
    if (snapshot) { historial.current.push(prev); if (historial.current.length > 60) historial.current.shift() }
    const next = fn(prev); setEstado('editando'); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => guardar.mutate(next), 700); return next
  }), [guardar])
  const deshacer = useCallback(() => { const prev = historial.current.pop(); if (prev) { setA(prev); setEstado('editando'); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => guardar.mutate(prev), 700) } }, [guardar])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); deshacer() } }
    window.addEventListener('keydown', onKey); return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(timer.current) }
  }, [deshacer])

  const f = a.documento.fases[fase] ?? a.documento.fases[0]
  const setBloques = (bloques: Bloque[], snapshot = true) => cambiar((x) => ({ ...x, documento: { fases: x.documento.fases.map((ff, i) => (i === fase ? { ...ff, bloques } : ff)) } }), snapshot)
  const insertar = (idx: number, tipo: TipoBloque = 'parrafo', texto = '') => { const b = { ...nuevoBloque(tipo), texto }; const arr = [...f.bloques]; arr.splice(idx, 0, b); setBloques(arr); setFoco(b.id); return b.id }
  const actualizar = (id: string, patch: Partial<Bloque>, snapshot = false) => setBloques(f.bloques.map((b) => (b.id === id ? { ...b, ...patch } : b)), snapshot)
  const borrar = (id: string) => { const i = f.bloques.findIndex((b) => b.id === id); setBloques(f.bloques.filter((b) => b.id !== id)); setFoco(f.bloques[i - 1]?.id ?? null) }
  const mover = (id: string, d: -1 | 1) => { const i = f.bloques.findIndex((b) => b.id === id); const j = i + d; if (j < 0 || j >= f.bloques.length) return; const arr = [...f.bloques]; [arr[i], arr[j]] = [arr[j], arr[i]]; setBloques(arr) }
  const moverA = (id: string, destino: number) => { const i = f.bloques.findIndex((b) => b.id === id); if (i < 0) return; const arr = [...f.bloques]; const [b] = arr.splice(i, 1); arr.splice(destino > i ? destino - 1 : destino, 0, b); setBloques(arr) }
  const pegar = (idx: number, lineas: string[]) => { const nuevos = lineas.map((t) => ({ ...nuevoBloque('parrafo'), texto: t })); const arr = [...f.bloques]; arr.splice(idx, 0, ...nuevos); setBloques(arr); setFoco(nuevos[nuevos.length - 1].id) }
  const setRubrica = (rubrica: Criterio[]) => cambiar((x) => ({ ...x, rubrica }))
  const setComp = (patch: Partial<Actividad['composicion']>) => cambiar((x) => ({ ...x, composicion: { ...x.composicion, ...patch } }))
  const agregarFase = () => cambiar((x) => ({ ...x, documento: { fases: [...x.documento.fases, { clave: nuevoId(), nombre: `Fase ${x.documento.fases.length + 1}`, bloques: [] }] } }))
  const renombrarFase = (i: number, nombre: string) => cambiar((x) => ({ ...x, documento: { fases: x.documento.fases.map((ff, k) => (k === i ? { ...ff, nombre } : ff)) } }), false)
  const totalBloques = a.documento.fases.reduce((n, ff) => n + ff.bloques.length, 0)
  const lenteNombre = lentes.data?.find((l) => l.clave === a.composicion.lente)?.nombre

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link to="/actividades" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Actividades</Link>
          <div className="flex items-center gap-3"><Text size="xs" variant="muted">{{ guardado: 'Guardado', editando: 'Editando…', guardando: 'Guardando…' }[estado]} · {totalBloques} bloques</Text><Button size="sm" variant="ghost" startIcon={<Icon icon={preview ? EyeOff : Eye} />} onClick={() => setPreview((v) => !v)}>{preview ? 'Editar' : 'Ver como aprendiz'}</Button></div>
        </div>

        <Card className="overflow-hidden">
          <Portada titulo={a.titulo} className="h-36" size={96} />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <input value={a.titulo} onChange={(e) => cambiar((x) => ({ ...x, titulo: e.target.value }), false)} aria-label="Título" placeholder="Sin título" readOnly={preview}
              className="w-full bg-transparent font-display text-4xl font-semibold tracking-tight outline-none placeholder:text-ink-subtle" />
            {/* Propiedades, como en Notion: cada una es un menú inline */}
            <div className="grid gap-y-1 text-sm sm:grid-cols-[130px_1fr]">
              <Prop nombre="Experiencia"><Elegir opciones={EXPERIENCIAS} valor={a.composicion.experiencia} onPick={(v) => setComp({ experiencia: v })} disabled={preview} /></Prop>
              <Prop nombre="Lente"><Elegir opciones={Object.fromEntries((lentes.data ?? []).map((l) => [l.clave, l.nombre]))} valor={a.composicion.lente} onPick={(v) => setComp({ lente: v })} disabled={preview} /></Prop>
              <Prop nombre="Escenario"><Elegir multi opciones={ESCENARIOS} valores={a.composicion.escenario ?? []} onToggle={(v) => setComp({ escenario: (a.composicion.escenario ?? []).includes(v) ? (a.composicion.escenario ?? []).filter((x) => x !== v) : [...(a.composicion.escenario ?? []), v] })} disabled={preview} /></Prop>
              <Prop nombre="Social"><Elegir opciones={SOCIAL} valor={a.composicion.social} onPick={(v) => setComp({ social: v })} disabled={preview} /></Prop>
              <Prop nombre="Disciplinas"><input value={(a.composicion.disciplinas ?? []).join(', ')} onChange={(e) => setComp({ disciplinas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} readOnly={preview} placeholder="Matemática · medida, Física · fuerzas" className="w-full rounded px-1.5 py-0.5 hover:bg-hover focus:bg-hover focus:outline-none" /></Prop>
            </div>
            {preview && <ChipsComposicion c={a.composicion} />}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 pt-2" role="tablist" aria-label="Fases">
            {a.documento.fases.map((ff, i) => (
              <button key={ff.clave} type="button" role="tab" aria-selected={i === fase} onClick={() => setFase(i)} className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${i === fase ? 'border-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                <span className={`grid size-5 place-items-center rounded text-[11px] font-bold ${i === fase ? 'bg-ink text-white' : 'bg-muted'}`}>{i + 1}</span>
                {i === fase && !preview ? <input value={ff.nombre} onChange={(e) => renombrarFase(i, e.target.value)} onClick={(e) => e.stopPropagation()} className="w-28 bg-transparent outline-none" aria-label="Nombre de la fase" /> : ff.nombre}
              </button>
            ))}
            {!preview && <button type="button" onClick={agregarFase} className="ml-1 flex items-center gap-1 px-2 py-2.5 text-sm text-ink-muted hover:text-ink"><Icon icon={Plus} size="sm" /> fase</button>}
          </div>
          <div className="p-5 sm:p-8">
            {f?.pide && !preview && <Text size="sm" variant="muted" className="mb-4">Esta fase pide: {f.pide}</Text>}
            {preview ? (
              <div className="flex flex-col gap-5">
                {f?.bloques.map((b) => ES_INTERACTIVO(b.tipo)
                  ? <div key={b.id} className="flex flex-col gap-3">{b.tipo !== 'completar' && <p className="font-display text-xl font-semibold tracking-tight">{b.texto}</p>}<BloqueInteractivo b={b} valor={undefined} onChange={() => {}} estado="editando" /></div>
                  : <BloqueLectura key={b.id} b={b} />)}
                {f?.bloques.length === 0 && <Text variant="muted">Esta fase está vacía.</Text>}
              </div>
            ) : (
              <div className="flex flex-col">
                {f?.bloques.map((b, i) => (
                  <BloqueEditor key={b.id} b={b} idx={i} conFoco={foco === b.id} esPrimero={i === 0} esUltimo={i === f.bloques.length - 1}
                    onChange={(p, snap) => actualizar(b.id, p, snap)} onEnter={(resto) => insertar(i + 1, 'parrafo', resto)} onBorrar={() => borrar(b.id)} onMover={(d) => mover(b.id, d)} onDrop={(destino) => moverA(b.id, destino)} onPegar={(l) => pegar(i + 1, l)} onFoco={() => setFoco(b.id)} />
                ))}
                <DropZone idx={f?.bloques.length ?? 0} onDropAt={(id, destino) => moverA(id, destino)} />
                <button type="button" onClick={() => insertar(f?.bloques.length ?? 0)} className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-ink-muted hover:bg-hover">
                  <Icon icon={Plus} size="sm" /> Escribí acá, o tipeá <Kbd>/</Kbd> para elegir un tipo de bloque
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <Card padding="sm" className="gap-2">
          <Button block onClick={() => setAsignar(true)} startIcon={<Icon icon={Send} />}>Asignar a un grupo</Button>
          <Button block variant="secondary" loading={plantilla.isPending} onClick={() => plantilla.mutate()} startIcon={<Icon icon={LayoutTemplate} />}>{plantilla.isSuccess ? 'Guardada como plantilla ✓' : 'Guardar como plantilla'}</Button>
          <Text size="xs" variant="muted">Una plantilla aparece en «Nueva actividad» para vos y para los guías de tu espacio.</Text>
        </Card>
        <Card padding="sm" className="gap-3">
          <div><Eyebrow>Rúbrica</Eyebrow><Text size="xs" variant="muted">Qué vas a mirar cuando corrijas. Tres niveles por criterio.</Text></div>
          {a.rubrica.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-3">
              <textarea value={c.label} rows={2} onChange={(e) => setRubrica(a.rubrica.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Criterio" placeholder="Qué mirás" className="w-full resize-none bg-transparent text-sm font-medium outline-none placeholder:text-ink-subtle" />
              <div className="flex gap-1">{c.niveles.map((n, k) => <input key={k} value={n} aria-label={`Nivel ${k + 1}`} onChange={(e) => setRubrica(a.rubrica.map((x, j) => (j === i ? { ...x, niveles: x.niveles.map((nn, kk) => (kk === k ? e.target.value : nn)) } : x)))} className="min-w-0 flex-1 rounded border border-line bg-surface px-1.5 py-1 text-xs" />)}</div>
              <button type="button" onClick={() => setRubrica(a.rubrica.filter((_, j) => j !== i))} className="self-end text-xs text-ink-subtle hover:text-danger">quitar</button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setRubrica([...a.rubrica, { id: nuevoId(), label: '', niveles: ['Todavía no', 'A veces', 'Siempre'] }])} startIcon={<Icon icon={Plus} />}>Agregar criterio</Button>
        </Card>
        <Card padding="sm" className="text-sm text-ink-muted">
          <Eyebrow>Atajos</Eyebrow>
          <ul className="mt-2 space-y-1"><li><Kbd>/</Kbd> tipo de bloque</li><li><Kbd>#</Kbd> título · <Kbd>-</Kbd> lista · <Kbd>&gt;</Kbd> destacado</li><li><Kbd>Enter</Kbd> nuevo bloque · <Kbd>⌘Z</Kbd> deshacer</li><li>Arrastrá el ⋮⋮ para reordenar. Pegar varias líneas crea varios bloques.</li></ul>
          {lenteNombre && <p className="mt-3">Lente: <span className="font-medium text-ink">{lenteNombre}</span>.</p>}
        </Card>
      </aside>

      <Asignar abierto={asignar} onCerrar={() => setAsignar(false)} actividadId={a.id} onAsignada={(gid) => nav(`/grupos/${gid}`)} />
    </div>
  )
}

function Prop({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return <><span className="flex items-center py-1 text-ink-subtle">{nombre}</span><div className="flex flex-wrap items-center gap-1 py-1">{children}</div></>
}

type ElegirProps = { opciones: Record<string, string>; disabled?: boolean } & ({ multi?: false; valor?: string; onPick: (v: string) => void } | { multi: true; valores: string[]; onToggle: (v: string) => void })
function Elegir(p: ElegirProps) {
  const [open, setOpen] = useState(false)
  const activos = p.multi ? p.valores : p.valor ? [p.valor] : []
  return (
    <Popover open={open} onOpenChange={setOpen} role="listbox">
      <PopoverTrigger>
        <button type="button" disabled={p.disabled} className="flex flex-wrap items-center gap-1 rounded px-1.5 py-0.5 text-left outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30 disabled:hover:bg-transparent">
          {activos.length === 0 && <span className="text-ink-subtle">Elegir…</span>}
          {activos.map((k) => <Chip key={k} size="sm">{p.opciones[k] ?? k}</Chip>)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-80 flex-wrap gap-1 p-2">
        {Object.entries(p.opciones).map(([k, l]) => (
          <Toggle key={k} size="sm" variant="outline" pressed={activos.includes(k)}
            onPressedChange={() => { if (p.multi) p.onToggle(k); else { p.onPick(k); setOpen(false) } }}>{l}</Toggle>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function DropZone({ idx, onDropAt }: { idx: number; onDropAt: (id: string, destino: number) => void }) {
  const [over, setOver] = useState(false)
  return <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/bloque'); if (id) onDropAt(id, idx) }} className={`h-2 rounded transition-colors ${over ? 'bg-brand-text' : ''}`} />
}

const CATEGORIAS: [string, TipoBloque[]][] = [
  ['Texto', ['parrafo', 'titulo', 'lista', 'destacado']],
  ['Se corrige solo', ['opciones', 'varias', 'numerico', 'completar', 'ordenar', 'emparejar']],
  ['Juegos', ['juego', 'manipulable']],
  ['Lo mira el docente', ['pregunta', 'evidencia', 'autoreporte']],
]

function BloqueEditor({ b, idx, conFoco, esPrimero, esUltimo, onChange, onEnter, onBorrar, onMover, onDrop, onPegar, onFoco }: {
  b: Bloque; idx: number; conFoco: boolean; esPrimero: boolean; esUltimo: boolean
  onChange: (p: Partial<Bloque>, snapshot?: boolean) => void; onEnter: (resto: string) => void; onBorrar: () => void; onMover: (d: -1 | 1) => void; onDrop: (destino: number) => void; onPegar: (lineas: string[]) => void; onFoco: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  useEffect(() => { if (conFoco) ref.current?.focus() }, [conFoco])
  useEffect(() => { const el = ref.current; if (el) { el.style.height = '0'; el.style.height = el.scrollHeight + 'px' } }, [b.texto, b.tipo])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu !== null) { if (e.key === 'Escape') { setMenu(null); e.preventDefault() } return }
    if (e.key === 'Enter' && !e.shiftKey && b.tipo !== 'lista') { e.preventDefault(); const el = e.currentTarget; const pos = el.selectionStart; const antes = b.texto.slice(0, pos), resto = b.texto.slice(pos); if (resto) onChange({ texto: antes }, true); onEnter(resto) }
    if (e.key === 'Backspace' && b.texto === '') { e.preventDefault(); if (b.tipo !== 'parrafo') onChange({ tipo: 'parrafo' }, true); else onBorrar() }
  }
  const onInput = (v: string) => {
    if (v.startsWith('/') && b.texto === '') { setMenu(v.slice(1)); return }
    if (menu !== null) { setMenu(v.slice(1)); return }
    if (b.tipo === 'parrafo' && b.texto === '') {
      if (v === '# ') { onChange({ tipo: 'titulo', texto: '' }, true); return }
      if (v === '- ') { onChange({ tipo: 'lista', texto: '' }, true); return }
      if (v === '> ') { onChange({ tipo: 'destacado', texto: '' }, true); return }
    }
    onChange({ texto: v })
  }
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const t = e.clipboardData.getData('text/plain'); const lineas = t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (lineas.length > 1 && b.tipo !== 'lista') { e.preventDefault(); if (b.texto === '') { onChange({ texto: lineas[0] }, true); onPegar(lineas.slice(1)) } else onPegar(lineas) }
  }
  const elegir = (tipo: TipoBloque) => { setMenu(null); onChange({ ...nuevoBloque(tipo), id: b.id }, true); ref.current?.focus() }
  const filtro = (menu ?? '').toLowerCase()
  const t = TIPOS_BLOQUE[b.tipo]
  const clases: Partial<Record<TipoBloque, string>> = { titulo: 'font-display text-2xl font-semibold tracking-tight', destacado: 'text-base font-medium text-accent' }
  const marco = t.semantico ? 'rounded-xl border border-line bg-canvas p-3' : b.tipo === 'destacado' ? 'rounded-md border-l-4 border-brand-text bg-teal px-4 py-2' : ''

  return (
    <div className={`group relative -mx-2 flex gap-1 rounded-lg px-2 py-0.5 ${over ? 'shadow-[inset_0_2px_0_0_var(--accent-text)]' : ''}`} onFocus={onFoco}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/bloque'); if (id && id !== b.id) onDrop(idx) }}>
      <div className="flex w-16 shrink-0 items-start justify-end gap-0.5 pt-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" onClick={() => setMenu(menu === null ? '' : null)} className="rounded p-1 text-ink-subtle hover:bg-hover" aria-label="Cambiar tipo" title={t.nombre}><Icon icon={Plus} size="sm" /></button>
        <span draggable onDragStart={(e) => { e.dataTransfer.setData('text/bloque', b.id); e.dataTransfer.effectAllowed = 'move' }} className="cursor-grab rounded p-1 text-ink-subtle hover:bg-hover active:cursor-grabbing" aria-label="Arrastrar"><Icon icon={GripVertical} size="sm" /></span>
      </div>
      <Popover open={menu !== null} onOpenChange={(o) => !o && setMenu(null)} placement="bottom-start" role="menu">
      <div className={`relative min-w-0 flex-1 ${marco}`}>
        {t.semantico && <div className="mb-1 flex items-center justify-between"><Rotulo>{t.nombre}{b.tipo === 'evidencia' && ` · ${b.kind}`}</Rotulo><span className="flex opacity-0 group-hover:opacity-100"><button type="button" onClick={() => onMover(-1)} disabled={esPrimero} className="rounded p-0.5 text-ink-subtle hover:bg-hover disabled:opacity-30" aria-label="Subir"><Icon icon={ArrowUp} size="xs" /></button><button type="button" onClick={() => onMover(1)} disabled={esUltimo} className="rounded p-0.5 text-ink-subtle hover:bg-hover disabled:opacity-30" aria-label="Bajar"><Icon icon={ArrowDown} size="xs" /></button><button type="button" onClick={onBorrar} className="rounded p-0.5 text-ink-subtle hover:text-danger" aria-label="Borrar"><Icon icon={X} size="xs" /></button></span></div>}
        <PopoverAnchor>
          <textarea ref={ref} value={menu !== null ? '/' + menu : b.texto} rows={1} onChange={(e) => onInput(e.target.value)} onKeyDown={onKey} onPaste={onPaste} aria-label={t.nombre} placeholder={b.tipo === 'lista' ? 'Un ítem por línea' : b.tipo === 'parrafo' ? 'Escribí, o "/" para elegir un bloque' : t.pista}
            className={`w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-ink-subtle ${clases[b.tipo] ?? (t.semantico ? 'font-medium' : 'text-base')}`} />
        </PopoverAnchor>
        <DetalleBloque b={b} onChange={onChange} />
      </div>
      {/* Va en un portal: si no, el menú lo recorta la tarjeta del editor. Y el foco se queda en el textarea. */}
      <PopoverContent manageFocus={false} className="w-80 p-1.5">
        {CATEGORIAS.map(([cat, tipos]) => {
          const vis = tipos.filter((k) => !filtro || TIPOS_BLOQUE[k].nombre.toLowerCase().includes(filtro) || k.includes(filtro))
          if (!vis.length) return null
          return (
            <div key={cat}>
              <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{cat}</div>
              {vis.map((k) => (
                <button key={k} type="button" role="menuitem" onMouseDown={(e) => { e.preventDefault(); elegir(k) }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-hover">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-canvas text-xs font-bold">{TIPOS_BLOQUE[k].nombre[0]}</span>
                  <span>
                    <span className="block text-sm font-medium">{TIPOS_BLOQUE[k].nombre}</span>
                    <span className="block text-xs text-ink-muted">{TIPOS_BLOQUE[k].pista}</span>
                  </span>
                </button>
              ))}
            </div>
          )
        })}
        {CATEGORIAS.every(([, tipos]) => !tipos.some((k) => !filtro || TIPOS_BLOQUE[k].nombre.toLowerCase().includes(filtro) || k.includes(filtro))) && (
          <p className="px-3 py-2 text-sm text-ink-muted">Ningún bloque coincide con «{filtro}».</p>
        )}
      </PopoverContent>
      </Popover>
    </div>
  )
}

const filaChica = 'flex-1 rounded-md border border-line bg-surface px-2 py-1 text-sm'

/** Los campos propios de cada tipo: opciones, respuesta, pares, huecos, y la explicación. */
function DetalleBloque({ b, onChange }: { b: Bloque; onChange: (p: Partial<Bloque>, snapshot?: boolean) => void }) {
  const t = TIPOS_BLOQUE[b.tipo]
  const lista = (campo: 'opciones' | 'items', etiqueta: string, extra?: (o: string, i: number) => React.ReactNode) => (
    <div className="mt-2 flex flex-col gap-1.5">
      {((b[campo] as string[]) ?? []).map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          {extra?.(o, i)}
          <input value={o} onChange={(e) => onChange({ [campo]: ((b[campo] as string[]) ?? []).map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`${etiqueta} ${i + 1}`} className={filaChica} />
          <button type="button" onClick={() => onChange({ [campo]: ((b[campo] as string[]) ?? []).filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar"><Icon icon={X} size="xs" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ [campo]: [...((b[campo] as string[]) ?? []), ''] }, true)} className="self-start text-xs font-semibold text-accent">+ {etiqueta.toLowerCase()}</button>
    </div>
  )
  return (
    <>
      {(b.tipo === 'opciones' || b.tipo === 'chequeo') && lista('opciones', 'Opción', (_, i) => (
        <input type="radio" name={`c-${b.id}`} checked={b.correcta === i} onChange={() => onChange({ correcta: i }, true)} aria-label="Correcta" title="La correcta" />
      ))}
      {b.tipo === 'varias' && lista('opciones', 'Opción', (_, i) => (
        <input type="checkbox" checked={(b.correctas ?? []).includes(i)} aria-label="Correcta" title="Cuenta como correcta"
          onChange={() => onChange({ correctas: (b.correctas ?? []).includes(i) ? (b.correctas ?? []).filter((x) => x !== i) : [...(b.correctas ?? []), i] }, true)} />
      ))}
      {b.tipo === 'ordenar' && <><p className="mt-2 text-xs text-ink-subtle">En el orden correcto. Al chico le llegan mezclados.</p>{lista('items', 'Ítem')}</>}
      {b.tipo === 'numerico' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5">Respuesta<input type="number" value={b.respuesta ?? ''} onChange={(e) => onChange({ respuesta: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-24 rounded-md border border-line bg-surface px-2 py-1" /></label>
          <label className="flex items-center gap-1.5">± <input type="number" value={b.tolerancia ?? 0} onChange={(e) => onChange({ tolerancia: Number(e.target.value) })} className="w-20 rounded-md border border-line bg-surface px-2 py-1" /></label>
          <label className="flex items-center gap-1.5">Unidad<input value={b.unidad ?? ''} onChange={(e) => onChange({ unidad: e.target.value })} placeholder="cm" className="w-20 rounded-md border border-line bg-surface px-2 py-1" /></label>
        </div>
      )}
      {b.tipo === 'completar' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="text-xs text-ink-subtle">Escribí la frase con los huecos entre llaves dobles. Acá va lo que se espera en cada uno.</p>
          {partirHuecos(b.texto).filter((x) => x.hueco).map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 truncate text-ink-subtle">{h.texto || `hueco ${i + 1}`}</span>
              <input value={b.huecos?.[i] ?? ''} onChange={(e) => { const c = [...(b.huecos ?? [])]; c[i] = e.target.value; onChange({ huecos: c }) }} placeholder="Respuesta" className={filaChica} />
            </div>
          ))}
        </div>
      )}
      {b.tipo === 'emparejar' && (
        <div className="mt-2 flex flex-col gap-1.5">
          {(b.pares ?? []).map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p.izq} onChange={(e) => onChange({ pares: (b.pares ?? []).map((x, j) => (j === i ? { ...x, izq: e.target.value } : x)) })} placeholder="Esto" className={filaChica} />
              <span className="text-ink-subtle">↔</span>
              <input value={p.der} onChange={(e) => onChange({ pares: (b.pares ?? []).map((x, j) => (j === i ? { ...x, der: e.target.value } : x)) })} placeholder="va con esto" className={filaChica} />
              <button type="button" onClick={() => onChange({ pares: (b.pares ?? []).filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar"><Icon icon={X} size="xs" /></button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ pares: [...(b.pares ?? []), { izq: '', der: '' }] }, true)} className="self-start text-xs font-semibold text-accent">+ par</button>
        </div>
      )}
      {b.tipo === 'juego' && <ConfigJuego b={b} onChange={onChange} />}
      {b.tipo === 'manipulable' && <ConfigFigura b={b} onChange={onChange} />}
      {b.tipo === 'evidencia' && (
        <div className="mt-2 flex gap-1">{(['foto', 'audio', 'archivo'] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange({ kind: k }, true)} className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', b.kind === k ? 'border-ink bg-solid text-on-solid' : 'border-line')}>{k}</button>
        ))}</div>
      )}
      {t?.corrige && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-2">
          <input value={b.pista ?? ''} onChange={(e) => onChange({ pista: e.target.value })} placeholder="Pista (opcional): se pide antes de responder" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-subtle" />
          <input value={b.explicacion ?? ''} onChange={(e) => onChange({ explicacion: e.target.value })} placeholder="Explicación: se muestra después de responder" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-subtle" />
        </div>
      )}
    </>
  )
}

/** Las figuras se configuran con pocos números: el rango, las partes o la ecuación. */
function ConfigFigura({ b, onChange }: { b: Bloque; onChange: (p: Partial<Bloque>, snapshot?: boolean) => void }) {
  const num = (k: keyof Bloque, etiqueta: string, def?: number) => (
    <label key={k} className="flex items-center gap-1.5 text-sm">{etiqueta}
      <input type="number" step="any" value={(b[k] as number) ?? def ?? ''} onChange={(e) => onChange({ [k]: e.target.value === '' ? undefined : Number(e.target.value) })}
        className="w-20 rounded-md border border-line bg-surface px-2 py-1" />
    </label>
  )
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(FIGURAS).map(([k, f]) => (
          <button key={k} type="button" onClick={() => onChange({ figura: k as FiguraManipulable }, true)}
            className={cn('flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm font-medium', b.figura === k ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}>
            <span aria-hidden="true">{f.emoji}</span>{f.nombre}
          </button>
        ))}
      </div>
      {b.figura && <Text size="xs" variant="muted">{FIGURAS[b.figura].pista}</Text>}
      <div className="flex flex-wrap items-center gap-3">
        {b.figura === 'recta' && <>{num('min', 'Desde', 0)}{num('max', 'Hasta', 10)}{num('paso', 'Paso', 0.25)}{num('respuesta', 'Respuesta')}{num('tolerancia', '±', 0)}</>}
        {b.figura === 'fraccion' && <>{num('partes', 'Partes', 4)}{num('respuesta', 'Pintar')}</>}
        {b.figura === 'balanza' && <><span className="text-sm text-ink-muted">a·x + b = c</span>{num('coefA', 'a', 1)}{num('coefB', 'b', 0)}{num('coefC', 'c', 0)}</>}
      </div>
    </div>
  )
}

/** Un juego es una mecánica con tu contenido: primero elegís cuál, después lo cargás. */
function ConfigJuego({ b, onChange }: { b: Bloque; onChange: (p: Partial<Bloque>, snapshot?: boolean) => void }) {
  const cats = b.categorias ?? []
  const qs = b.preguntas ?? []
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(JUEGOS).map(([k, j]) => (
          <button key={k} type="button" onClick={() => onChange({ motor: k as MotorJuego }, true)}
            className={cn('flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm font-medium', b.motor === k ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}>
            <span aria-hidden="true">{j.emoji}</span>{j.nombre}
          </button>
        ))}
      </div>
      {b.motor && <Text size="xs" variant="muted">{JUEGOS[b.motor].pista}</Text>}

      {b.motor === 'clasificar' && (
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-line bg-canvas p-2">
              <div className="flex items-center gap-2">
                <input value={c.nombre} onChange={(e) => onChange({ categorias: cats.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)) })} placeholder={`Caja ${i + 1}`} className={cn(filaChica, 'font-medium')} />
                <button type="button" onClick={() => onChange({ categorias: cats.filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar caja"><Icon icon={X} size="xs" /></button>
              </div>
              <textarea value={c.items.join('\n')} rows={3} onChange={(e) => onChange({ categorias: cats.map((x, j) => (j === i ? { ...x, items: e.target.value.split('\n') } : x)) })}
                placeholder="Lo que va en esta caja, uno por línea" className="w-full resize-none rounded-md border border-line bg-surface px-2 py-1 text-sm outline-none" />
            </div>
          ))}
          <button type="button" onClick={() => onChange({ categorias: [...cats, { nombre: '', items: [] }] }, true)} className="self-start text-xs font-semibold text-accent">+ caja</button>
        </div>
      )}

      {b.motor === 'memoria' && (
        <div className="flex flex-col gap-1.5">
          <Text size="xs" variant="muted">Cada pareja son dos cartas que se buscan entre sí.</Text>
          {(b.pares ?? []).map((par, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={par.izq} onChange={(e) => onChange({ pares: (b.pares ?? []).map((x, j) => (j === i ? { ...x, izq: e.target.value } : x)) })} placeholder="Una carta" className={filaChica} />
              <span className="text-ink-subtle">↔</span>
              <input value={par.der} onChange={(e) => onChange({ pares: (b.pares ?? []).map((x, j) => (j === i ? { ...x, der: e.target.value } : x)) })} placeholder="Su pareja" className={filaChica} />
              <button type="button" onClick={() => onChange({ pares: (b.pares ?? []).filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar"><Icon icon={X} size="xs" /></button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ pares: [...(b.pares ?? []), { izq: '', der: '' }] }, true)} className="self-start text-xs font-semibold text-accent">+ pareja</button>
        </div>
      )}

      {b.motor === 'contrarreloj' && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">Segundos
            <input type="number" value={b.segundos ?? 60} onChange={(e) => onChange({ segundos: Number(e.target.value) })} className="w-20 rounded-md border border-line bg-surface px-2 py-1" />
          </label>
          {qs.map((q, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-line bg-canvas p-2">
              <div className="flex items-center gap-2">
                <input value={q.texto} onChange={(e) => onChange({ preguntas: qs.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} placeholder={`Pregunta ${i + 1}`} className={cn(filaChica, 'font-medium')} />
                <button type="button" onClick={() => onChange({ preguntas: qs.filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar pregunta"><Icon icon={X} size="xs" /></button>
              </div>
              {q.opciones.map((o, k) => (
                <div key={k} className="flex items-center gap-2 pl-3">
                  <input type="radio" name={`q-${b.id}-${i}`} checked={q.correcta === k} onChange={() => onChange({ preguntas: qs.map((x, j) => (j === i ? { ...x, correcta: k } : x)) })} aria-label="La correcta" title="La correcta" />
                  <input value={o} onChange={(e) => onChange({ preguntas: qs.map((x, j) => (j === i ? { ...x, opciones: x.opciones.map((y, m) => (m === k ? e.target.value : y)) } : x)) })} placeholder={`Opción ${k + 1}`} className={filaChica} />
                </div>
              ))}
              <button type="button" onClick={() => onChange({ preguntas: qs.map((x, j) => (j === i ? { ...x, opciones: [...x.opciones, ''] } : x)) }, true)} className="self-start pl-3 text-xs font-semibold text-accent">+ opción</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ preguntas: [...qs, { texto: '', opciones: ['', ''], correcta: 0 }] }, true)} className="self-start text-xs font-semibold text-accent">+ pregunta</button>
        </div>
      )}
    </div>
  )
}

function Asignar({ abierto, onCerrar, actividadId, onAsignada }: { abierto: boolean; onCerrar: () => void; actividadId: string; onAsignada: (grupoId: string) => void }) {
  const grupos = useQuery({ queryKey: ['grupos'], queryFn: () => api.get<Grupo[]>('/api/grupos'), enabled: abierto })
  const [listo, setListo] = useState<string | null>(null)
  const [programar, setProgramar] = useState<string | null>(null)
  const asignar = useMutation({ mutationFn: (grupoId: string) => api.post(`/api/actividades/${actividadId}/asignar`, { grupoId }), onSuccess: (_, gid) => setListo(gid) })
  const gruposLista = useMemo(() => grupos.data ?? [], [grupos.data])
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Asignar a un grupo" descripcion="Asignada ahora, los chicos la ven en «Hoy». Programada para más adelante, les aparece cuando abre. Se congela una copia: si editás después, lo asignado no cambia." pie={<>{listo && <Button onClick={() => onAsignada(listo)}>Ir al grupo</Button>}<Button variant="ghost" onClick={onCerrar}>Cerrar</Button></>}>
      <div className="flex flex-col gap-2">
        {gruposLista.length === 0 && <Text variant="muted">Todavía no tenés grupos.</Text>}
        {gruposLista.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
            <div><div className="font-medium">{g.nombre}</div><Text size="xs" variant="muted">{g.aprendices} aprendices · código {g.codigo}</Text></div>
            {listo === g.id ? <Text size="sm" className="font-semibold text-success">Asignada ✓</Text> : (
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={() => asignar.mutate(g.id)} loading={asignar.isPending && asignar.variables === g.id}>Asignar ahora</Button>
                <Button size="sm" variant="ghost" onClick={() => setProgramar(g.id)}>Programar…</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {programar && (
        <Programar abierto onCerrar={() => setProgramar(null)} actividadId={actividadId} grupoIdInicial={programar}
          onListo={() => { setProgramar(null); setListo(programar) }} />
      )}
    </Modal>
  )
}
