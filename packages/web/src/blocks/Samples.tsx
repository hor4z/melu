// The four ways of telling the same thing. They are not illustrations of "see / listen / read / do":
// they are the real explanation, four times over. That is why the onboarding question can be answered
// without introspection: you pick the one that worked, not the one you think works.
//
// And the concept has to be within reach: to a six-year-old "a third" means nothing.
// That is why each band has its own concepts. The mechanic is identical; what changes is what
// is explained, and in how many words.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square, Volume2 } from 'lucide-react'
import { cn, Icon, Text } from '@melu/ui'

export type Band = 'small' | 'medium' | 'large'
export type SampleKey = 'half' | 'count' | 'third' | 'timesFour' | 'percent' | 'unknown'

/** The two concepts the channel is measured with, per band. */
export const SAMPLES: Record<Band, [SampleKey, SampleKey]> = {
  small: ['half', 'count'],
  medium: ['third', 'timesFour'],
  large: ['percent', 'unknown'],
}

type Doing =
  | { kind: 'parts'; parts: number; goal: number; achievement: string }
  | { kind: 'count2'; goal: number; achievement: string }
  | { kind: 'unknown'; sum: number; equals: number }

type Def = {
  title: string
  spoken: string
  hasRead: string
  prompt: string
  see: 'parts' | 'cookie' | 'dots' | 'sum' | 'bar'
  parts?: number; painted?: number; label?: string
  rows?: number; cols?: number
  do: Doing
}

const DEFS: Record<SampleKey, Def> = {
  half: {
    title: 'La mitad',
    spoken: 'Tengo una galletita y somos dos. La parto justo por el medio... ¡listo! Dos pedazos igualitos: uno para vos, uno para mí. Ese pedazo tuyo es la mitad.',
    hasRead: 'Mitad: dos pedazos iguales.',
    prompt: 'Pintá la mitad.',
    see: 'cookie',
    do: { kind: 'parts', parts: 2, goal: 1, achievement: '¡Eso es la mitad!' },
  },
  count: {
    title: 'Tres y dos',
    spoken: 'Mirá: tres bolitas acá, dos bolitas acá. ¿Cuántas hay? Contemos juntos... una, dos, tres, cuatro, ¡cinco!',
    hasRead: '3 + 2 = 5',
    prompt: 'Pintá cinco.',
    see: 'sum',
    do: { kind: 'count2', goal: 5, achievement: '¡Cinco! Eso es 3 + 2' },
  },
  third: {
    title: 'Un tercio',
    spoken: 'Agarrá una barra de chocolate y partila en tres partes iguales. Te comés una sola. Esa que te comiste es un tercio.',
    hasRead: 'Un tercio es una de las tres partes iguales en que se corta un entero. Se escribe 1/3.',
    prompt: 'Pintá un tercio.',
    see: 'parts', parts: 3, painted: 1, label: '1/3',
    do: { kind: 'parts', parts: 3, goal: 1, achievement: '¡Eso es un tercio! 1/3' },
  },
  timesFour: {
    title: 'Tres por cuatro',
    spoken: 'Tres por cuatro es armar tres filas de cuatro. Y no las contás de a una: contás de a cuatro, que es más rápido. Cuatro, ocho, doce.',
    hasRead: '3 × 4 = 4 + 4 + 4 = 12. Multiplicar es sumar el mismo número tantas veces como diga el otro.',
    prompt: 'Armá tres filas de cuatro.',
    see: 'dots', rows: 3, cols: 4,
    do: { kind: 'count2', goal: 12, achievement: '¡12! Eso es 3 × 4' },
  },
  percent: {
    title: 'El 25 %',
    spoken: 'Veinticinco por ciento son veinticinco de cada cien. O sea, la cuarta parte. Si una pizza se reparte entre cuatro, tu porción es el veinticinco por ciento.',
    hasRead: '25 % = 25/100 = 1/4. Una cuarta parte del total.',
    prompt: 'Pintá el 25 %.',
    see: 'parts', parts: 4, painted: 1, label: '25 %',
    do: { kind: 'parts', parts: 4, goal: 1, achievement: '¡Eso es el 25 %!' },
  },
  unknown: {
    title: 'x + 5 = 12',
    spoken: 'Hay un número escondido ahí. Le sumás cinco y te da doce. ¿Cuál es? Sacale cinco al doce y aparece: siete.',
    hasRead: 'x + 5 = 12 → x = 12 − 5 = 7',
    prompt: 'Buscá el valor de x.',
    see: 'bar',
    do: { kind: 'unknown', sum: 5, equals: 12 },
  },
}

export const titleOf = (q: SampleKey) => DEFS[q].title
export const promptOf = (q: SampleKey) => DEFS[q].prompt

/* ---------- ver ---------- */

export function SampleSee({ sample }: { sample: SampleKey }) {
  const d = DEFS[sample]
  if (d.see === 'cookie') {
    return (
      <svg viewBox="0 0 108 104" className="w-full" role="img" aria-label="Una galletita partida al medio, con una mitad pintada">
        <defs>
          <clipPath id="half-left"><rect x="0" y="0" width="54" height="104" /></clipPath>
        </defs>
        <circle cx={54} cy={44} r={40} fill="var(--color-teal-500)" clipPath="url(#half-left)" />
        <circle cx={54} cy={44} r={40} fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1={54} y1={2} x2={54} y2={86} stroke="currentColor" strokeWidth="3" strokeDasharray="6 5" />
        {/* the chips: this is how you recognize a cookie */}
        {[[34, 26], [26, 52], [42, 68], [74, 28], [84, 54], [66, 70]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4.2} fill={cx < 54 ? '#ffffff' : 'currentColor'} opacity={cx < 54 ? 0.92 : 0.78} />
        ))}
        <text x={54} y={101} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-teal-500)">la mitad</text>
      </svg>
    )
  }
  if (d.see === 'parts') {
    const n = d.parts ?? 3, painted = d.painted ?? 1
    const boxWidth = Math.floor(168 / n) - 4
    return (
      <svg viewBox="0 0 180 78" className="w-full" role="img" aria-label={`Una barra partida en ${n} partes iguales, con ${painted} pintada`}>
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={6 + i * (boxWidth + 4)} y={14} width={boxWidth} height={44} rx={4}
            fill={i < painted ? 'var(--color-teal-500)' : 'transparent'} stroke="currentColor" strokeWidth="2" />
        ))}
        <text x={6 + boxWidth / 2} y={72} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-teal-500)">{d.label}</text>
      </svg>
    )
  }
  if (d.see === 'dots') {
    const rows = d.rows ?? 3, cols = d.cols ?? 4
    return (
      <svg viewBox="0 0 180 78" className="w-full" role="img" aria-label={`${rows} filas de ${cols} puntos`}>
        {Array.from({ length: rows }, (_, f) => Array.from({ length: cols }, (_, c) => (
          <circle key={`${f}-${c}`} cx={54 + c * 24} cy={18 + f * 22} r={7} fill="var(--color-teal-500)" />
        )))}
        <text x={24} y={46} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{rows * cols}</text>
      </svg>
    )
  }
  if (d.see === 'sum') {
    return (
      <svg viewBox="0 0 180 78" className="w-full" role="img" aria-label="Tres puntos más dos puntos son cinco">
        {[0, 1, 2].map((i) => <circle key={i} cx={16 + i * 22} cy={39} r={9} fill="var(--color-teal-500)" />)}
        <text x={76} y={45} textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">+</text>
        {[0, 1].map((i) => <circle key={i} cx={96 + i * 22} cy={39} r={9} fill="var(--color-orange-500)" />)}
        <text x={140} y={45} textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">=</text>
        <text x={164} y={47} textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">5</text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 180 78" className="w-full" role="img" aria-label="Una barra de doce dividida en x y cinco">
      <rect x={6} y={16} width={98} height={26} rx={4} fill="var(--color-teal-500)" />
      <text x={55} y={34} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">x</text>
      <rect x={106} y={16} width={68} height={26} rx={4} fill="none" stroke="currentColor" strokeWidth="2" />
      <text x={140} y={34} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">5</text>
      <path d="M6 50 h168" stroke="currentColor" strokeWidth="1.5" />
      <text x={90} y={70} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">12</text>
    </svg>
  )
}

/* ---------- escuchar ---------- */

/** The samples that already have a recorded voice in `public/voice/samples/`. */
export const WITH_AUDIO = new Set<SampleKey>(['half', 'count', 'third', 'timesFour', 'percent', 'unknown'])

const audioOf = (q: SampleKey) => (WITH_AUDIO.has(q) ? `/voice/samples/${q}.m4a` : undefined)

/** Can the browser read out loud? On Linux with no voices installed, no: the answer
 *  can take a while, because the voice catalog arrives asynchronously. */
export function useSystemVoice() {
  const [hasVoices, setHasVoices] = useState(false)
  useEffect(() => {
    const s = window.speechSynthesis
    if (!s) return
    const read = () => setHasVoices(s.getVoices().length > 0)
    read()
    s.addEventListener('voiceschanged', read)
    return () => s.removeEventListener('voiceschanged', read)
  }, [])
  return hasVoices
}

/** Narrates a text: first with the recorded voice, and if there is no file or it fails, with the browser's.
 *
 *  The word-by-word highlight runs against the **real audio time**, not against a fixed
 *  clock. With a fixed clock the lit word drifts from the one being spoken and the effect turns to
 *  noise. Since we have no per-word marks, the duration is split by how much room each one takes,
 *  giving more weight to the ones ending in punctuation, which is where the voice breathes. */
function useNarration(text: string, src?: string) {
  const words = useMemo(() => text.split(' '), [text])
  const cuts = useMemo(() => {
    const weight = words.map((p) => p.length + 1 + (/[.,:;!?…]$/.test(p) ? 6 : 0))
    const total = weight.reduce((a, b) => a + b, 0)
    // fraction of the audio at which each word ends
    return weight.map((_, k) => weight.slice(0, k + 1).reduce((a, b) => a + b, 0) / total)
  }, [words])

  const audio = useRef<HTMLAudioElement | null>(null)
  const frame = useRef<number | undefined>(undefined)
  const clock = useRef<number | undefined>(undefined)
  const [i, setI] = useState(-1)

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current)
    window.clearInterval(clock.current)
    audio.current?.pause()
    window.speechSynthesis?.cancel()
    setI(-1)
  }, [])

  useEffect(() => stop, [stop])

  const withBrowser = useCallback(() => {
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'es-AR'
      u.rate = 0.95
      window.speechSynthesis?.cancel()
      window.speechSynthesis?.speak(u)
    } catch { /* sin voz: queda el resaltado, que ya cuenta la frase */ }
    setI(0)
    let n = 0
    clock.current = window.setInterval(() => {
      n += 1
      if (n >= words.length) { window.clearInterval(clock.current); setI(-1) } else setI(n)
    }, 330)
  }, [text, words.length])

  const toggle = useCallback(() => {
    if (i >= 0) { stop(); return }
    if (!src) { withBrowser(); return }
    const a = audio.current ?? new Audio(src)
    audio.current = a
    a.currentTime = 0
    a.onended = () => { if (frame.current) cancelAnimationFrame(frame.current); setI(-1) }
    const advanceStep = () => {
      const f = a.duration ? a.currentTime / a.duration : 0
      const k = cuts.findIndex((c) => f < c)
      setI(k < 0 ? words.length - 1 : k)
      frame.current = requestAnimationFrame(advanceStep)
    }
    a.play().then(() => { setI(0); advanceStep() }).catch(withBrowser)
  }, [i, src, cuts, words.length, stop, withBrowser])

  return { words, i, playing: i >= 0, toggle }
}

/** A small speaker to read any text on the screen out loud.
 *  If there is neither a file nor a system voice it is not drawn: a button that does nothing, on a
 *  screen for someone who cannot read yet, is worse than no button at all. */
export function VoiceButton({ text, src, className }: { text: string; src?: string; className?: string }) {
  const hasVoice = useSystemVoice()
  const { playing, toggle } = useNarration(text, src)
  if (!src && !hasVoice) return null
  return (
    <button type="button" onClick={toggle} aria-label={playing ? 'Parar la lectura' : 'Escuchar esto'}
      className={cn('grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition hover:border-ink hover:text-ink',
        playing && 'border-ink bg-ink text-white', className)}>
      <Icon icon={Volume2} size="sm" />
    </button>
  )
}

export function SampleListen({ sample }: { sample: SampleKey }) {
  const { words, i, playing, toggle } = useNarration(DEFS[sample].spoken, audioOf(sample))
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button type="button" onClick={(e) => { e.stopPropagation(); toggle() }}
        className={cn('grid size-12 place-items-center rounded-full border-2 border-ink bg-surface text-ink transition', playing && 'bg-ink text-white')}
        aria-label={playing ? 'Parar' : 'Escuchar'}>
        <Icon icon={playing ? Square : Play} size={20} />
      </button>
      <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
        {Array.from({ length: 13 }, (_, k) => (
          <span key={k} className="w-[3px] rounded-full bg-ink/25 transition-all duration-200"
            style={{ height: playing ? `${5 + Math.abs(Math.sin((i + k) * 1.1)) * 15}px` : '5px' }} />
        ))}
      </div>
      <p className="text-center text-sm leading-snug text-ink-muted">
        {words.map((p, k) => (
          <span key={k} className={cn('transition-colors', k === i && 'font-semibold text-ink')}>{p} </span>
        ))}
      </p>
    </div>
  )
}

/* ---------- read ---------- */

export function SampleRead({ sample }: { sample: SampleKey }) {
  const t = DEFS[sample].hasRead
  // Short texts belong to the kids: they go big, which is how they are read at that age.
  return <p className={cn('text-ink', t.length < 40 ? 'text-center font-display text-2xl font-semibold' : 'text-[15px] leading-relaxed')}>{t}</p>
}

/* ---------- hacer ---------- */

export function SampleDo({ sample }: { sample: SampleKey }) {
  const h = DEFS[sample].do
  if (h.kind === 'parts') return <DoParts {...h} />
  if (h.kind === 'count2') return <DoCount {...h} />
  return <DoUnknown {...h} />
}

function DoParts({ parts, goal, achievement }: { parts: number; goal: number; achievement: string }) {
  const [painted, setPainted] = useState<boolean[]>(() => Array(parts).fill(false))
  const n = painted.filter(Boolean).length
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full gap-1.5">
        {painted.map((on, i) => (
          <button key={i} type="button"
            onClick={(e) => { e.stopPropagation(); setPainted((p) => p.map((v, k) => (k === i ? !v : v))) }}
            className={cn('h-11 flex-1 rounded border-2 border-ink transition-colors', on ? 'bg-[var(--color-teal-500)]' : 'bg-surface hover:bg-hover')}
            aria-label={`Parte ${i + 1}`} aria-pressed={on} />
        ))}
      </div>
      <Text size="sm" variant={n === goal ? 'accent' : 'muted'} className="font-semibold tabular-nums">
        {n === goal ? achievement : `${n}/${parts}`}
      </Text>
    </div>
  )
}

function DoCount({ goal, achievement }: { goal: number; achievement: string }) {
  const [sel, setSel] = useState<Set<number>>(new Set())
  const cols = goal <= 6 ? goal : 5
  const total = goal <= 6 ? goal + 3 : 20
  const ready = sel.size === goal
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: total }, (_, k) => {
          const on = sel.has(k)
          return (
            <button key={k} type="button"
              onClick={(e) => { e.stopPropagation(); setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n }) }}
              className={cn('size-6 rounded-sm border-2 border-ink/70 transition-colors', on ? 'bg-[var(--color-teal-500)]' : 'bg-surface hover:bg-hover')}
              aria-label={`Casilla ${k + 1}`} aria-pressed={on} />
          )
        })}
      </div>
      <Text size="sm" variant={ready ? 'accent' : 'muted'} className="font-semibold tabular-nums">{ready ? achievement : `${sel.size}`}</Text>
    </div>
  )
}

function DoUnknown({ sum, equals }: { sum: number; equals: number }) {
  const [x, setX] = useState(0)
  const ready = x + sum === equals
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-2 font-display text-xl font-semibold tabular-nums">
        <span className={cn('grid h-10 min-w-12 place-items-center rounded border-2 border-ink px-2', ready && 'bg-[var(--color-teal-500)] text-white')}>{x}</span>
        <span>+ {sum} =</span>
        <span className={ready ? 'text-accent' : 'text-ink-muted'}>{x + sum}</span>
      </div>
      <div className="flex gap-2">
        {([-1, 1] as const).map((d) => (
          <button key={d} type="button" onClick={(e) => { e.stopPropagation(); setX((v) => Math.max(0, v + d)) }}
            className="grid size-9 place-items-center rounded border-2 border-ink text-lg font-bold leading-none transition hover:bg-ink hover:text-white"
            aria-label={d > 0 ? 'Subir x' : 'Bajar x'}>{d > 0 ? '+' : '−'}</button>
        ))}
      </div>
      <Text size="sm" variant={ready ? 'accent' : 'muted'} className="font-semibold">{ready ? `¡Ahí está! x = ${x}` : `Tiene que dar ${equals}`}</Text>
    </div>
  )
}
