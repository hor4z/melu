import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ChevronLeft, Eye, EyeOff, GripVertical, LayoutTemplate, Plus, Send, X } from 'lucide-react'
import { Button, Card, Chip, Eyebrow, Icon, Kbd, Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Text, Toggle, cn } from '@melu/ui'
import { api, newId, type Activity, type Block, type Criterion, type ManipulativeFigure, type Group, type Lens, type GameEngine, type BlockType } from '../lib/api'
import { IS_INTERACTIVE, SETTINGS, EXPERIENCES, FIGURES, GAMES, SOCIAL, BLOCK_TYPES, EVIDENCE_MEDIA } from '../lib/composition'
import { CompositionChips, Rotulo } from '../blocks/Chips'
import { InteractiveBlock, ReadingBlock, splitBlanks } from '../blocks/Interactive'
import { Modal } from '../blocks/Modal'
import { Cover } from '../blocks/Cover'

// The editor: a Notion-style page. Cover, title, properties, phases, blocks with "/" and drag.
export function Editor() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api.get<Activity>(`/api/activities/${id}`) })
  if (!q.data) return null
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
    const next = fn(prev); setStatus('editing'); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => save.mutate(next), 700); return next
  }), [save])
  const undo = useCallback(() => { const prev = history.current.pop(); if (prev) { setA(prev); setStatus('editing'); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => save.mutate(prev), 700) } }, [save])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo() } }
    window.addEventListener('keydown', onKey); return () => { window.removeEventListener('keydown', onKey); window.clearTimeout(timer.current) }
  }, [undo])

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link to="/activities" className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><Icon icon={ChevronLeft} size="sm" /> Actividades</Link>
          <div className="flex items-center gap-3"><Text size="xs" variant="muted">{{ saved: 'Guardado', editing: 'Editando…', saving: 'Guardando…' }[status]} · {totalBlocks} bloques</Text><Button size="sm" variant="ghost" startIcon={<Icon icon={preview ? EyeOff : Eye} />} onClick={() => setPreview((v) => !v)}>{preview ? 'Editar' : 'Ver como aprendiz'}</Button></div>
        </div>

        <Card className="overflow-hidden">
          <Cover title={a.title} className="h-36" size={96} />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <input value={a.title} onChange={(e) => change((x) => ({ ...x, title: e.target.value }), false)} aria-label="Título" placeholder="Sin título" readOnly={preview}
              className="w-full bg-transparent font-display text-4xl font-semibold tracking-tight outline-none placeholder:text-ink-subtle" />
            {/* Properties, Notion-style: each one is an inline menu */}
            <div className="grid gap-y-1 text-sm sm:grid-cols-[130px_1fr]">
              <Prop name="Experiencia"><Picker options={EXPERIENCES} value={a.composition.experience} onPick={(v) => setComp({ experience: v })} disabled={preview} /></Prop>
              <Prop name="Lente"><Picker options={Object.fromEntries((lenses.data ?? []).map((l) => [l.key, l.name]))} value={a.composition.lens} onPick={(v) => setComp({ lens: v })} disabled={preview} /></Prop>
              <Prop name="Escenario"><Picker multi options={SETTINGS} values={a.composition.setting ?? []} onToggle={(v) => setComp({ setting: (a.composition.setting ?? []).includes(v) ? (a.composition.setting ?? []).filter((x) => x !== v) : [...(a.composition.setting ?? []), v] })} disabled={preview} /></Prop>
              <Prop name="Social"><Picker options={SOCIAL} value={a.composition.social} onPick={(v) => setComp({ social: v })} disabled={preview} /></Prop>
              <Prop name="Disciplinas"><input value={(a.composition.disciplines ?? []).join(', ')} onChange={(e) => setComp({ disciplines: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} readOnly={preview} placeholder="Matemática · medida, Física · fuerzas" className="w-full rounded-sm px-1.5 py-0.5 hover:bg-hover focus:bg-hover focus:outline-none" /></Prop>
            </div>
            {preview && <CompositionChips c={a.composition} />}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 pt-2" role="tablist" aria-label="Fases">
            {a.document.phases.map((ff, i) => (
              <button key={ff.key} type="button" role="tab" aria-selected={i === phase} onClick={() => setPhase(i)} className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${i === phase ? 'border-ink font-semibold' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                <span className={`grid size-5 place-items-center rounded-sm text-[11px] font-bold ${i === phase ? 'bg-ink text-white' : 'bg-muted'}`}>{i + 1}</span>
                {i === phase && !preview ? <input value={ff.name} onChange={(e) => renamePhase(i, e.target.value)} onClick={(e) => e.stopPropagation()} className="w-28 bg-transparent outline-none" aria-label="Nombre de la fase" /> : ff.name}
              </button>
            ))}
            {!preview && <button type="button" onClick={addPhase} className="ml-1 flex items-center gap-1 px-2 py-2.5 text-sm text-ink-muted hover:text-ink"><Icon icon={Plus} size="sm" /> fase</button>}
          </div>
          <div className="p-5 sm:p-8">
            {f?.asks && !preview && <Text size="sm" variant="muted" className="mb-4">Esta fase pide: {f.asks}</Text>}
            {preview ? (
              <div className="flex flex-col gap-5">
                {f?.blocks.map((b) => IS_INTERACTIVE(b.type)
                  ? <div key={b.id} className="flex flex-col gap-3">{b.type !== 'fill_in' && <p className="font-display text-xl font-semibold tracking-tight">{b.text}</p>}<InteractiveBlock b={b} value={undefined} onChange={() => {}} status="editing" /></div>
                  : <ReadingBlock key={b.id} b={b} />)}
                {f?.blocks.length === 0 && <Text variant="muted">Esta fase está vacía.</Text>}
              </div>
            ) : (
              <div className="flex flex-col">
                {f?.blocks.map((b, i) => (
                  <BlockEditor key={b.id} b={b} idx={i} focused={focusRef === b.id} isFirst={i === 0} isLast={i === f.blocks.length - 1}
                    onChange={(p, snap) => refresh(b.id, p, snap)} onEnter={(rest) => insert(i + 1, 'paragraph', rest)} onRemove={() => remove(b.id)} onMove={(d) => moveBy(b.id, d)} onDrop={(target) => moveTo(b.id, target)} onPasteLines={(l) => paste(i + 1, l)} onFocusIn={() => setFocusRef(b.id)} />
                ))}
                <DropZone idx={f?.blocks.length ?? 0} onDropAt={(id, target) => moveTo(id, target)} />
                <button type="button" onClick={() => insert(f?.blocks.length ?? 0)} className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-ink-muted hover:bg-hover">
                  <Icon icon={Plus} size="sm" /> Escribí acá, o tipeá <Kbd>/</Kbd> para elegir un tipo de bloque
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <Card padding="sm" className="gap-2">
          <Button block onClick={() => setAssign(true)} startIcon={<Icon icon={Send} />}>Asignar a un grupo</Button>
          <Button block variant="secondary" loading={template.isPending} onClick={() => template.mutate()} startIcon={<Icon icon={LayoutTemplate} />}>{template.isSuccess ? 'Guardada como plantilla ✓' : 'Guardar como plantilla'}</Button>
          <Text size="xs" variant="muted">Una plantilla aparece en «Nueva actividad» para vos y para los guías de tu espacio.</Text>
        </Card>
        <Card padding="sm" className="gap-3">
          <div><Eyebrow>Rúbrica</Eyebrow><Text size="xs" variant="muted">Qué vas a mirar cuando corrijas. Tres niveles por criterio.</Text></div>
          {a.rubric.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-3">
              <textarea value={c.label} rows={2} onChange={(e) => setRubric(a.rubric.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label="Criterio" placeholder="Qué mirás" className="w-full resize-none bg-transparent text-sm font-medium outline-none placeholder:text-ink-subtle" />
              <div className="flex gap-1">{c.levels.map((n, k) => <input key={k} value={n} aria-label={`Nivel ${k + 1}`} onChange={(e) => setRubric(a.rubric.map((x, j) => (j === i ? { ...x, levels: x.levels.map((nn, kk) => (kk === k ? e.target.value : nn)) } : x)))} className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-1.5 py-1 text-xs" />)}</div>
              <button type="button" onClick={() => setRubric(a.rubric.filter((_, j) => j !== i))} className="self-end text-xs text-ink-subtle hover:text-danger">quitar</button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setRubric([...a.rubric, { id: newId(), label: '', levels: ['Todavía no', 'A veces', 'Siempre'] }])} startIcon={<Icon icon={Plus} />}>Agregar criterio</Button>
        </Card>
        <Card padding="sm" className="text-sm text-ink-muted">
          <Eyebrow>Atajos</Eyebrow>
          <ul className="mt-2 space-y-1"><li><Kbd>/</Kbd> tipo de bloque</li><li><Kbd>#</Kbd> título · <Kbd>-</Kbd> lista · <Kbd>&gt;</Kbd> destacado</li><li><Kbd>Enter</Kbd> nuevo bloque · <Kbd>⌘Z</Kbd> deshacer</li><li>Arrastrá el ⋮⋮ para reordenar. Pegar varias líneas crea varios bloques.</li></ul>
          {lensName && <p className="mt-3">Lente: <span className="font-medium text-ink">{lensName}</span>.</p>}
        </Card>
      </aside>

      <AssignDialog isOpen={assign} onClose={() => setAssign(false)} activityId={a.id} onAssigned={(gid) => nav(`/groups/${gid}`)} />
    </div>
  )
}

function Prop({ name, children }: { name: string; children: React.ReactNode }) {
  return <><span className="flex items-center py-1 text-ink-subtle">{name}</span><div className="flex flex-wrap items-center gap-1 py-1">{children}</div></>
}

type PickerProps = { options: Record<string, string>; disabled?: boolean } & ({ multi?: false; value?: string; onPick: (v: string) => void } | { multi: true; values: string[]; onToggle: (v: string) => void })
function Picker(p: PickerProps) {
  const [open, setOpen] = useState(false)
  const activeOnes = p.multi ? p.values : p.value ? [p.value] : []
  return (
    <Popover open={open} onOpenChange={setOpen} role="listbox">
      <PopoverTrigger>
        <button type="button" disabled={p.disabled} className="flex flex-wrap items-center gap-1 rounded-sm px-1.5 py-0.5 text-left outline-none hover:bg-hover focus-visible:ring-3 focus-visible:ring-focus/30 disabled:hover:bg-transparent">
          {activeOnes.length === 0 && <span className="text-ink-subtle">Elegir…</span>}
          {activeOnes.map((k) => <Chip key={k} size="sm">{p.options[k] ?? k}</Chip>)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-80 flex-wrap gap-1 p-2">
        {Object.entries(p.options).map(([k, l]) => (
          <Toggle key={k} size="sm" variant="outline" pressed={activeOnes.includes(k)}
            onPressedChange={() => { if (p.multi) p.onToggle(k); else { p.onPick(k); setOpen(false) } }}>{l}</Toggle>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function DropZone({ idx, onDropAt }: { idx: number; onDropAt: (id: string, target: number) => void }) {
  const [over, setOver] = useState(false)
  return <div onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/bloque'); if (id) onDropAt(id, idx) }} className={`h-2 rounded-full transition-colors ${over ? 'bg-brand-text' : ''}`} />
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
  const classes: Partial<Record<BlockType, string>> = { heading: 'font-display text-2xl font-semibold tracking-tight', callout: 'text-base font-medium text-accent' }
  const frameCls = t.semantic ? 'rounded-xl border border-line bg-canvas p-3' : b.type === 'callout' ? 'rounded-md border-l-4 border-brand-text bg-teal px-4 py-2' : ''

  return (
    <div className={`group relative -mx-2 flex gap-1 rounded-lg px-2 py-0.5 ${over ? 'shadow-[inset_0_2px_0_0_var(--accent-text)]' : ''}`} onFocus={onFocusIn}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/bloque'); if (id && id !== b.id) onDrop(idx) }}>
      <div className="flex w-16 shrink-0 items-start justify-end gap-0.5 pt-1.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" onClick={() => setMenu(menu === null ? '' : null)} className="rounded-sm p-1 text-ink-subtle hover:bg-hover" aria-label="Cambiar tipo" title={t.name}><Icon icon={Plus} size="sm" /></button>
        <span draggable onDragStart={(e) => { e.dataTransfer.setData('text/bloque', b.id); e.dataTransfer.effectAllowed = 'move' }} className="cursor-grab rounded-sm p-1 text-ink-subtle hover:bg-hover active:cursor-grabbing" aria-label="Arrastrar"><Icon icon={GripVertical} size="sm" /></span>
      </div>
      <Popover open={menu !== null} onOpenChange={(o) => !o && setMenu(null)} placement="bottom-start" role="menu">
      <div className={`relative min-w-0 flex-1 ${frameCls}`}>
        {t.semantic && <div className="mb-1 flex items-center justify-between"><Rotulo>{t.name}{b.type === 'evidence' && ` · ${EVIDENCE_MEDIA[b.media ?? 'photo']}`}</Rotulo><span className="flex opacity-0 group-hover:opacity-100"><button type="button" onClick={() => onMove(-1)} disabled={isFirst} className="rounded-sm p-0.5 text-ink-subtle hover:bg-hover disabled:opacity-30" aria-label="Subir"><Icon icon={ArrowUp} size="xs" /></button><button type="button" onClick={() => onMove(1)} disabled={isLast} className="rounded-sm p-0.5 text-ink-subtle hover:bg-hover disabled:opacity-30" aria-label="Bajar"><Icon icon={ArrowDown} size="xs" /></button><button type="button" onClick={onRemove} className="rounded-sm p-0.5 text-ink-subtle hover:text-danger" aria-label="Borrar"><Icon icon={X} size="xs" /></button></span></div>}
        <PopoverAnchor>
          <textarea ref={ref} value={menu !== null ? '/' + menu : b.text} rows={1} onChange={(e) => onInput(e.target.value)} onKeyDown={onKey} onPaste={onPaste} aria-label={t.name} placeholder={b.type === 'list' ? 'Un ítem por línea' : b.type === 'paragraph' ? 'Escribí, o "/" para elegir un bloque' : t.hint}
            className={`w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-ink-subtle ${classes[b.type] ?? (t.semantic ? 'font-medium' : 'text-base')}`} />
        </PopoverAnchor>
        <BlockDetail b={b} onChange={onChange} />
      </div>
      {/* Goes in a portal: otherwise the editor card clips the menu. And focus stays in the textarea. */}
      <PopoverContent manageFocus={false} className="w-80 p-1.5">
        {CATEGORIES.map(([cat, kinds]) => {
          const vis = kinds.filter((k) => !query || BLOCK_TYPES[k].name.toLowerCase().includes(query) || k.includes(query))
          if (!vis.length) return null
          return (
            <div key={cat}>
              <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{cat}</div>
              {vis.map((k) => (
                <button key={k} type="button" role="menuitem" onMouseDown={(e) => { e.preventDefault(); pick(k) }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-hover">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-canvas text-xs font-bold">{BLOCK_TYPES[k].name[0]}</span>
                  <span>
                    <span className="block text-sm font-medium">{BLOCK_TYPES[k].name}</span>
                    <span className="block text-xs text-ink-muted">{BLOCK_TYPES[k].hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )
        })}
        {CATEGORIES.every(([, kinds]) => !kinds.some((k) => !query || BLOCK_TYPES[k].name.toLowerCase().includes(query) || k.includes(query))) && (
          <p className="px-3 py-2 text-sm text-ink-muted">Ningún bloque coincide con «{query}».</p>
        )}
      </PopoverContent>
      </Popover>
    </div>
  )
}

const smallRow = 'flex-1 rounded-md border border-line bg-surface px-2 py-1 text-sm'

/** The fields specific to each type: options, answer, pairs, blanks, and the explanation. */
function BlockDetail({ b, onChange }: { b: Block; onChange: (p: Partial<Block>, snapshot?: boolean) => void }) {
  const t = BLOCK_TYPES[b.type]
  const listField = (field: 'options' | 'items', label: string, extra?: (o: string, i: number) => React.ReactNode) => (
    <div className="mt-2 flex flex-col gap-1.5">
      {((b[field] as string[]) ?? []).map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          {extra?.(o, i)}
          <input value={o} onChange={(e) => onChange({ [field]: ((b[field] as string[]) ?? []).map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`${label} ${i + 1}`} className={smallRow} />
          <button type="button" onClick={() => onChange({ [field]: ((b[field] as string[]) ?? []).filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar"><Icon icon={X} size="xs" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ [field]: [...((b[field] as string[]) ?? []), ''] }, true)} className="self-start text-xs font-semibold text-accent">+ {label.toLowerCase()}</button>
    </div>
  )
  return (
    <>
      {(b.type === 'choice' || b.type === 'check') && listField('options', 'Opción', (_, i) => (
        <input type="radio" name={`c-${b.id}`} checked={b.correct === i} onChange={() => onChange({ correct: i }, true)} aria-label="Correcta" title="La correcta" />
      ))}
      {b.type === 'multi' && listField('options', 'Opción', (_, i) => (
        <input type="checkbox" checked={(b.correctMulti ?? []).includes(i)} aria-label="Correcta" title="Cuenta como correcta"
          onChange={() => onChange({ correctMulti: (b.correctMulti ?? []).includes(i) ? (b.correctMulti ?? []).filter((x) => x !== i) : [...(b.correctMulti ?? []), i] }, true)} />
      ))}
      {b.type === 'order' && <><p className="mt-2 text-xs text-ink-subtle">En el orden correcto. Al chico le llegan mezclados.</p>{listField('items', 'Ítem')}</>}
      {b.type === 'number' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5">Respuesta<input type="number" value={b.answer ?? ''} onChange={(e) => onChange({ answer: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-24 rounded-md border border-line bg-surface px-2 py-1" /></label>
          <label className="flex items-center gap-1.5">± <input type="number" value={b.tolerance ?? 0} onChange={(e) => onChange({ tolerance: Number(e.target.value) })} className="w-20 rounded-md border border-line bg-surface px-2 py-1" /></label>
          <label className="flex items-center gap-1.5">Unidad<input value={b.unit ?? ''} onChange={(e) => onChange({ unit: e.target.value })} placeholder="cm" className="w-20 rounded-md border border-line bg-surface px-2 py-1" /></label>
        </div>
      )}
      {b.type === 'fill_in' && (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="text-xs text-ink-subtle">Escribí la frase con los huecos entre llaves dobles. Acá va lo que se espera en cada uno.</p>
          {splitBlanks(b.text).filter((x) => x.blank).map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 truncate text-ink-subtle">{h.text || `hueco ${i + 1}`}</span>
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
              <span className="text-ink-subtle">↔</span>
              <input value={p.right} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="va con esto" className={smallRow} />
              <button type="button" onClick={() => onChange({ pairs: (b.pairs ?? []).filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar"><Icon icon={X} size="xs" /></button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ pairs: [...(b.pairs ?? []), { left: '', right: '' }] }, true)} className="self-start text-xs font-semibold text-accent">+ par</button>
        </div>
      )}
      {b.type === 'game' && <GameConfig b={b} onChange={onChange} />}
      {b.type === 'manipulative' && <FigureConfig b={b} onChange={onChange} />}
      {b.type === 'evidence' && (
        <div className="mt-2 flex gap-1">{(['photo', 'audio', 'file'] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange({ media: k }, true)} className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', b.media === k ? 'border-ink bg-solid text-on-solid' : 'border-line')}>{EVIDENCE_MEDIA[k]}</button>
        ))}</div>
      )}
      {t?.grades && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-2">
          <input value={b.hint ?? ''} onChange={(e) => onChange({ hint: e.target.value })} placeholder="Pista (opcional): se pide antes de responder" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-subtle" />
          <input value={b.explanation ?? ''} onChange={(e) => onChange({ explanation: e.target.value })} placeholder="Explicación: se muestra después de responder" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-subtle" />
        </div>
      )}
    </>
  )
}

/** Figures are configured with a few numbers: the range, the parts or the equation. */
function FigureConfig({ b, onChange }: { b: Block; onChange: (p: Partial<Block>, snapshot?: boolean) => void }) {
  const num = (k: keyof Block, label: string, def?: number) => (
    <label key={k} className="flex items-center gap-1.5 text-sm">{label}
      <input type="number" step="any" value={(b[k] as number) ?? def ?? ''} onChange={(e) => onChange({ [k]: e.target.value === '' ? undefined : Number(e.target.value) })}
        className="w-20 rounded-md border border-line bg-surface px-2 py-1" />
    </label>
  )
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(FIGURES).map(([k, f]) => (
          <button key={k} type="button" onClick={() => onChange({ figure: k as ManipulativeFigure }, true)}
            className={cn('flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm font-medium', b.figure === k ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}>
            <span aria-hidden="true">{f.emoji}</span>{f.name}
          </button>
        ))}
      </div>
      {b.figure && <Text size="xs" variant="muted">{FIGURES[b.figure].hint}</Text>}
      <div className="flex flex-wrap items-center gap-3">
        {b.figure === 'number_line' && <>{num('min', 'Desde', 0)}{num('max', 'Hasta', 10)}{num('step', 'Paso', 0.25)}{num('answer', 'Respuesta')}{num('tolerance', '±', 0)}</>}
        {b.figure === 'fraction_bar' && <>{num('parts', 'Partes', 4)}{num('answer', 'Pintar')}</>}
        {b.figure === 'balance' && <><span className="text-sm text-ink-muted">a·x + b = c</span>{num('coefA', 'a', 1)}{num('coefB', 'b', 0)}{num('coefC', 'c', 0)}</>}
      </div>
    </div>
  )
}

/** A game is a mechanic with your content: first you pick which, then you load it. */
function GameConfig({ b, onChange }: { b: Block; onChange: (p: Partial<Block>, snapshot?: boolean) => void }) {
  const cats = b.categories ?? []
  const qs = b.questions ?? []
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(GAMES).map(([k, j]) => (
          <button key={k} type="button" onClick={() => onChange({ engine: k as GameEngine }, true)}
            className={cn('flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-sm font-medium', b.engine === k ? 'border-ink bg-solid text-on-solid' : 'border-line hover:border-ink')}>
            <span aria-hidden="true">{j.emoji}</span>{j.name}
          </button>
        ))}
      </div>
      {b.engine && <Text size="xs" variant="muted">{GAMES[b.engine].hint}</Text>}

      {b.engine === 'sort' && (
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-line bg-canvas p-2">
              <div className="flex items-center gap-2">
                <input value={c.name} onChange={(e) => onChange({ categories: cats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder={`Caja ${i + 1}`} className={cn(smallRow, 'font-medium')} />
                <button type="button" onClick={() => onChange({ categories: cats.filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar caja"><Icon icon={X} size="xs" /></button>
              </div>
              <textarea value={c.items.join('\n')} rows={3} onChange={(e) => onChange({ categories: cats.map((x, j) => (j === i ? { ...x, items: e.target.value.split('\n') } : x)) })}
                placeholder="Lo que va en esta caja, uno por línea" className="w-full resize-none rounded-md border border-line bg-surface px-2 py-1 text-sm outline-none" />
            </div>
          ))}
          <button type="button" onClick={() => onChange({ categories: [...cats, { name: '', items: [] }] }, true)} className="self-start text-xs font-semibold text-accent">+ caja</button>
        </div>
      )}

      {b.engine === 'memory' && (
        <div className="flex flex-col gap-1.5">
          <Text size="xs" variant="muted">Cada pareja son dos cartas que se buscan entre sí.</Text>
          {(b.pairs ?? []).map((duo, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={duo.left} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} placeholder="Una carta" className={smallRow} />
              <span className="text-ink-subtle">↔</span>
              <input value={duo.right} onChange={(e) => onChange({ pairs: (b.pairs ?? []).map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="Su pareja" className={smallRow} />
              <button type="button" onClick={() => onChange({ pairs: (b.pairs ?? []).filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar"><Icon icon={X} size="xs" /></button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ pairs: [...(b.pairs ?? []), { left: '', right: '' }] }, true)} className="self-start text-xs font-semibold text-accent">+ pareja</button>
        </div>
      )}

      {b.engine === 'time_attack' && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">Segundos
            <input type="number" value={b.seconds ?? 60} onChange={(e) => onChange({ seconds: Number(e.target.value) })} className="w-20 rounded-md border border-line bg-surface px-2 py-1" />
          </label>
          {qs.map((q, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border border-line bg-canvas p-2">
              <div className="flex items-center gap-2">
                <input value={q.text} onChange={(e) => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder={`Pregunta ${i + 1}`} className={cn(smallRow, 'font-medium')} />
                <button type="button" onClick={() => onChange({ questions: qs.filter((_, j) => j !== i) }, true)} className="text-ink-subtle hover:text-danger" aria-label="Quitar pregunta"><Icon icon={X} size="xs" /></button>
              </div>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2 pl-3">
                  <input type="radio" name={`q-${b.id}-${i}`} checked={q.correct === k} onChange={() => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, correct: k } : x)) })} aria-label="La correcta" title="La correcta" />
                  <input value={o} onChange={(e) => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, options: x.options.map((y, m) => (m === k ? e.target.value : y)) } : x)) })} placeholder={`Opción ${k + 1}`} className={smallRow} />
                </div>
              ))}
              <button type="button" onClick={() => onChange({ questions: qs.map((x, j) => (j === i ? { ...x, options: [...x.options, ''] } : x)) }, true)} className="self-start pl-3 text-xs font-semibold text-accent">+ opción</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ questions: [...qs, { text: '', options: ['', ''], correct: 0 }] }, true)} className="self-start text-xs font-semibold text-accent">+ pregunta</button>
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
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar a un grupo" description="Los chicos la ven en «Hoy». Se congela una copia: si editás después, lo asignado no cambia." footer={<>{ready && <Button onClick={() => onAssigned(ready)}>Ir al grupo</Button>}<Button variant="ghost" onClick={onClose}>Cerrar</Button></>}>
      <div className="flex flex-col gap-2">
        {groupList.length === 0 && <Text variant="muted">Todavía no tenés grupos.</Text>}
        {groupList.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
            <div><div className="font-medium">{g.name}</div><Text size="xs" variant="muted">{g.learners} aprendices · código {g.code}</Text></div>
            {ready === g.id ? <Text size="sm" className="font-semibold text-success">Asignada ✓</Text> : <Button size="sm" onClick={() => assign.mutate(g.id)} loading={assign.isPending && assign.variables === g.id}>Asignar</Button>}
          </div>
        ))}
      </div>
    </Modal>
  )
}
