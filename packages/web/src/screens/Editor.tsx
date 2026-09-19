import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Breadcrumb, Button, Card, Chip, Icon, IconButton, Kbd, Popover, Segmented, Tab, TabList, Tabs,
  TextField, Textarea,
} from '@milo/ui'
import { api, newId, type Activity, type Block, type Criterion, type ManipulativeFigure, type Group, type Lens, type GameEngine, type BlockType } from '../lib/api'
import { IS_INTERACTIVE, SETTINGS, EXPERIENCES, FIGURES, GAMES, SOCIAL, BLOCK_TYPES, EVIDENCE_MEDIA } from '../lib/composition'
import { CompositionChips } from '../blocks/Chips'
import { InteractiveBlock, ReadingBlock, splitBlanks } from '../blocks/Interactive'
import { Modal } from '../blocks/Modal'
import { Cover } from '../blocks/Cover'
import { cn } from '../lib/cn'
import { Cargando, NoLlego } from '../blocks/Estado'

// El editor: una página. Portada, título, propiedades, fases, y bloques con "/" y arrastre.
export function Editor() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api.get<Activity>(`/api/activities/${id}`) })
  if (q.isPending) return <Cargando bloques={3} />
  if (!q.data) return <NoLlego que="la actividad" error={q.error} onRetry={() => void q.refetch()} />
  return <EditorLoaded key={q.data.id} initial={q.data} />
}

const newBlock = (type: BlockType): Block => ({
  id: newId(), type, text: '',
  ...(type === 'check' || type === 'choice' ? { options: ['', ''], correct: 0 } : {}),
  ...(type === 'evidence' ? { media: 'photo' as const } : {}),
  ...(type === 'game' ? { engine: 'sort' as GameEngine, categories: [{ name: '', items: [] }, { name: '', items: [] }] } : {}),
  ...(type === 'manipulative' ? { figure: 'number_line' as ManipulativeFigure, min: 0, max: 5, step: 0.25, answer: 2.5, tolerance: 0 } : {}),
})

function EditorLoaded({ initial }: { initial: Activity }) {
  const nav = useNavigate()
  const [a, setA] = useState(initial)
  const history = useRef<Activity[]>([])
  const [phase, setPhase] = useState(0)
  const [status, setStatus] = useState<'saved' | 'editing' | 'saving'>('saved')
  const [assign, setAssign] = useState(false)
  const [preview, setPreview] = useState(false)
  const [focusRef, setFocusRef] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const lenses = useQuery({ queryKey: ['lenses'], queryFn: () => api.get<Lens[]>('/api/lenses'), staleTime: Infinity })

  const save = useMutation({ mutationFn: (x: Activity) => api.put(`/api/activities/${x.id}`, x), onMutate: () => setStatus('saving'), onSuccess: () => setStatus('saved'), onError: () => setStatus('editing') })
  const template = useMutation({ mutationFn: () => api.post<Activity>(`/api/activities/${a.id}/template`) })
  const change = useCallback((fn: (x: Activity) => Activity, snapshot = true) => setA((prev) => {
    if (snapshot) { history.current.push(prev); if (history.current.length > 60) history.current.shift() }
    const next = fn(prev); setStatus('editing'); window.clearTimeout(timer.current)
    // El guardado automático espera a que la descripción esté: el servidor no acepta una
    // actividad muda, y reintentar cada tecla contra un 400 deja el cartel en "Editando" sin
    // decir por qué. Se dice arriba, al lado del estado.
    if (next.description.trim() !== '') timer.current = window.setTimeout(() => save.mutate(next), 700)
    return next
  }), [save])
  const undo = useCallback(() => { const prev = history.current.pop(); if (prev) { setA(prev); setStatus('editing'); window.clearTimeout(timer.current); if (prev.description.trim() !== '') timer.current = window.setTimeout(() => save.mutate(prev), 700) } }, [save])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo() } }
    window.addEventListener('keydown', onKey); return () => { window.removeEventListener('keydown', onKey) }
  }, [undo])
  // El timer del guardado se cancela al salir del editor y en ningún otro momento. Con las
  // dependencias vacías corre una sola vez, al desmontar.
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const f = a.document.phases[phase] ?? a.document.phases[0]
  const setBlocks = (blocks: Block[], snapshot = true) => change((x) => ({ ...x, document: { phases: x.document.phases.map((ff, i) => (i === phase ? { ...ff, blocks } : ff)) } }), snapshot)
  const insert = (idx: number, type: BlockType = 'paragraph', text = '') => { const b = { ...newBlock(type), text }; const arr = [...f.blocks]; arr.splice(idx, 0, b); setBlocks(arr); setFocusRef(b.id); return b.id }
  const refresh = (id: string, patch: Partial<Block>, snapshot = false) => setBlocks(f.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)), snapshot)
  const remove = (id: string) => { const i = f.blocks.findIndex((b) => b.id === id); setBlocks(f.blocks.filter((b) => b.id !== id)); setFocusRef(f.blocks[i - 1]?.id ?? null) }
  const moveBy = (id: string, d: -1 | 1) => { const i = f.blocks.findIndex((b) => b.id === id); const j = i + d; if (j < 0 || j >= f.blocks.length) return; const arr = [...f.blocks]; [arr[i], arr[j]] = [arr[j], arr[i]]; setBlocks(arr) }
  const moveTo = (id: string, target: number) => { const i = f.blocks.findIndex((b) => b.id === id); if (i < 0) return; const arr = [...f.blocks]; const [b] = arr.splice(i, 1); arr.splice(target > i ? target - 1 : target, 0, b); setBlocks(arr) }
  const paste = (idx: number, lines: string[]) => { const freshOnes = lines.map((t) => ({ ...newBlock('paragraph'), text: t })); const arr = [...f.blocks]; arr.splice(idx, 0, ...freshOnes); setBlocks(arr); setFocusRef(freshOnes[freshOnes.length - 1].id) }
  const setRubric = (rubric: Criterion[]) => change((x) => ({ ...x, rubric }))
  const setComp = (patch: Partial<Activity['composition']>) => change((x) => ({ ...x, composition: { ...x.composition, ...patch } }))
  const addPhase = () => change((x) => ({ ...x, document: { phases: [...x.document.phases, { key: newId(), name: `Fase ${x.document.phases.length + 1}`, blocks: [] }] } }))
  const renamePhase = (i: number, name: string) => change((x) => ({ ...x, document: { phases: x.document.phases.map((ff, k) => (k === i ? { ...ff, name } : ff)) } }), false)
  const totalBlocks = a.document.phases.reduce((n, ff) => n + ff.blocks.length, 0)
  const lensName = lenses.data?.find((l) => l.key === a.composition.lens)?.name

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb items={[{ label: 'Actividades', onClick: () => nav('/activities') }, { label: a.title || 'Sin título' }]} />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-x-3 text-meta text-text-muted">
              {a.description.trim() === ''
                ? <span className="font-semibold text-bad-ink">Falta la descripción</span>
                : <span>{{ saved: 'Guardado', editing: 'Editando', saving: 'Guardando' }[status]}</span>}
              <span>{totalBlocks} bloques</span>
            </span>
            <Button size="sm" variant="ghost" icon={preview ? 'visibility_off' : 'visibility'} onClick={() => setPreview((v) => !v)}>
              {preview ? 'Editar' : 'Ver como aprendiz'}
            </Button>
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-0">
          <Cover title={a.title} className="h-36 w-full rounded-t-[var(--radius-xl)]" size={64} />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <input
              value={a.title} onChange={(e) => change((x) => ({ ...x, title: e.target.value }), false)}
              aria-label="Título" placeholder="Sin título" readOnly={preview}
              className="w-full bg-transparent text-display outline-none placeholder:text-text-placeholder"
            />
            {/* Debajo del título, como en una página: es lo que se lee de la actividad en la
                biblioteca y en el grupo, así que se escribe acá y no en un formulario aparte. */}
            <textarea
              value={a.description}
              onChange={(e) => { e.target.style.height = '0'; e.target.style.height = `${e.target.scrollHeight}px`; change((x) => ({ ...x, description: e.target.value }), false) }}
              aria-label="Descripción" placeholder="Contá de qué se trata, para reconocerla sin abrirla" readOnly={preview} rows={1}
              ref={(el) => { if (el) { el.style.height = '0'; el.style.height = `${el.scrollHeight}px` } }}
              className="w-full resize-none bg-transparent text-reading text-text-muted outline-none placeholder:text-text-placeholder"
            />
            {/* Las propiedades, como en una página: cada una es un menú en la misma fila. */}
            <div className="grid gap-y-1 text-body sm:grid-cols-[130px_1fr]">
              <Prop name="Experiencia"><Picker options={EXPERIENCES} value={a.composition.experience} onPick={(v) => setComp({ experience: v })} disabled={preview} /></Prop>
              <Prop name="Lente"><Picker options={Object.fromEntries((lenses.data ?? []).map((l) => [l.key, l.name]))} value={a.composition.lens} onPick={(v) => setComp({ lens: v })} disabled={preview} /></Prop>
              <Prop name="Escenario"><Picker multi options={SETTINGS} values={a.composition.setting ?? []} onToggle={(v) => setComp({ setting: (a.composition.setting ?? []).includes(v) ? (a.composition.setting ?? []).filter((x) => x !== v) : [...(a.composition.setting ?? []), v] })} disabled={preview} /></Prop>
              <Prop name="Social"><Picker options={SOCIAL} value={a.composition.social} onPick={(v) => setComp({ social: v })} disabled={preview} /></Prop>
              <Prop name="Disciplinas">
                <input
                  value={(a.composition.disciplines ?? []).join(', ')}
                  onChange={(e) => setComp({ disciplines: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  readOnly={preview} placeholder="Matemática · medida, Física · fuerzas"
                  className="w-full rounded-[var(--radius-sm)] px-1.5 py-0.5 hover:bg-surface-muted focus:bg-surface-muted focus:outline-none"
                />
              </Prop>
            </div>
            {preview && <CompositionChips c={a.composition} />}
          </div>
        </Card>

        <Card className="flex flex-col p-0">
          <Tabs value={String(phase)} onValueChange={(v) => setPhase(Number(v))}>
            <TabList label="Fases">
              {a.document.phases.map((ff, i) => (
                <Tab key={ff.key} value={String(i)}>
                  {i === phase && !preview
                    ? <input value={ff.name} onChange={(e) => renamePhase(i, e.target.value)} onClick={(e) => e.stopPropagation()} className="w-28 bg-transparent outline-none" aria-label="Nombre de la fase" />
                    : ff.name}
                </Tab>
              ))}
            </TabList>
          </Tabs>
          {!preview && (
            <div className="px-5 pt-3">
              <Button size="sm" variant="ghost" icon="add" onClick={addPhase}>fase</Button>
            </div>
          )}
          <div className="p-5 sm:p-8">
            {f?.asks && !preview && <p className="mb-4 text-body text-text-muted">Esta fase pide: {f.asks}</p>}
            {preview
              ? (
                <div className="flex flex-col gap-5">
                  {f?.blocks.map((b) => IS_INTERACTIVE(b.type)
                    ? (
                      <div key={b.id} className="flex flex-col gap-3">
                        {b.type !== 'fill_in' && <p className="text-title">{b.text}</p>}
                        <InteractiveBlock b={b} value={undefined} onChange={() => {}} status="editing" />
                      </div>
                    )
                    : <ReadingBlock key={b.id} b={b} />)}
                  {f?.blocks.length === 0 && <p className="text-body text-text-muted">Esta fase está vacía.</p>}
                </div>
              )
              : (
                <div className="flex flex-col">
                  {f?.blocks.map((b, i) => (
                    <BlockEditor
                      key={b.id} b={b} idx={i} focused={focusRef === b.id} isFirst={i === 0} isLast={i === f.blocks.length - 1}
                      onChange={(p, snap) => refresh(b.id, p, snap)} onEnter={(rest) => insert(i + 1, 'paragraph', rest)}
                      onRemove={() => remove(b.id)} onMove={(d) => moveBy(b.id, d)} onDrop={(target) => moveTo(b.id, target)}
                      onPasteLines={(l) => paste(i + 1, l)} onFocusIn={() => setFocusRef(b.id)}
                    />
                  ))}
                  <DropZone idx={f?.blocks.length ?? 0} onDropAt={(id, target) => moveTo(id, target)} />
                  <Button variant="ghost" icon="add" className="mt-1 justify-start font-normal text-text-muted" onClick={() => insert(f?.blocks.length ?? 0)}>
                    <span>Escribí acá, o tipeá <Kbd>/</Kbd> para elegir un tipo de bloque</span>
                  </Button>
                </div>
              )}
          </div>
        </Card>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <Card className="flex flex-col gap-2 p-3">
          <Button block variant="brand" icon="send" onClick={() => setAssign(true)}>Asignar a un grupo</Button>
          <Button block variant="muted" icon="widgets" disabled={template.isPending} onClick={() => template.mutate()}>
            {template.isSuccess ? 'Guardada como plantilla' : 'Guardar como plantilla'}
          </Button>
          <p className="text-meta text-text-muted">Una plantilla aparece en "Nueva actividad" para vos y para los guías de tu espacio.</p>
        </Card>

        <Card className="flex flex-col gap-3 p-3">
          <div>
            <span className="text-meta text-text-muted">Rúbrica</span>
            <p className="text-meta text-text-muted">Qué vas a mirar cuando corrijas. Tres niveles por criterio.</p>
          </div>
          {a.rubric.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-canvas p-3">
              <Textarea
                value={c.label} rows={2} aria-label="Criterio" placeholder="Qué mirás"
                onChange={(e) => setRubric(a.rubric.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <div className="flex flex-col gap-1">
                {c.levels.map((n, k) => (
                  <TextField
                    key={k} size="sm" value={n} aria-label={`Nivel ${k + 1}`}
                    onChange={(e) => setRubric(a.rubric.map((x, j) => (j === i ? { ...x, levels: x.levels.map((nn, kk) => (kk === k ? e.target.value : nn)) } : x)))}
                  />
                ))}
              </div>
              <Button size="sm" variant="ghost" className="self-end" onClick={() => setRubric(a.rubric.filter((_, j) => j !== i))}>Quitar</Button>
            </div>
          ))}
          <Button size="sm" variant="muted" icon="add" onClick={() => setRubric([...a.rubric, { id: newId(), label: '', levels: ['Todavía no', 'A veces', 'Siempre'] }])}>
            Agregar criterio
          </Button>
        </Card>

        <Card className="flex flex-col gap-2 p-3 text-body text-text-muted">
          <span className="text-meta text-text-muted">Atajos</span>
          <ul className="flex flex-col gap-1">
            <li><Kbd>/</Kbd> tipo de bloque</li>
            <li className="flex flex-wrap gap-x-4"><span><Kbd>#</Kbd> título</span><span><Kbd>-</Kbd> lista</span><span><Kbd>&gt;</Kbd> destacado</span></li>
            <li className="flex flex-wrap gap-x-4"><span><Kbd>Enter</Kbd> nuevo bloque</span><span><Kbd>⌘Z</Kbd> deshacer</span></li>
            <li>Arrastrá el asa para reordenar. Pegar varias líneas crea varios bloques.</li>
          </ul>
          {lensName && <p>Lente: <span className="font-semibold text-text">{lensName}</span>.</p>}
        </Card>
      </aside>

      <AssignDialog isOpen={assign} onClose={() => setAssign(false)} activityId={a.id} onAssigned={(gid) => nav(`/groups/${gid}`)} />
    </div>
  )
}

function Prop({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <span className="flex items-center py-1 text-text-muted">{name}</span>
      <div className="flex flex-wrap items-center gap-1 py-1">{children}</div>
    </>
  )
}

type PickerProps = { options: Record<string, string>; disabled?: boolean } & ({ multi?: false; value?: string; onPick: (v: string) => void } | { multi: true; values: string[]; onToggle: (v: string) => void })

function Picker(p: PickerProps) {
  const activeOnes = p.multi ? p.values : p.value ? [p.value] : []
  return (
    <Popover
      align="start"
      width={320}
      trigger={({ onClick, ref, 'aria-expanded': expanded }) => (
        // El único control de la app que no es una pieza del sistema, y a propósito: en una fila
        // de propiedades tiene que leerse como contenido y no como un control, hasta que se lo
        // pasa por encima. Lo que muestra adentro son chips.
        <button
          ref={ref} type="button" disabled={p.disabled} onClick={onClick} aria-expanded={expanded}
          className="flex flex-wrap items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left hover:bg-surface-muted disabled:hover:bg-transparent"
        >
          {activeOnes.length === 0 && <span className="text-text-placeholder">Elegir</span>}
          {activeOnes.map((k) => <Chip key={k} size="sm">{p.options[k] ?? k}</Chip>)}
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-wrap gap-1 p-2">
          {Object.entries(p.options).map(([k, l]) => (
            <Chip
              key={k} size="sm" active={activeOnes.includes(k)}
              onClick={() => { if (p.multi) p.onToggle(k); else { p.onPick(k); close() } }}
            >
              {l}
            </Chip>
          ))}
        </div>
      )}
    </Popover>
  )
}

function DropZone({ idx, onDropAt }: { idx: number; onDropAt: (id: string, target: number) => void }) {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/bloque'); if (id) onDropAt(id, idx) }}
      className={cn('h-2 rounded-full transition-colors', over && 'bg-brand')}
    />
  )
}

const CATEGORIES: [string, BlockType[]][] = [
  ['Texto', ['paragraph', 'heading', 'list', 'callout']],
  ['Se corrige solo', ['choice', 'multi', 'number', 'fill_in', 'order', 'match']],
  ['Juegos', ['game', 'manipulative']],
  ['Lo mira el docente', ['question', 'evidence', 'self_report']],
]

function BlockEditor({ b, idx, focused, isFirst, isLast, onChange, onEnter, onRemove, onMove, onDrop, onPasteLines, onFocusIn }: {
  b: Block; idx: number; focused: boolean; isFirst: boolean; isLast: boolean
  onChange: (p: Partial<Block>, snapshot?: boolean) => void; onEnter: (rest: string) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; onDrop: (target: number) => void; onPasteLines: (lines: string[]) => void; onFocusIn: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  useEffect(() => { if (focused) ref.current?.focus() }, [focused])
  useEffect(() => { const el = ref.current; if (el) { el.style.height = '0'; el.style.height = el.scrollHeight + 'px' } }, [b.text, b.type])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menu !== null) { if (e.key === 'Escape') { setMenu(null); e.preventDefault() } return }
    if (e.key === 'Enter' && !e.shiftKey && b.type !== 'list') { e.preventDefault(); const el = e.currentTarget; const pos = el.selectionStart; const before = b.text.slice(0, pos), rest = b.text.slice(pos); if (rest) onChange({ text: before }, true); onEnter(rest) }
    if (e.key === 'Backspace' && b.text === '') { e.preventDefault(); if (b.type !== 'paragraph') onChange({ type: 'paragraph' }, true); else onRemove() }
  }
  const onInput = (v: string) => {
    if (v.startsWith('/') && b.text === '') { setMenu(v.slice(1)); return }
    if (menu !== null) { setMenu(v.slice(1)); return }
    if (b.type === 'paragraph' && b.text === '') {
      if (v === '# ') { onChange({ type: 'heading', text: '' }, true); return }
      if (v === '- ') { onChange({ type: 'list', text: '' }, true); return }
      if (v === '> ') { onChange({ type: 'callout', text: '' }, true); return }
    }
    onChange({ text: v })
  }
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const t = e.clipboardData.getData('text/plain'); const lines = t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (lines.length > 1 && b.type !== 'list') { e.preventDefault(); if (b.text === '') { onChange({ text: lines[0] }, true); onPasteLines(lines.slice(1)) } else onPasteLines(lines) }
  }
  const pick = (type: BlockType) => { setMenu(null); onChange({ ...newBlock(type), id: b.id }, true); ref.current?.focus() }
  const query = (menu ?? '').toLowerCase()
  const t = BLOCK_TYPES[b.type]
  const classes: Partial<Record<BlockType, string>> = { heading: 'text-title', callout: 'text-reading font-semibold text-brand-ink' }
  const frameCls = t.semantic
    ? 'rounded-[var(--radius-xl)] border border-border bg-canvas p-3'
    : b.type === 'callout' ? 'rounded-[var(--radius-md)] border-l-4 border-brand bg-brand-soft px-4 py-2' : ''

  return (
    <div
      className={cn('group relative -mx-2 flex gap-1 rounded-[var(--radius-lg)] px-2 py-0.5', over && 'shadow-[inset_0_2px_0_0_var(--brand)]')}
      onFocus={onFocusIn}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/bloque'); if (id && id !== b.id) onDrop(idx) }}
    >
      <div className="flex w-16 shrink-0 items-start justify-end gap-0.5 pt-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton size="sm" variant="ghost" label="Cambiar tipo" title={t.name} onClick={() => setMenu(menu === null ? '' : null)} icon="add" />
        <span
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('text/bloque', b.id); e.dataTransfer.effectAllowed = 'move' }}
          className="cursor-grab rounded-[var(--radius-sm)] p-1 hover:bg-surface-muted active:cursor-grabbing"
          aria-label="Arrastrar"
        >
          <Icon name="drag_indicator" size={16} className="icon-muted" />
        </span>
      </div>

      <div className={cn('relative min-w-0 flex-1', frameCls)}>
        {t.semantic && (
          <div className="mb-1 flex items-center justify-between">
            <span className="text-meta text-brand-ink">
              {t.name}
              {b.type === 'evidence' && <span className="ml-2 text-text-muted">{EVIDENCE_MEDIA[b.media ?? 'photo']}</span>}
            </span>
            <span className="flex gap-0.5 opacity-0 group-hover:opacity-100">
              <IconButton size="sm" variant="ghost" label="Subir" onClick={() => onMove(-1)} disabled={isFirst} icon="arrow_upward" />
              <IconButton size="sm" variant="ghost" label="Bajar" onClick={() => onMove(1)} disabled={isLast} icon="arrow_downward" />
              <IconButton size="sm" variant="ghost" label="Borrar" onClick={onRemove} icon="close" />
            </span>
          </div>
        )}

        <textarea
          ref={ref} value={menu !== null ? '/' + menu : b.text} rows={1}
          onChange={(e) => onInput(e.target.value)} onKeyDown={onKey} onPaste={onPaste} aria-label={t.name}
          placeholder={b.type === 'list' ? 'Un ítem por línea' : b.type === 'paragraph' ? 'Escribí, o "/" para elegir un bloque' : t.hint}
          className={cn('w-full resize-none bg-transparent outline-none placeholder:text-text-placeholder', classes[b.type] ?? (t.semantic ? 'font-semibold' : 'text-reading'))}
        />

        {/* El menú de tipos queda anclado al bloque y el foco no se mueve del textarea: lo que
            se tipea después de la barra sigue filtrando. */}
        {menu !== null && (
          <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-[var(--radius-xl)] bg-popover p-1.5 shadow-[var(--relief-popover)]" role="menu">
            {CATEGORIES.map(([cat, kinds]) => {
              const vis = kinds.filter((k) => !query || BLOCK_TYPES[k].name.toLowerCase().includes(query) || k.includes(query))
              if (!vis.length) return null
              return (
                <div key={cat}>
                  <div className="px-2 pb-1 pt-2 text-meta uppercase text-text-muted">{cat}</div>
                  {vis.map((k) => (
                    <button
                      key={k} type="button" role="menuitem" onMouseDown={(e) => { e.preventDefault(); pick(k) }}
                      className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-2 py-1.5 text-left hover:bg-surface-muted"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] border border-border bg-canvas text-meta font-semibold">{BLOCK_TYPES[k].name[0]}</span>
                      <span>
                        <span className="block text-body font-semibold">{BLOCK_TYPES[k].name}</span>
                        <span className="block text-meta text-text-muted">{BLOCK_TYPES[k].hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
            {CATEGORIES.every(([, kinds]) => !kinds.some((k) => !query || BLOCK_TYPES[k].name.toLowerCase().includes(query) || k.includes(query))) && (
              <p className="px-3 py-2 text-body text-text-muted">Ningún bloque coincide con "{query}".</p>
            )}
          </div>
        )}

        <BlockDetail b={b} onChange={onChange} />
      </div>
    </div>
  )
}

const smallRow = 'field-focus flex-1 rounded-[var(--radius-md)] border border-border bg-surface px-2 py-1 text-body outline-none'
const numberBox = 'field-focus w-20 rounded-[var(--radius-md)] border border-border bg-surface px-2 py-1 outline-none'

/** Los campos propios de cada tipo: opciones, respuesta, pares, huecos y la explicación. */
function BlockDetail({ b, onChange }: { b: Block; onChange: (p: Partial<Block>, snapshot?: boolean) => void }) {
  const t = BLOCK_TYPES[b.type]
  const listField = (field: 'options' | 'items', label: string, extra?: (o: string, i: number) => React.ReactNode) => (
    <div className="mt-2 flex flex-col gap-1.5">
      {((b[field] as string[]) ?? []).map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          {extra?.(o, i)}
          <input value={o} onChange={(e) => onChange({ [field]: ((b[field] as string[]) ?? []).map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`${label} ${i + 1}`} className={smallRow} />
          <button type="button" onClick={() => onChange({ [field]: ((b[field] as string[]) ?? []).filter((_, j) => j !== i) }, true)} className="text-text-muted hover:text-bad-ink" aria-label="Quitar">
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ [field]: [...((b[field] as string[]) ?? []), ''] }, true)} className="self-start text-meta font-semibold text-brand-ink">+ {label.toLowerCase()}</button>
    </div>
  )
  return (
    <>
      {(b.type === 'choice' || b.type === 'check') && listField('options', 'Opción', (_, i) => (
        <input type="radio" name={`c-${b.id}`} checked={b.correct === i} onChange={() => onChange({ correct: i }, true)} aria-label="Correcta" title="La correcta" />
      ))}
      {b.type === 'multi' && listField('options', 'Opción', (_, i) => (
        <input
          type="checkbox" checked={(b.correctMulti ?? []).includes(i)} aria-label="Correcta" title="Cuenta como correcta"
          onChange={() => onChange({ correctMulti: (b.correctMulti ?? []).includes(i) ? (b.correctMulti ?? []).filter((x) => x !== i) : [...(b.correctMulti ?? []), i] }, true)}
        />
      ))}
      {b.type === 'order' && <><p className="mt-2 text-meta text-text-muted">En el orden correcto. Al chico le llegan mezclados.</p>{listField('items', 'Ítem')}</>}
      {b.type === 'number' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-body">
          <label className="flex items-center gap-1.5">Respuesta<input type="number" value={b.answer ?? ''} onChange={(e) => onChange({ answer: e.target.value === '' ? undefined : Number(e.target.value) })} className={numberBox} /></label>
          <label className="flex items-center gap-1.5">± <input type="number" value={b.tolerance ?? 0} onChange={(e) => onChange({ tolerance: Number(e.target.value) })} className={numberBox} /></label>
          <label className="flex items-center gap-1.5">Unidad<input value={b.unit ?? ''} onChange={(e) => onChange({ unit: e.target.value })} placeholder="cm" className={numberBox} /></label>
        </div>
      )}
      {b.type === 'fill_in' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="text-meta text-text-muted">Escribí la frase con los huecos entre llaves dobles. Acá va lo que se espera en cada uno.</p>
          {splitBlanks(b.text).filter((x) => x.blank).map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-body">
              <span className="w-24 shrink-0 truncate text-text-muted">{h.text || `hueco ${i + 1}`}</span>
              <input value={b.blanks?.[i] ?? ''} onChange={(e) => { const c = [...(b.blanks ?? [])]; c[i] = e.target.value; onChange({ blanks: c }) }} placeholder="Respuesta" className={smallRow} />
            </div>
          ))}
        </div>
      )}
      {b.type === 'match' && (
        <div className="mt-2 flex flex-col gap-1.5">
          {(b.pairs ?? []).map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p.left} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} placeholder="Esto" className={smallRow} />
              <span className="text-text-muted">↔</span>
              <input value={p.right} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="va con esto" className={smallRow} />
              <button type="button" onClick={() => onChange({ pairs: (b.pairs ?? []).filter((_, j) => j !== i) }, true)} className="text-text-muted hover:text-bad-ink" aria-label="Quitar">
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ pairs: [...(b.pairs ?? []), { left: '', right: '' }] }, true)} className="self-start text-meta font-semibold text-brand-ink">+ par</button>
        </div>
      )}
      {b.type === 'game' && <GameConfig b={b} onChange={onChange} />}
      {b.type === 'manipulative' && <FigureConfig b={b} onChange={onChange} />}
      {b.type === 'evidence' && (
        <div className="mt-2">
          <Segmented
            size="sm" label="Qué se entrega" value={b.media ?? 'photo'}
            onChange={(v) => onChange({ media: v as 'photo' | 'audio' | 'file' }, true)}
            options={(['photo', 'audio', 'file'] as const).map((k) => ({ value: k, label: EVIDENCE_MEDIA[k] }))}
          />
        </div>
      )}
      {t?.grades && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-2">
          <input value={b.hint ?? ''} onChange={(e) => onChange({ hint: e.target.value })} placeholder="Pista (opcional): se pide antes de responder" className="w-full bg-transparent text-body outline-none placeholder:text-text-placeholder" />
          <input value={b.explanation ?? ''} onChange={(e) => onChange({ explanation: e.target.value })} placeholder="Explicación: se muestra después de responder" className="w-full bg-transparent text-body outline-none placeholder:text-text-placeholder" />
        </div>
      )}
    </>
  )
}

/** Las figuras se configuran con unos pocos números: el rango, las partes o la ecuación. */
function FigureConfig({ b, onChange }: { b: Block; onChange: (p: Partial<Block>, snapshot?: boolean) => void }) {
  const num = (k: keyof Block, label: string, def?: number) => (
    <label key={k} className="flex items-center gap-1.5 text-body">
      {label}
      <input
        type="number" step="any" value={(b[k] as number) ?? def ?? ''}
        onChange={(e) => onChange({ [k]: e.target.value === '' ? undefined : Number(e.target.value) })}
        className={numberBox}
      />
    </label>
  )
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(FIGURES).map(([k, f]) => (
          <Chip key={k} active={b.figure === k} onClick={() => onChange({ figure: k as ManipulativeFigure }, true)}>
            <span aria-hidden="true" className="mr-1">{f.emoji}</span>{f.name}
          </Chip>
        ))}
      </div>
      {b.figure && <p className="text-meta text-text-muted">{FIGURES[b.figure].hint}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {b.figure === 'number_line' && <>{num('min', 'Desde', 0)}{num('max', 'Hasta', 10)}{num('step', 'Paso', 0.25)}{num('answer', 'Respuesta')}{num('tolerance', '±', 0)}</>}
        {b.figure === 'fraction_bar' && <>{num('parts', 'Partes', 4)}{num('answer', 'Pintar')}</>}
        {b.figure === 'balance' && <><span className="text-body text-text-muted">a·x + b = c</span>{num('coefA', 'a', 1)}{num('coefB', 'b', 0)}{num('coefC', 'c', 0)}</>}
      </div>
    </div>
  )
}

/** Un juego es una mecánica con tu contenido: primero elegís cuál, después lo cargás. */
function GameConfig({ b, onChange }: { b: Block; onChange: (p: Partial<Block>, snapshot?: boolean) => void }) {
  const cats = b.categories ?? []
  const qs = b.questions ?? []
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(GAMES).map(([k, j]) => (
          <Chip key={k} active={b.engine === k} onClick={() => onChange({ engine: k as GameEngine }, true)}>
            <span aria-hidden="true" className="mr-1">{j.emoji}</span>{j.name}
          </Chip>
        ))}
      </div>
      {b.engine && <p className="text-meta text-text-muted">{GAMES[b.engine].hint}</p>}

      {b.engine === 'sort' && (
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-border bg-canvas p-2">
              <div className="flex items-center gap-2">
                <input value={c.name} onChange={(e) => onChange({ categories: cats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder={`Caja ${i + 1}`} className={cn(smallRow, 'font-semibold')} />
                <button type="button" onClick={() => onChange({ categories: cats.filter((_, j) => j !== i) }, true)} className="text-text-muted hover:text-bad-ink" aria-label="Quitar caja">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <textarea
                value={c.items.join('\n')} rows={3}
                onChange={(e) => onChange({ categories: cats.map((x, j) => (j === i ? { ...x, items: e.target.value.split('\n') } : x)) })}
                placeholder="Lo que va en esta caja, uno por línea"
                className="field-focus w-full resize-none rounded-[var(--radius-md)] border border-border bg-surface px-2 py-1 text-body outline-none"
              />
            </div>
          ))}
          <button type="button" onClick={() => onChange({ categories: [...cats, { name: '', items: [] }] }, true)} className="self-start text-meta font-semibold text-brand-ink">+ caja</button>
        </div>
      )}

      {b.engine === 'memory' && (
        <div className="flex flex-col gap-1.5">
          <p className="text-meta text-text-muted">Cada pareja son dos cartas que se buscan entre sí.</p>
          {(b.pairs ?? []).map((duo, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={duo.left} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} placeholder="Una carta" className={smallRow} />
              <span className="text-text-muted">↔</span>
              <input value={duo.right} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="Su pareja" className={smallRow} />
              <button type="button" onClick={() => onChange({ pairs: (b.pairs ?? []).filter((_, j) => j !== i) }, true)} className="text-text-muted hover:text-bad-ink" aria-label="Quitar">
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ pairs: [...(b.pairs ?? []), { left: '', right: '' }] }, true)} className="self-start text-meta font-semibold text-brand-ink">+ pareja</button>
        </div>
      )}

      {b.engine === 'time_attack' && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-body">
            Segundos
            <input type="number" value={b.seconds ?? 60} onChange={(e) => onChange({ seconds: Number(e.target.value) })} className={numberBox} />
          </label>
          {qs.map((q, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-border bg-canvas p-2">
              <div className="flex items-center gap-2">
                <input value={q.text} onChange={(e) => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder={`Pregunta ${i + 1}`} className={cn(smallRow, 'font-semibold')} />
                <button type="button" onClick={() => onChange({ questions: qs.filter((_, j) => j !== i) }, true)} className="text-text-muted hover:text-bad-ink" aria-label="Quitar pregunta">
                  <Icon name="close" size={16} />
                </button>
              </div>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2 pl-3">
                  <input type="radio" name={`q-${b.id}-${i}`} checked={q.correct === k} onChange={() => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, correct: k } : x)) })} aria-label="La correcta" title="La correcta" />
                  <input value={o} onChange={(e) => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, options: x.options.map((y, m) => (m === k ? e.target.value : y)) } : x)) })} placeholder={`Opción ${k + 1}`} className={smallRow} />
                </div>
              ))}
              <button type="button" onClick={() => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, options: [...x.options, ''] } : x)) }, true)} className="self-start pl-3 text-meta font-semibold text-brand-ink">+ opción</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ questions: [...qs, { text: '', options: ['', ''], correct: 0 }] }, true)} className="self-start text-meta font-semibold text-brand-ink">+ pregunta</button>
        </div>
      )}
    </div>
  )
}

function AssignDialog({ isOpen, onClose, activityId, onAssigned }: { isOpen: boolean; onClose: () => void; activityId: string; onAssigned: (groupId: string) => void }) {
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => api.get<Group[]>('/api/groups'), enabled: isOpen })
  const [ready, setReady] = useState<string | null>(null)
  const assign = useMutation({ mutationFn: (groupId: string) => api.post(`/api/activities/${activityId}/assign`, { groupId }), onSuccess: (_, gid) => setReady(gid) })
  const groupList = useMemo(() => groups.data ?? [], [groups.data])
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title="Asignar a un grupo"
      description='Los chicos la ven en "Hoy". Se congela una copia: si editás después, lo asignado no cambia.'
      footer={<>
        {ready && <Button variant="brand" onClick={() => onAssigned(ready)}>Ir al grupo</Button>}
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </>}
    >
      <div className="flex flex-col gap-2">
        {groupList.length === 0 && <p className="text-body text-text-muted">Todavía no tenés grupos.</p>}
        {groupList.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-[var(--radius-xl)] border border-border px-4 py-3">
            <div>
              <div className="text-body font-semibold">{g.name}</div>
              <div className="text-meta text-text-muted">{g.learners} aprendices</div>
            </div>
            {ready === g.id
              ? <span className="text-body font-semibold text-ok-ink">Asignada</span>
              : <Button size="sm" variant="muted" disabled={assign.isPending && assign.variables === g.id} onClick={() => assign.mutate(g.id)}>Asignar</Button>}
          </div>
        ))}
      </div>
    </Modal>
  )
}
