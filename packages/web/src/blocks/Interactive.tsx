import { useEffect, useMemo, useState } from 'react'
import { Callout, Chip, Icon, IconButton, TextField, Textarea, type IconName } from '@milo/ui'
import type { Block, AnswerValue } from '../lib/api'
import { cn } from '../lib/cn'
import { GameBlock, gameScore } from './Games'
import { ManipulativeBlock } from './Manipulatives'

export type StepState = 'editing' | 'right' | 'wrong' | 'review'

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Parte "Un {{número}} más su mitad" en tramos de texto y huecos. */
export function splitBlanks(text: string) {
  return text.split(/(\{\{[^}]*\}\})/g).map((t) => (t.startsWith('{{') ? { blank: true, text: t.slice(2, -2).trim() } : { blank: false, text: t }))
}

/** ¿Está bien? `null` cuando el bloque no se corrige solo (pregunta abierta, evidencia, autorreporte). */
export function evaluate(b: Block, v: AnswerValue | undefined): boolean | null {
  if (v === undefined || v === null || v === '') return null
  switch (b.type) {
    case 'choice': case 'check':
      return b.correct === undefined ? null : v === b.correct
    case 'multi': {
      const expected = [...(b.correctMulti ?? [])].sort()
      const given = [...(v as number[])].sort()
      return expected.length > 0 && expected.length === given.length && expected.every((x, i) => x === given[i])
    }
    case 'number': {
      if (b.answer === undefined) return null
      const n = Number(String(v).replace(',', '.'))
      return Number.isFinite(n) && Math.abs(n - b.answer) <= (b.tolerance ?? 0)
    }
    case 'fill_in': {
      const expected = b.blanks ?? []
      const given = v as string[]
      return expected.length > 0 && expected.every((h, i) => norm(given?.[i] ?? '') === norm(h))
    }
    case 'order': {
      const given = v as string[]
      return (b.items ?? []).every((it, i) => given?.[i] === it)
    }
    case 'match': {
      const given = v as number[]
      return (b.pairs ?? []).length > 0 && (b.pairs ?? []).every((_, i) => given?.[i] === i)
    }
    case 'manipulative': {
      if (b.figure === 'balance') return (b.coefA ?? 1) * Number(v) + (b.coefB ?? 0) === (b.coefC ?? 0)
      if (b.answer === undefined) return null
      return Math.abs(Number(v) - b.answer) <= (b.tolerance ?? 0)
    }
    case 'game': {
      const { ok, total } = gameScore(b, v)
      if (!total) return null
      // En los juegos contrarreloj cuenta el rendimiento; en el resto, terminarlo bien.
      return b.engine === 'time_attack' ? ok / total >= 0.7 : ok === total
    }
    default:
      return null
  }
}

/** ¿Hay bastante puesto como para comprobar? */
export function hasValue(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false
  if (Array.isArray(v)) return v.length > 0 && v.every((x) => x !== '' && x !== -1 && x !== undefined)
  return String(v).trim() !== ''
}

/** Los bloques que solo se leen. */
export function ReadingBlock({ b }: { b: Block }) {
  switch (b.type) {
    case 'heading':
      return <h2 className="text-title font-semibold">{b.text}</h2>
    case 'list':
      return <ul className="list-disc space-y-1.5 pl-6 text-reading">{b.text.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
    case 'callout': {
      // La primera línea es el título del destacado y el resto el cuerpo, que es como se escribe
      // un aviso: "Antes de subir al primer piso" y abajo qué hacer. Sin salto, es solo el cuerpo.
      const [primera, ...resto] = b.text.split('\n')
      return (
        <Callout icon="lightbulb" color="orange" title={resto.length > 0 ? primera : undefined}>
          {resto.length > 0 ? resto.join('\n') : primera}
        </Callout>
      )
    }
    default:
      return <p className="text-reading">{b.text}</p>
  }
}

type Props = {
  b: Block
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  status: StepState
  /** Con `false`, un error no regala la respuesta: todavía pueden volver a intentar. */
  reveal?: boolean
}

const optionFrame = (picked: boolean, correct: boolean, status: StepState, reveal: boolean) => {
  if (reveal && correct) return 'border-ok bg-ok-subtle'
  if (status !== 'editing' && picked && !correct) return 'border-bad bg-bad-subtle'
  if (picked) return 'border-brand bg-brand-soft'
  return 'border-border bg-surface hover:border-border-strong'
}

/** Los bloques con los que el chico interactúa. Cada tipo es su propio componente, así los
 *  hooks viven siempre en el mismo lugar. */
export function InteractiveBlock({ reveal = true, ...rest }: Props) {
  const p = { ...rest, reveal: reveal || rest.status === 'right' }
  switch (p.b.type) {
    case 'choice': case 'check': return <ChoiceBlock {...p} />
    case 'multi': return <MultiBlock {...p} />
    case 'number': return <NumberBlock {...p} />
    case 'fill_in': return <FillIn {...p} />
    case 'order': return <OrderGame {...p} />
    case 'match': return <MatchGame {...p} />
    case 'question': return <Abierta {...p} />
    case 'self_report': return <SelfReport {...p} />
    case 'game': return <GameBlock {...p} />
    case 'manipulative': return <ManipulativeBlock {...p} />
    case 'evidence': return <EvidenceBlock {...p} />
    default: return null
  }
}

function ChoiceBlock({ b, value, onChange, status, reveal }: Props) {
  const ops = b.options ?? []
  return (
    <div className={cn('grid gap-3', ops.length > 3 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
      {ops.map((o, i) => (
        <button
          key={i} type="button" disabled={status !== 'editing'} onClick={() => onChange(i)}
          className={cn('flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-left text-reading transition-colors disabled:cursor-default',
            optionFrame(value === i, b.correct === i, status, Boolean(reveal)))}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-current text-meta font-semibold opacity-40">{String.fromCharCode(65 + i)}</span>
          <span className="flex-1">{o}</span>
          {reveal && b.correct === i && <Icon name="check" size={20} className="text-ok-ink" />}
          {status !== 'editing' && value === i && b.correct !== i && <Icon name="close" size={20} className="text-bad-ink" />}
        </button>
      ))}
    </div>
  )
}

function MultiBlock({ b, value, onChange, status, reveal }: Props) {
  const pickedOnes = (value as number[]) ?? []
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(b.options ?? []).map((o, i) => {
        const on = pickedOnes.includes(i)
        return (
          <button
            key={i} type="button" disabled={status !== 'editing'}
            onClick={() => onChange(on ? pickedOnes.filter((x) => x !== i) : [...pickedOnes, i])}
            className={cn('flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-4 text-left text-reading transition-colors disabled:cursor-default',
              optionFrame(on, (b.correctMulti ?? []).includes(i), status, Boolean(reveal)))}
          >
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] border-2', on ? 'border-transparent bg-surface-inverted text-text-inverted' : 'border-border-strong')}>
              {on && <Icon name="check" size={16} />}
            </span>
            <span className="flex-1">{o}</span>
          </button>
        )
      })}
    </div>
  )
}

function NumberBlock({ b, value, onChange, status }: Props) {
  return (
    <div className="flex items-center justify-center gap-3">
      <TextField
        inputMode="decimal" size="lg" disabled={status !== 'editing'} value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)} placeholder="0" aria-label={b.text}
        className="max-w-40"
      />
      {b.unit && <span className="text-reading text-text-muted">{b.unit}</span>}
    </div>
  )
}

function FillIn({ b, value, onChange, status, reveal }: Props) {
  const chunks = splitBlanks(b.text)
  const given = (value as string[]) ?? []
  let n = -1
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-3 text-reading">
      {chunks.map((t, i) => {
        if (!t.blank) return <span key={i}>{t.text}</span>
        n += 1
        const k = n
        const ok = norm(given[k] ?? '') === norm(b.blanks?.[k] ?? '')
        return (
          <span key={i} className="inline-flex flex-col items-center">
            <input
              value={given[k] ?? ''} disabled={status !== 'editing'} aria-label={`Hueco ${k + 1}`}
              onChange={(e) => { const c = [...given]; c[k] = e.target.value; onChange(c) }}
              style={{ width: `${Math.max(4, (b.blanks?.[k]?.length ?? 6) + 2)}ch` }}
              className={cn('field-focus rounded-[var(--radius-md)] border bg-surface px-2 py-1 text-center outline-none',
                status === 'editing' ? 'border-border' : ok ? 'border-ok bg-ok-subtle' : 'border-bad bg-bad-subtle')}
            />
            {reveal && !ok && <span className="mt-1 text-meta font-semibold text-ok-ink">{b.blanks?.[k]}</span>}
          </span>
        )
      })}
    </p>
  )
}

function OrderGame({ b, value, onChange, status, reveal }: Props) {
  const items = b.items ?? []
  // Se mezcla una vez y queda: rehacerlo en cada render pone la lista a bailar.
  useEffect(() => {
    if (((value as string[]) ?? []).length === items.length && items.length > 0) return
    if (!items.length) return
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] }
    if (shuffled.every((x, i) => x === items[i]) && items.length > 1) shuffled.reverse()
    onChange(shuffled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id])
  const sequence = ((value as string[]) ?? []).length ? (value as string[]) : items
  const moveBy = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= sequence.length) return; const c = [...sequence]; [c[i], c[j]] = [c[j], c[i]]; onChange(c) }
  return (
    <ol className="flex flex-col gap-2">
      {sequence.map((it, i) => {
        const ok = items[i] === it
        return (
          <li
            key={it}
            className={cn('flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3',
              status === 'editing' ? 'border-border bg-surface' : ok && reveal ? 'border-ok bg-ok-subtle' : ok ? 'border-border bg-surface' : 'border-bad bg-bad-subtle')}
          >
            <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-meta font-semibold">{i + 1}</span>
            <span className="flex-1">{it}</span>
            {status === 'editing' && (
              <span className="flex gap-1">
                <IconButton size="sm" variant="ghost" label="Subir" onClick={() => moveBy(i, -1)} disabled={i === 0} icon="arrow_upward" />
                <IconButton size="sm" variant="ghost" label="Bajar" onClick={() => moveBy(i, 1)} disabled={i === sequence.length - 1} icon="arrow_downward" />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function MatchGame({ b, value, onChange, status, reveal }: Props) {
  const pairs = b.pairs ?? []
  const [isOn, setIsOn] = useState<number | null>(null)
  const rights = useMemo(() => pairs.map((p, i) => ({ ...p, i })).sort((a, z) => a.right.localeCompare(z.right)), [pairs])
  const assigned = (value as number[]) ?? pairs.map(() => -1)
  const joinWords = (right: number) => {
    if (isOn === null) return
    const c = assigned.map((x) => (x === right ? -1 : x))
    c[isOn] = right
    onChange(c); setIsOn(null)
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      <ul className="flex flex-col gap-2">
        {pairs.map((p, i) => {
          const ok = assigned[i] === i
          return (
            <li key={p.left}>
              <button
                type="button" disabled={status !== 'editing'} onClick={() => setIsOn(isOn === i ? null : i)}
                className={cn('flex w-full items-center justify-between gap-2 rounded-[var(--radius-lg)] border px-3 py-3 text-left transition-colors',
                  status !== 'editing'
                    ? (ok ? (reveal ? 'border-ok bg-ok-subtle' : 'border-border bg-surface') : 'border-bad bg-bad-subtle')
                    : isOn === i ? 'border-brand bg-brand-soft' : assigned[i] >= 0 ? 'border-border-strong bg-surface-muted' : 'border-border bg-surface hover:border-border-strong')}
              >
                <span>{p.left}</span>
                {assigned[i] >= 0 && <Chip size="sm">{pairs[assigned[i]]?.right}</Chip>}
              </button>
            </li>
          )
        })}
      </ul>
      <ul className="flex flex-col gap-2">
        {rights.map((p) => {
          const used = assigned.includes(p.i)
          return (
            <li key={p.right}>
              <button
                type="button" disabled={status !== 'editing' || isOn === null} onClick={() => joinWords(p.i)}
                className={cn('w-full rounded-[var(--radius-lg)] border px-3 py-3 text-left transition-colors',
                  used ? 'border-border-strong bg-surface-muted text-text-muted' : isOn !== null ? 'border-brand bg-surface hover:bg-brand-soft' : 'border-border bg-surface')}
              >
                {p.right}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Abierta({ b, value, onChange, status }: Props) {
  return (
    <Textarea
      rows={4} disabled={status !== 'editing'} value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)} placeholder="Escribí acá..." aria-label={b.text}
    />
  )
}

function SelfReport({ value, onChange, status }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" disabled={status !== 'editing'} onClick={() => onChange(n)}
            className={cn('size-14 rounded-[var(--radius-lg)] border text-reading font-semibold transition-transform',
              value === n ? 'scale-105 border-transparent bg-surface-inverted text-text-inverted' : 'border-border bg-surface hover:border-border-strong')}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-meta text-text-muted">Solo lo ves vos y tu guía. Nunca es una nota.</p>
    </div>
  )
}

const EVIDENCE_ICON: Record<string, IconName> = { photo: 'image', audio: 'mic', file: 'attach_file' }

function EvidenceBlock({ b, value, onChange, status }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-dashed border-border-strong bg-surface-muted p-5">
      <span className="flex items-center gap-2 text-body font-semibold text-brand-ink">
        <Icon name={EVIDENCE_ICON[b.media ?? 'photo']} size={20} />
        {b.media === 'audio' ? 'Grabá un audio' : b.media === 'file' ? 'Subí el archivo' : 'Sacá una foto'}
      </span>
      <Textarea
        rows={2} disabled={status !== 'editing'} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}
        placeholder="Mientras no se pueden subir archivos, contá qué mostrarías" aria-label={b.text}
      />
    </div>
  )
}
