// The learner onboarding. Three chapters: what this is, how you learn, your profile.
//
// Two pacing rules: never more than two questions in a row without something happening (show, ask,
// show), and a single action per screen.
//
// And a content rule: what is shown has to be within reach of whoever is looking. To a
// six-year-old "a third" means nothing, and neither does a three-line prompt.
// That is why the first question is roughly where they are, and the rest of the script follows from it.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import {
  Button, Card, DoodleSprout, DoodleBulb, DoodleGroup, DoodleMap, Eyebrow, Heading, Icon, IconButton, Logomark, Character, Text, cn,
} from '@/kit'
import { api } from '../lib/api'
import { AXES, POLES, headline, type LiveProfile, type Pole } from '../lib/profile'
import {
  VoiceButton, SAMPLES, SampleListen, SampleDo, SampleRead, SampleSee, promptOf, titleOf,
  type Band, type SampleKey,
} from '../blocks/Samples'

/* ═══════════ the script ═══════════ */

type Option = { value: string; title: string; footer?: string; body?: ReactNode }
type StepView =
  | { type: 'tell'; key: string; chapter: number; render: ReactNode; cta: string }
  | { type: 'pick'; key: string; chapter: number; title: string; subtitle?: string; options: Option[]; boxHeight?: boolean }
  | { type: 'building'; key: string; chapter: number }
  | { type: 'profile'; key: string; chapter: number }

const CHAPTERS = ['Qué es esto', 'Cómo aprendés', 'Tu perfil']

const COLUMNS: Record<number, string> = {
  1: 'max-w-sm mx-auto',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

/** An illustration inside a card: contained and the size of the drawings it replaces,
 *  not bled to the edge. All three come normalized by their ink box, so fixing the height
 *  already makes them weigh the same. */
function Illustration({ src }: { src: string }) {
  return (
    <span className="flex items-center justify-center p-1">
      {/* Height is the only knob: raising or lowering it moves all three at once, because they
          imágenes están normalizadas por su caja de tinta. */}
      <img src={src} alt="" aria-hidden="true" className="max-h-56 w-auto select-none" draggable={false} />
    </span>
  )
}

function sampleOptions(sample: SampleKey): Option[] {
  return [
    { value: 'see', title: 'Mirá', body: <SampleSee sample={sample} /> },
    { value: 'listen', title: 'Escuchá', body: <SampleListen sample={sample} /> },
    { value: 'read', title: 'Leé', body: <SampleRead sample={sample} /> },
    { value: 'do', title: promptOf(sample), body: <SampleDo sample={sample} /> },
  ]
}

/** What changes from one band to another: the example, the setting and how many words are used. */
const BY_BAND: Record<Band, {
  spark: { title: string; subtitle: string; options: Option[] }
  pace: { title: string; subtitle: string; steps: string[]; map: string; mapFooter: string }
  stuck: string
}> = {
  small: {
    spark: {
      title: 'Cuatro maneras de empezar lo mismo.',
      subtitle: 'Contar los pasos que hay hasta el patio. ¿Cuál te dan ganas de abrir?',
      options: [
        { value: 'challenge', title: '«¿Podés adivinar cuántos pasos son, antes de contarlos?»', footer: 'Un desafío' },
        { value: 'story', title: '«Un pingüino se perdió y tiene que contar los pasos para volver a casa.»', footer: 'Un cuento' },
        { value: 'game', title: '«Nivel 1. Un punto por cada paso bien contado.»', footer: 'Un juego' },
        { value: 'real', title: '«Salimos al patio de verdad y los contamos.»', footer: 'De verdad' },
      ],
    },
    pace: {
      title: 'Lo mismo, explicado de dos maneras.',
      subtitle: 'Cómo hacer un sándwich. Tocá la que se entiende mejor.',
      steps: ['Sacá dos panes.', 'Poné el queso.', 'Tapá con el otro pan.', 'Cortalo al medio.'],
      map: 'Un sándwich es todo lo que quieras, siempre entre dos panes.',
      mapFooter: 'Sabiendo eso, el orden sale solo.',
    },
    stuck: 'Hay algo que no te sale.',
  },
  medium: {
    spark: {
      title: 'La misma actividad, empezada de cuatro formas.',
      subtitle: 'Medir la altura de un árbol. ¿Cuál abrirías?',
      options: [
        { value: 'challenge', title: '«¿Podés saber cuánto mide el árbol sin subirte? Tenés quince minutos.»', footer: 'Un reto' },
        { value: 'story', title: '«Tales se paró frente a una pirámide gigante y dijo: yo sé cuánto mide.»', footer: 'Una historia' },
        { value: 'game', title: '«Nivel 1 de 3. Diez puntos por cada sombra bien medida.»', footer: 'Un juego' },
        { value: 'real', title: '«El patio de tu escuela, una cinta métrica, y hoy salís sabiendo cuánto mide ese árbol.»', footer: 'Algo real' },
      ],
    },
    pace: {
      title: 'Las mismas instrucciones, acomodadas de dos maneras.',
      subtitle: 'Leé las dos y marcá la que te ordena la cabeza.',
      steps: ['Medí tu sombra.', 'Medí cuánto medís vos.', 'Medí la sombra del árbol.', 'Dividí y multiplicá.'],
      map: 'Tu sombra y vos guardan la misma proporción que la sombra del árbol y el árbol.',
      mapFooter: 'Con eso sale todo. Los cuatro pasos son consecuencia.',
    },
    stuck: 'Te trabaste con algo y no sale.',
  },
  large: {
    spark: {
      title: 'La misma actividad, planteada de cuatro formas.',
      subtitle: 'Medir la altura del edificio de enfrente. ¿Cuál abrirías?',
      options: [
        { value: 'challenge', title: '«¿Podés medir el edificio de enfrente sin salir del aula? Quince minutos.»', footer: 'Un reto' },
        { value: 'story', title: '«Tales se paró frente a una pirámide y dijo: yo sé cuánto mide. No tenía más que su propia sombra.»', footer: 'Una historia' },
        { value: 'game', title: '«Nivel 1 de 3. Diez puntos por cada medición dentro del margen de error.»', footer: 'Un juego' },
        { value: 'real', title: '«Tu escuela, una cinta métrica y trigonometría: hoy salís con el dato real.»', footer: 'Algo real' },
      ],
    },
    pace: {
      title: 'Las mismas instrucciones, acomodadas de dos maneras.',
      subtitle: 'Leé las dos y marcá la que te ordena la cabeza.',
      steps: ['Medí tu sombra.', 'Medí cuánto medís vos.', 'Medí la sombra del edificio.', 'Aplicá la proporción.'],
      map: 'Dos triángulos con el mismo ángulo del sol son semejantes: sus lados guardan la misma razón.',
      mapFooter: 'De ahí sale todo lo demás; los cuatro pasos son la cuenta.',
    },
    stuck: 'Te trabaste con algo y no sale.',
  },
}

function script(band: Band, alreadyIn: boolean): StepView[] {
  const b = BY_BAND[band]
  const [sampleA, sampleB] = SAMPLES[band]
  const small = band === 'small'

  return [
    {
      type: 'tell', key: 'hello', chapter: 0, cta: 'Empezar',
      // She walks in and waves; the text arrives behind. First the person, then the app.
      render: (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-2">
          {/* If they already came through here, she does not walk in again: it is done. */}
          <Character idleOnly={alreadyIn} className="h-[44vh] max-h-[26rem] min-h-60 shrink-0"
            alt="La guía de melu: entra, saluda, se pone el casco y se pone a medir" />
          <div className="flex max-w-md flex-col gap-3 text-center sm:text-left">
            <Logomark size={40} className="kit-reveal mx-auto text-ink sm:mx-0" />
            <Heading size="2xl" className="kit-reveal kit-retraso-2">Hola. Esto es melu.</Heading>
            <Text size="xl" variant="muted" className="kit-reveal kit-retraso-3 text-balance">
              Un lugar donde se aprende haciendo: tocás, probás, te equivocás y seguís. Nada de mirar una pantalla sin hacer nada.
            </Text>
          </div>
        </div>
      ),
    },
    {
      type: 'pick', key: 'band', chapter: 0, boxHeight: true,
      title: '¿Por dónde andás?',
      subtitle: 'Para mostrarte ejemplos que te sirvan y no cosas que todavía no viste.',
      options: [
        { value: 'small', title: 'Recién empiezo', footer: 'Estoy aprendiendo a leer y a contar', body: <Illustration src="/cards/beginner.webp" /> },
        { value: 'medium', title: 'Voy a la primaria', footer: 'Leo bien y ya sé multiplicar', body: <Illustration src="/cards/primary.png" /> },
        { value: 'large', title: 'Secundaria o más', footer: 'Me manejo con fracciones y ecuaciones', body: <Illustration src="/cards/secondary.png" /> },
      ],
    },
    {
      type: 'tell', key: 'how', chapter: 0, cta: 'Entendido',
      render: (
        <div className="flex w-full max-w-2xl flex-col gap-8">
          <Heading size="xl" className="text-center">Funciona así</Heading>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { d: <DoodleGroup size={84} />, t: 'Alguien arma la misión', p: small ? 'Tu seño, tu profe, quien te acompañe.' : 'Tu profe, tu tallerista, quien te acompañe.' },
              { d: <DoodleBulb size={84} />, t: 'Vos la hacés a tu ritmo', p: small ? 'De a una cosa por vez. Te avisa si va bien.' : 'Un paso por pantalla. Te dice al toque si va bien.' },
              { d: <DoodleSprout size={84} />, t: 'melu se acomoda a vos', p: small ? 'Mira qué te sale mejor y te trae más de eso.' : 'Mira con qué te va mejor y te propone más de eso.' },
            ].map((x, i) => (
              <div key={x.t} className={cn('kit-reveal flex flex-col items-center gap-3 rounded-xl border border-line p-5 text-center', `kit-retraso-${i + 1}`)}>
                <span className="flex h-20 items-center text-ink">{x.d}</span>
                <div className="font-semibold leading-tight">{x.t}</div>
                <Text size="sm" variant="muted">{x.p}</Text>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    { type: 'tell', key: 'wow', chapter: 0, cta: 'Buscar la mía', render: <WowScreen sample={sampleA} /> },

    {
      type: 'pick', key: 'channel1', chapter: 1, boxHeight: true,
      title: `${titleOf(sampleA)}, explicado de cuatro maneras.`,
      subtitle: small ? 'Probá las cuatro. Después tocá «con esta» abajo de la que más te gustó.' : 'Probá las cuatro. Después marcá «con esta» en la que te lo hizo entender más rápido.',
      options: sampleOptions(sampleA),
    },
    {
      type: 'pick', key: 'channel2', chapter: 1, boxHeight: true,
      title: 'Otra cosa, las mismas cuatro maneras.',
      subtitle: `${titleOf(sampleB)}. Probalas de nuevo y marcá con cuál lo agarrás.`,
      options: sampleOptions(sampleB),
    },
    { type: 'pick', key: 'spark', chapter: 1, title: b.spark.title, subtitle: b.spark.subtitle, options: b.spark.options },
    {
      type: 'pick', key: 'pace', chapter: 1, boxHeight: true,
      title: b.pace.title, subtitle: b.pace.subtitle,
      options: [
        { value: 'step', title: 'Paso a paso', body: <StepsPanel steps={b.pace.steps} /> },
        { value: 'map', title: 'Todo junto', body: <MapPanel text={b.pace.map} footer={b.pace.mapFooter} /> },
      ],
    },
    {
      type: 'pick', key: 'company', chapter: 1,
      title: b.stuck,
      subtitle: '¿Qué hacés, en general?',
      options: [
        { value: 'think', title: small ? 'Sigo probando hasta que sale' : 'Le sigo dando vueltas hasta que sale', footer: 'Solo' },
        { value: 'search', title: small ? 'Miro cómo lo hizo otro' : 'Busco un ejemplo parecido', footer: 'Solo, con ayuda' },
        { value: 'ask', title: 'Le pregunto a alguien', footer: 'Con otros' },
        { value: 'tell', title: small ? 'Lo cuento en voz alta y ahí me doy cuenta' : 'Se lo cuento a alguien en voz alta y ahí me doy cuenta', footer: 'Con otros' },
      ],
    },
    {
      type: 'pick', key: 'scaffold', chapter: 1,
      title: small ? 'Algo que nunca hiciste.' : 'Algo nuevo que nunca viste.',
      subtitle: '¿Cómo preferís arrancar?',
      options: [
        { value: 'example', title: 'Mostrame uno hecho y después lo hago yo', footer: 'Con un ejemplo' },
        { value: 'try', title: 'Dejame probar y me doy cuenta solo', footer: 'Descubriendo' },
      ],
    },
    {
      type: 'pick', key: 'dose', chapter: 1,
      title: 'Última.',
      subtitle: small ? '¿Cuándo te sale mejor?' : '¿Cuándo te rinde más?',
      options: [
        { value: 'bite', title: 'Un ratito, varias veces', footer: 'Diez minutos y listo' },
        { value: 'session', title: small ? 'Un rato largo y no me interrumpas' : 'Una sentada larga y no me saques', footer: 'Meterme y no salir' },
      ],
    },

    { type: 'building', key: 'building', chapter: 2 },
    { type: 'profile', key: 'profile', chapter: 2 },
  ]
}

/* ═══════════ the walkthrough ═══════════ */

export function Start() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [i, setI] = useState(0)
  const [reply, setReply] = useState<Record<string, string>>({})
  const [profile, setProfile] = useState<LiveProfile | null>(null)

  // Once past the first screen, the character's entrance has been seen: going back she has
  // to be standing there, not walking in from outside again.
  const [alreadyIn, setAlreadyIn] = useState(false)
  // Going back is not arriving at something new: the screen is not re-introduced with animation,
  // because it has been seen. Introducing it again reads as a flicker.
  const [back, setBack] = useState(false)

  const band = (reply.band as Band) ?? 'medium'
  const STEPS = useMemo(() => script(band, alreadyIn), [band, alreadyIn])
  const step = STEPS[i]
  const small = band === 'small'

  // Careful: ['me'] is not invalidated on save. If it were, the app would see `profile: true`, stop
  // rendering this walkthrough and the person would never see their own result. It is invalidated on exit.
  const save = useMutation({
    mutationFn: (r: Record<string, string>) => api.post<LiveProfile>('/api/profile', { answers: r }),
    onSuccess: setProfile,
  })

  async function signOut() {
    await qc.invalidateQueries({ queryKey: ['me'] })
    nav('/', { replace: true })
  }

  const advance = () => { setAlreadyIn(true); setBack(false); setI((n) => Math.min(n + 1, STEPS.length - 1)) }

  // on reaching "building" it saves; the screen lasts as long as the animation
  useEffect(() => {
    if (step.type !== 'building') return
    save.mutate(reply)
    const t = window.setTimeout(advance, 2600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.type])

  function pick(value: string) {
    setReply((r) => ({ ...r, [step.key]: value }))
    window.setTimeout(advance, 220)
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 pt-5 sm:px-8">
        <IconButton icon={<Icon icon={ArrowLeft} />} label="Volver" variant="ghost"
          onClick={() => { setBack(true); setI((n) => Math.max(0, n - 1)) }} className={cn(i === 0 && 'invisible')} />
        <Progress steps={STEPS} chapter={step.chapter} position={i} />
      </header>

      {/* The button sits against the content, not pinned to the bottom of the screen. A fixed footer
          funciona en un celular -pantalla corta, pulgar abajo- pero en una ventana de escritorio
          deja la acción a cientos de píxeles de aquello a lo que se refiere.
          `m-auto` centra cuando hay lugar y no recorta cuando el contenido es más alto que la
          ventana, que es lo que pasa con `items-center` en una columna que desborda. */}
      <main className="flex flex-1 px-4 py-8 sm:px-8">
        <div key={step.key} className={cn('m-auto flex w-full max-w-4xl flex-col items-center gap-9', !back && 'kit-reveal')}>
          {step.type === 'tell' && step.render}
          {step.type === 'pick' && <QuestionBlock step={step} pickedOne={reply[step.key]} onPick={pick} withVoice={small || step.key === 'band'} />}
          {step.type === 'building' && <Building />}
          {step.type === 'profile' && <YourProfile profile={profile} error={save.isError} onRetry={() => save.mutate(reply)} />}

          {step.type === 'tell' && <Button size="lg" onClick={advance} endIcon={<Icon icon={ChevronRight} />}>{step.cta}</Button>}
          {step.type === 'profile' && <Button size="lg" onClick={signOut} disabled={!profile}>Ir a mis misiones</Button>}
        </div>
      </main>
    </div>
  )
}

function Progress({ steps, chapter, position }: { steps: StepView[]; chapter: number; position: number }) {
  const byChapter = CHAPTERS.map((_, c) => steps.filter((p) => p.chapter === c).length)
  return (
    <div className="flex flex-1 items-center gap-2" role="progressbar" aria-valuenow={position + 1} aria-valuemax={steps.length} aria-label="Progreso">
      {CHAPTERS.map((name, c) => {
        const before = byChapter.slice(0, c).reduce((a, b) => a + b, 0)
        const facts = Math.max(0, Math.min(byChapter[c], position - before))
        return (
          <div key={name} className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--color-teal-500)] transition-[width] duration-500 ease-out"
                style={{ width: `${(facts / byChapter[c]) * 100}%` }} />
            </div>
            <span className={cn('mt-1 hidden text-[11px] font-medium sm:block', c === chapter ? 'text-ink' : 'text-ink-subtle')}>{name}</span>
          </div>
        )
      })}
    </div>
  )
}

function QuestionBlock({ step, pickedOne, onPick, withVoice }: {
  step: Extract<StepView, { type: 'pick' }>; pickedOne?: string; onPick: (v: string) => void; withVoice?: boolean
}) {
  return (
    <div className="flex w-full flex-col items-center gap-7">
      <div className="flex max-w-2xl flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Heading size="lg" className="text-balance">{step.title}</Heading>
          {/* For whoever cannot read fluently yet, the prompt can also be heard. */}
          {withVoice && <VoiceButton text={`${step.title} ${step.subtitle ?? ''}`} />}
        </div>
        {step.subtitle && <Text variant="muted" className="text-balance">{step.subtitle}</Text>}
      </div>
      {/* There are as many columns as options: with one column too many, the cards end up
          corridas a un lado y la fila se ve rota. */}
      <div role="radiogroup" className={cn('grid w-full gap-3', COLUMNS[Math.min(step.options.length, 4)])}>
        {step.options.map((o, k) => {
          const puesto = cn(
            'kit-reveal flex flex-col gap-3 rounded-xl border-2 border-line bg-surface p-4 text-left transition',
            pickedOne === o.value && 'border-ink bg-teal',
            step.boxHeight && 'min-h-[16rem]',
            `kit-retraso-${Math.min(3, k + 1)}`,
          )
          // When the card carries something to play with, tapping it cannot mean "I pick this one":
          // the tap belongs to the content. The choice goes separately, below, and it shows.
          const isInteractive = o.body && !o.footer
          return isInteractive ? (
            <div key={o.value} className={puesto}>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink-subtle">{o.title}</span>
              <span className="flex flex-1 items-center justify-center text-ink">{o.body}</span>
              <button type="button" role="radio" aria-checked={pickedOne === o.value} aria-label={`Elegir: ${o.title}`}
                onClick={() => onPick(o.value)}
                className={cn('rounded border-2 border-line px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink-muted transition',
                  'hover:border-ink hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  pickedOne === o.value && 'border-ink bg-ink text-white')}>
                Con esta
              </button>
            </div>
          ) : (
            <button key={o.value} type="button" role="radio" aria-checked={pickedOne === o.value}
              onClick={() => onPick(o.value)}
              className={cn(puesto, 'items-start justify-between hover:border-ink/40 hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus')}>
              {o.body && <span className="flex w-full flex-1 items-center justify-center text-ink">{o.body}</span>}
              <span className="text-[15px] font-medium leading-snug text-ink">{o.title}</span>
              {o.footer && <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">{o.footer}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════ pantallas propias ═══════════ */

/** The moment the idea lands: the same thing, three times, alone. */
function WowScreen({ sample }: { sample: SampleKey }) {
  const modes = [
    { k: 'see', label: 'Viéndolo', nodo: <SampleSee sample={sample} /> },
    { k: 'read', label: 'Leyéndolo', nodo: <SampleRead sample={sample} /> },
    { k: 'do', label: 'Haciéndolo', nodo: <SampleDo sample={sample} /> },
  ]
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => (x + 1) % modes.length), 2000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample])
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <Eyebrow>La idea</Eyebrow>
      <Heading size="2xl" className="text-balance">No todos aprendemos igual.</Heading>
      <Card className="w-full max-w-md">
        <div className="flex h-52 flex-col items-center justify-center gap-3 p-6">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{modes[n].label}</span>
          <div key={n} className="kit-reveal flex w-full items-center justify-center text-ink">{modes[n].nodo}</div>
        </div>
      </Card>
      <div className="flex gap-1.5">
        {modes.map((m, k) => (
          <span key={m.k} className={cn('h-1.5 w-6 rounded-full transition-colors', k === n ? 'bg-ink' : 'bg-muted')} />
        ))}
      </div>
      <Text variant="muted" className="max-w-md text-balance">
        Eso de arriba es <strong className="font-semibold text-ink">lo mismo</strong>, contado de tres maneras. A cada persona le entra mejor una.
        Vamos a averiguar cuál es la tuya en un minuto.
      </Text>
    </div>
  )
}

function StepsPanel({ steps }: { steps: string[] }) {
  return (
    <ol className="flex w-full flex-col gap-2 text-sm text-ink">
      {steps.map((t, i) => (
        <li key={t} className="flex gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white tabular-nums">{i + 1}</span>
          <span className="leading-snug">{t}</span>
        </li>
      ))}
    </ol>
  )
}

function MapPanel({ text, footer }: { text: string; footer: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 text-ink">
      <DoodleMap size={96} />
      <p className="text-center text-sm leading-snug">
        {text}
        <span className="block text-ink-muted">{footer}</span>
      </p>
    </div>
  )
}

function Building() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => x + 1), 380)
    return () => window.clearInterval(t)
  }, [])
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8">
      <Logomark size={56} className="kit-nudge text-ink" />
      <Heading size="lg">Armando tu forma de aprender…</Heading>
      <div className="flex w-full flex-col gap-3">
        {AXES.map((e, k) => (
          <div key={e.key} className="flex items-center gap-3">
            <span className={cn('w-28 shrink-0 text-right text-xs font-semibold transition-colors', k < n ? 'text-ink' : 'text-ink-subtle')}>{e.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--color-teal-500)] transition-[width] duration-500 ease-out" style={{ width: k < n ? '100%' : '0%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function YourProfile({ profile, error, onRetry }: { profile: LiveProfile | null; error: boolean; onRetry: () => void }) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Heading size="lg">No se pudo guardar tu perfil</Heading>
        <Text variant="muted">Puede ser la conexión. Probá de nuevo.</Text>
        <Button onClick={onRetry}>Reintentar</Button>
      </div>
    )
  }
  if (!profile) return <Text variant="muted">Un segundo…</Text>
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <Eyebrow>Tu forma de aprender, hoy</Eyebrow>
      <Heading size="xl" className="text-balance">{headline(profile.profile)}</Heading>
      <ProfileBars profile={profile.profile} />
      <Text size="sm" variant="muted" className="max-w-lg text-balance">
        Esto no es una etiqueta ni un diagnóstico: es una foto de hoy, hecha con lo que acabás de elegir.
        A medida que hagas misiones, melu va a mirar con qué te va mejor de verdad y esto se va a mover solo.
      </Text>
    </div>
  )
}

/** Las seis barras. Cada eje reparte 100 entre sus polos.
 *  The color belongs to the axis, not the pole: two poles of the same axis do not compete for
 *  attention, they compete for width. The label says who is who, and the numbers go below. */
export function ProfileBars({ profile, compact = false }: { profile: Record<string, number>; compact?: boolean }) {
  const axes = useMemo(() => AXES, [])
  return (
    <div className={cn('grid w-full gap-5 text-left', compact ? 'gap-3' : 'sm:grid-cols-2')}>
      {axes.map((e) => {
        const withValue = e.poles.filter((p) => (profile[p] ?? 0) >= 0.05)
        return (
          <div key={e.key} className="flex flex-col gap-1.5">
            {!compact && <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{e.name}</span>}
            <div className="flex h-7 w-full overflow-hidden rounded border border-line">
              {e.poles.map((p: Pole) => {
                const v = profile[p] ?? 0
                return (
                  <div key={p} title={`${POLES[p].name} · ${Math.round(v * 100)}%`}
                    className={cn('flex items-center justify-center overflow-hidden whitespace-nowrap border-r border-surface px-1 text-[11px] font-semibold text-ink transition-[flex-grow] duration-700 ease-out last:border-r-0',
                      v >= 0.05 ? e.tint : 'bg-muted')}
                    style={{ flexGrow: Math.max(v, 0.02), flexBasis: 0 }}>
                    {v > 0.3 && POLES[p].name}
                  </div>
                )
              })}
            </div>
            <span className="text-[11px] tabular-nums text-ink-subtle">
              {withValue.map((p) => `${POLES[p].name} ${Math.round((profile[p] ?? 0) * 100)}`).join(' · ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
