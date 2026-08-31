// Las cuatro maneras de contar lo mismo. No son ilustraciones de "ver / escuchar / leer / hacer":
// son la explicación de verdad, cuatro veces. Por eso la pregunta del onboarding se puede contestar
// sin introspección: elegís la que te sirvió, no la que creés que te sirve.
//
// Y el concepto tiene que estar al alcance: a alguien de seis años "un tercio" no le dice nada.
// Por eso cada franja tiene sus propios conceptos. La mecánica es idéntica; lo que cambia es qué
// se explica y con cuántas palabras.
import { useEffect, useRef, useState } from 'react'
import { Play, Square, Volume2 } from 'lucide-react'
import { cn, Icon, Text } from '@/kit'

export type Banda = 'chico' | 'medio' | 'grande'
export type ClaveMuestra = 'mitad' | 'contar' | 'tercio' | 'porcuatro' | 'porcentaje' | 'incognita'

/** Los dos conceptos con los que se mide el canal, por franja. */
export const MUESTRAS: Record<Banda, [ClaveMuestra, ClaveMuestra]> = {
  chico: ['mitad', 'contar'],
  medio: ['tercio', 'porcuatro'],
  grande: ['porcentaje', 'incognita'],
}

type Hacer =
  | { kind: 'partes'; partes: number; objetivo: number; logro: string }
  | { kind: 'conteo'; objetivo: number; logro: string }
  | { kind: 'incognita'; suma: number; igual: number }

type Def = {
  titulo: string
  hablado: string
  leido: string
  consigna: string
  ver: 'partes' | 'galletita' | 'puntos' | 'suma' | 'barra'
  partes?: number; pintadas?: number; etiqueta?: string
  filas?: number; cols?: number
  hacer: Hacer
}

const DEFS: Record<ClaveMuestra, Def> = {
  mitad: {
    titulo: 'La mitad',
    hablado: 'Tengo una galletita y somos dos. La parto justo por el medio... ¡listo! Dos pedazos igualitos: uno para vos, uno para mí. Ese pedazo tuyo es la mitad.',
    leido: 'Mitad: dos pedazos iguales.',
    consigna: 'Pintá la mitad.',
    ver: 'galletita',
    hacer: { kind: 'partes', partes: 2, objetivo: 1, logro: '¡Eso es la mitad!' },
  },
  contar: {
    titulo: 'Tres y dos',
    hablado: 'Mirá: tres bolitas acá, dos bolitas acá. ¿Cuántas hay? Contemos juntos... una, dos, tres, cuatro, ¡cinco!',
    leido: '3 + 2 = 5',
    consigna: 'Pintá cinco.',
    ver: 'suma',
    hacer: { kind: 'conteo', objetivo: 5, logro: '¡Cinco! Eso es 3 + 2' },
  },
  tercio: {
    titulo: 'Un tercio',
    hablado: 'Agarrá una barra de chocolate y partila en tres partes iguales. Te comés una sola. Esa que te comiste es un tercio.',
    leido: 'Un tercio es una de las tres partes iguales en que se corta un entero. Se escribe 1/3.',
    consigna: 'Pintá un tercio.',
    ver: 'partes', partes: 3, pintadas: 1, etiqueta: '1/3',
    hacer: { kind: 'partes', partes: 3, objetivo: 1, logro: '¡Eso es un tercio! 1/3' },
  },
  porcuatro: {
    titulo: 'Tres por cuatro',
    hablado: 'Tres por cuatro es armar tres filas de cuatro. Y no las contás de a una: contás de a cuatro, que es más rápido. Cuatro, ocho, doce.',
    leido: '3 × 4 = 4 + 4 + 4 = 12. Multiplicar es sumar el mismo número tantas veces como diga el otro.',
    consigna: 'Armá tres filas de cuatro.',
    ver: 'puntos', filas: 3, cols: 4,
    hacer: { kind: 'conteo', objetivo: 12, logro: '¡12! Eso es 3 × 4' },
  },
  porcentaje: {
    titulo: 'El 25 %',
    hablado: 'Veinticinco por ciento son veinticinco de cada cien. O sea, la cuarta parte. Si una pizza se reparte entre cuatro, tu porción es el veinticinco por ciento.',
    leido: '25 % = 25/100 = 1/4. Una cuarta parte del total.',
    consigna: 'Pintá el 25 %.',
    ver: 'partes', partes: 4, pintadas: 1, etiqueta: '25 %',
    hacer: { kind: 'partes', partes: 4, objetivo: 1, logro: '¡Eso es el 25 %!' },
  },
  incognita: {
    titulo: 'x + 5 = 12',
    hablado: 'Hay un número escondido ahí. Le sumás cinco y te da doce. ¿Cuál es? Sacale cinco al doce y aparece: siete.',
    leido: 'x + 5 = 12 → x = 12 − 5 = 7',
    consigna: 'Buscá el valor de x.',
    ver: 'barra',
    hacer: { kind: 'incognita', suma: 5, igual: 12 },
  },
}

export const tituloDe = (q: ClaveMuestra) => DEFS[q].titulo
export const consignaDe = (q: ClaveMuestra) => DEFS[q].consigna

/* ---------- ver ---------- */

export function MuestraVer({ que }: { que: ClaveMuestra }) {
  const d = DEFS[que]
  if (d.ver === 'galletita') {
    return (
      <svg viewBox="0 0 108 104" className="w-full" role="img" aria-label="Una galletita partida al medio, con una mitad pintada">
        <defs>
          <clipPath id="mitad-izq"><rect x="0" y="0" width="54" height="104" /></clipPath>
        </defs>
        <circle cx={54} cy={44} r={40} fill="var(--color-teal-500)" clipPath="url(#mitad-izq)" />
        <circle cx={54} cy={44} r={40} fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1={54} y1={2} x2={54} y2={86} stroke="currentColor" strokeWidth="3" strokeDasharray="6 5" />
        {/* las chispas: una galletita se reconoce por esto */}
        {[[34, 26], [26, 52], [42, 68], [74, 28], [84, 54], [66, 70]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4.2} fill={cx < 54 ? '#ffffff' : 'currentColor'} opacity={cx < 54 ? 0.92 : 0.78} />
        ))}
        <text x={54} y={101} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-teal-500)">la mitad</text>
      </svg>
    )
  }
  if (d.ver === 'partes') {
    const n = d.partes ?? 3, pintadas = d.pintadas ?? 1
    const ancho = Math.floor(168 / n) - 4
    return (
      <svg viewBox="0 0 180 78" className="w-full" role="img" aria-label={`Una barra partida en ${n} partes iguales, con ${pintadas} pintada`}>
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={6 + i * (ancho + 4)} y={14} width={ancho} height={44} rx={4}
            fill={i < pintadas ? 'var(--color-teal-500)' : 'transparent'} stroke="currentColor" strokeWidth="2" />
        ))}
        <text x={6 + ancho / 2} y={72} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-teal-500)">{d.etiqueta}</text>
      </svg>
    )
  }
  if (d.ver === 'puntos') {
    const filas = d.filas ?? 3, cols = d.cols ?? 4
    return (
      <svg viewBox="0 0 180 78" className="w-full" role="img" aria-label={`${filas} filas de ${cols} puntos`}>
        {Array.from({ length: filas }, (_, f) => Array.from({ length: cols }, (_, c) => (
          <circle key={`${f}-${c}`} cx={54 + c * 24} cy={18 + f * 22} r={7} fill="var(--color-teal-500)" />
        )))}
        <text x={24} y={46} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">{filas * cols}</text>
      </svg>
    )
  }
  if (d.ver === 'suma') {
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

/** Lee un texto en voz alta si el navegador puede, y lo resalta palabra por palabra si no. */
export function useVoz(texto: string) {
  const [i, setI] = useState(-1)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => { window.clearInterval(timer.current); window.speechSynthesis?.cancel() }, [])

  const palabras = texto.split(' ')
  function alternar() {
    window.clearInterval(timer.current)
    if (i >= 0) { setI(-1); window.speechSynthesis?.cancel(); return }
    try {
      const u = new SpeechSynthesisUtterance(texto)
      u.lang = 'es-AR'
      u.rate = 0.95
      window.speechSynthesis?.cancel()
      window.speechSynthesis?.speak(u)
    } catch { /* sin voz: queda el resaltado, que ya cuenta la frase */ }
    setI(0)
    let n = 0
    timer.current = window.setInterval(() => {
      n += 1
      if (n >= palabras.length) { window.clearInterval(timer.current); setI(-1) } else setI(n)
    }, 330)
  }
  return { palabras, i, sonando: i >= 0, alternar }
}

/** Un altavoz chico para leer en voz alta cualquier texto de la pantalla. */
export function BotonVoz({ texto, className }: { texto: string; className?: string }) {
  const { sonando, alternar } = useVoz(texto)
  return (
    <button type="button" onClick={alternar} aria-label={sonando ? 'Parar la lectura' : 'Escuchar esto'}
      className={cn('grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition hover:border-ink hover:text-ink',
        sonando && 'border-ink bg-ink text-white', className)}>
      <Icon icon={Volume2} size="sm" />
    </button>
  )
}

export function MuestraEscuchar({ que }: { que: ClaveMuestra }) {
  const { palabras, i, sonando, alternar } = useVoz(DEFS[que].hablado)
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button type="button" onClick={(e) => { e.stopPropagation(); alternar() }}
        className={cn('grid size-12 place-items-center rounded-full border-2 border-ink bg-surface text-ink transition', sonando && 'bg-ink text-white')}
        aria-label={sonando ? 'Parar' : 'Escuchar'}>
        <Icon icon={sonando ? Square : Play} size={20} />
      </button>
      <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
        {Array.from({ length: 13 }, (_, k) => (
          <span key={k} className="w-[3px] rounded-full bg-ink/25 transition-all duration-200"
            style={{ height: sonando ? `${5 + Math.abs(Math.sin((i + k) * 1.1)) * 15}px` : '5px' }} />
        ))}
      </div>
      <p className="text-center text-sm leading-snug text-ink-muted">
        {palabras.map((p, k) => (
          <span key={k} className={cn('transition-colors', k === i && 'font-semibold text-ink')}>{p} </span>
        ))}
      </p>
    </div>
  )
}

/* ---------- leer ---------- */

export function MuestraLeer({ que }: { que: ClaveMuestra }) {
  const t = DEFS[que].leido
  // Los textos cortos son de los chicos: van grandes, que es como se leen a esa edad.
  return <p className={cn('text-ink', t.length < 40 ? 'text-center font-display text-2xl font-semibold' : 'text-[15px] leading-relaxed')}>{t}</p>
}

/* ---------- hacer ---------- */

export function MuestraHacer({ que }: { que: ClaveMuestra }) {
  const h = DEFS[que].hacer
  if (h.kind === 'partes') return <HacerPartes {...h} />
  if (h.kind === 'conteo') return <HacerConteo {...h} />
  return <HacerIncognita {...h} />
}

function HacerPartes({ partes, objetivo, logro }: { partes: number; objetivo: number; logro: string }) {
  const [pintadas, setPintadas] = useState<boolean[]>(() => Array(partes).fill(false))
  const n = pintadas.filter(Boolean).length
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full gap-1.5">
        {pintadas.map((on, i) => (
          <button key={i} type="button"
            onClick={(e) => { e.stopPropagation(); setPintadas((p) => p.map((v, k) => (k === i ? !v : v))) }}
            className={cn('h-11 flex-1 rounded border-2 border-ink transition-colors', on ? 'bg-[var(--color-teal-500)]' : 'bg-surface hover:bg-hover')}
            aria-label={`Parte ${i + 1}`} aria-pressed={on} />
        ))}
      </div>
      <Text size="sm" variant={n === objetivo ? 'accent' : 'muted'} className="font-semibold tabular-nums">
        {n === objetivo ? logro : `${n}/${partes}`}
      </Text>
    </div>
  )
}

function HacerConteo({ objetivo, logro }: { objetivo: number; logro: string }) {
  const [sel, setSel] = useState<Set<number>>(new Set())
  const cols = objetivo <= 6 ? objetivo : 5
  const total = objetivo <= 6 ? objetivo + 3 : 20
  const listo = sel.size === objetivo
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
      <Text size="sm" variant={listo ? 'accent' : 'muted'} className="font-semibold tabular-nums">{listo ? logro : `${sel.size}`}</Text>
    </div>
  )
}

function HacerIncognita({ suma, igual }: { suma: number; igual: number }) {
  const [x, setX] = useState(0)
  const listo = x + suma === igual
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-2 font-display text-xl font-semibold tabular-nums">
        <span className={cn('grid h-10 min-w-12 place-items-center rounded border-2 border-ink px-2', listo && 'bg-[var(--color-teal-500)] text-white')}>{x}</span>
        <span>+ {suma} =</span>
        <span className={listo ? 'text-accent' : 'text-ink-muted'}>{x + suma}</span>
      </div>
      <div className="flex gap-2">
        {([-1, 1] as const).map((d) => (
          <button key={d} type="button" onClick={(e) => { e.stopPropagation(); setX((v) => Math.max(0, v + d)) }}
            className="grid size-9 place-items-center rounded border-2 border-ink text-lg font-bold leading-none transition hover:bg-ink hover:text-white"
            aria-label={d > 0 ? 'Subir x' : 'Bajar x'}>{d > 0 ? '+' : '−'}</button>
        ))}
      </div>
      <Text size="sm" variant={listo ? 'accent' : 'muted'} className="font-semibold">{listo ? `¡Ahí está! x = ${x}` : `Tiene que dar ${igual}`}</Text>
    </div>
  )
}
