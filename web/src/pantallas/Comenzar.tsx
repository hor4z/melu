// El onboarding del aprendiz. Tres capítulos: qué es esto, cómo aprendés, tu perfil.
//
// Dos reglas de ritmo: nunca más de dos preguntas seguidas sin que pase algo (mostrar, preguntar,
// mostrar), y una sola acción por pantalla.
//
// Y una regla de contenido: lo que se muestra tiene que estar al alcance de quien lo mira. A
// alguien de seis años "un tercio" no le dice nada, y una consigna de tres renglones tampoco.
// Por eso lo primero que se pregunta es por dónde anda, y de ahí sale todo el resto del guion.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import {
  Button, Card, DoodleBrote, DoodleFoco, DoodleGrupo, DoodleLibro, DoodleMapa, DoodlePuente, Eyebrow, Heading, Icon, IconButton, Logomark, Text, cn,
} from '@/kit'
import { api } from '../lib/api'
import { EJES, POLOS, titular, type PerfilVivo, type Polo } from '../lib/perfil'
import {
  BotonVoz, MUESTRAS, MuestraEscuchar, MuestraHacer, MuestraLeer, MuestraVer, consignaDe, tituloDe,
  type Banda, type ClaveMuestra,
} from '../bloques/Muestras'

/* ═══════════ el guion ═══════════ */

type Opcion = { valor: string; titulo: string; pie?: string; cuerpo?: ReactNode }
type Paso =
  | { tipo: 'contar'; clave: string; capitulo: number; render: ReactNode; cta: string }
  | { tipo: 'elegir'; clave: string; capitulo: number; titulo: string; bajada?: string; opciones: Opcion[]; columnas: 2 | 4; alto?: boolean }
  | { tipo: 'armando'; clave: string; capitulo: number }
  | { tipo: 'perfil'; clave: string; capitulo: number }

const CAPITULOS = ['Qué es esto', 'Cómo aprendés', 'Tu perfil']

function opcionesDeMuestra(que: ClaveMuestra): Opcion[] {
  return [
    { valor: 'ver', titulo: 'Mirá', cuerpo: <MuestraVer que={que} /> },
    { valor: 'escuchar', titulo: 'Escuchá', cuerpo: <MuestraEscuchar que={que} /> },
    { valor: 'leer', titulo: 'Leé', cuerpo: <MuestraLeer que={que} /> },
    { valor: 'hacer', titulo: consignaDe(que), cuerpo: <MuestraHacer que={que} /> },
  ]
}

/** Lo que cambia de una franja a otra: el ejemplo, el escenario y cuántas palabras se usan. */
const POR_BANDA: Record<Banda, {
  chispa: { titulo: string; bajada: string; opciones: Opcion[] }
  ritmo: { titulo: string; bajada: string; pasos: string[]; mapa: string; mapaPie: string }
  trabado: string
}> = {
  chico: {
    chispa: {
      titulo: 'La misma tarea, empezada de cuatro formas.',
      bajada: 'Contar los pasos que hay hasta el patio. ¿Cuál te gusta más?',
      opciones: [
        { valor: 'reto', titulo: '«¿Podés adivinar cuántos pasos son, antes de contarlos?»', pie: 'Un desafío' },
        { valor: 'historia', titulo: '«Un pingüino se perdió y tiene que contar los pasos para volver a casa.»', pie: 'Un cuento' },
        { valor: 'juego', titulo: '«Nivel 1. Un punto por cada paso bien contado.»', pie: 'Un juego' },
        { valor: 'real', titulo: '«Salimos al patio de verdad y los contamos.»', pie: 'De verdad' },
      ],
    },
    ritmo: {
      titulo: 'Las mismas instrucciones, de dos maneras.',
      bajada: 'Hacer un sándwich. Marcá la que se entiende mejor.',
      pasos: ['Sacá dos panes.', 'Poné el queso.', 'Tapá con el otro pan.', 'Cortalo al medio.'],
      mapa: 'Un sándwich es todo lo que quieras, siempre entre dos panes.',
      mapaPie: 'Sabiendo eso, el orden sale solo.',
    },
    trabado: 'Hay algo que no te sale.',
  },
  medio: {
    chispa: {
      titulo: 'La misma actividad, empezada de cuatro formas.',
      bajada: 'Medir la altura de un árbol. ¿Cuál abrirías?',
      opciones: [
        { valor: 'reto', titulo: '«¿Podés saber cuánto mide el árbol sin subirte? Tenés quince minutos.»', pie: 'Un reto' },
        { valor: 'historia', titulo: '«Tales se paró frente a una pirámide gigante y dijo: yo sé cuánto mide.»', pie: 'Una historia' },
        { valor: 'juego', titulo: '«Nivel 1 de 3. Diez puntos por cada sombra bien medida.»', pie: 'Un juego' },
        { valor: 'real', titulo: '«El patio de tu escuela, una cinta métrica, y hoy salís sabiendo cuánto mide ese árbol.»', pie: 'Algo real' },
      ],
    },
    ritmo: {
      titulo: 'Las mismas instrucciones, acomodadas de dos maneras.',
      bajada: 'Leé las dos y marcá la que te ordena la cabeza.',
      pasos: ['Medí tu sombra.', 'Medí cuánto medís vos.', 'Medí la sombra del árbol.', 'Dividí y multiplicá.'],
      mapa: 'Tu sombra y vos guardan la misma proporción que la sombra del árbol y el árbol.',
      mapaPie: 'Con eso sale todo. Los cuatro pasos son consecuencia.',
    },
    trabado: 'Te trabaste con algo y no sale.',
  },
  grande: {
    chispa: {
      titulo: 'La misma actividad, planteada de cuatro formas.',
      bajada: 'Medir la altura del edificio de enfrente. ¿Cuál abrirías?',
      opciones: [
        { valor: 'reto', titulo: '«¿Podés medir el edificio de enfrente sin salir del aula? Quince minutos.»', pie: 'Un reto' },
        { valor: 'historia', titulo: '«Tales se paró frente a una pirámide y dijo: yo sé cuánto mide. No tenía más que su propia sombra.»', pie: 'Una historia' },
        { valor: 'juego', titulo: '«Nivel 1 de 3. Diez puntos por cada medición dentro del margen de error.»', pie: 'Un juego' },
        { valor: 'real', titulo: '«Tu escuela, una cinta métrica y trigonometría: hoy salís con el dato real.»', pie: 'Algo real' },
      ],
    },
    ritmo: {
      titulo: 'Las mismas instrucciones, acomodadas de dos maneras.',
      bajada: 'Leé las dos y marcá la que te ordena la cabeza.',
      pasos: ['Medí tu sombra.', 'Medí cuánto medís vos.', 'Medí la sombra del edificio.', 'Aplicá la proporción.'],
      mapa: 'Dos triángulos con el mismo ángulo del sol son semejantes: sus lados guardan la misma razón.',
      mapaPie: 'De ahí sale todo lo demás; los cuatro pasos son la cuenta.',
    },
    trabado: 'Te trabaste con algo y no sale.',
  },
}

function guion(banda: Banda): Paso[] {
  const b = POR_BANDA[banda]
  const [muestraA, muestraB] = MUESTRAS[banda]
  const chico = banda === 'chico'

  return [
    {
      tipo: 'contar', clave: 'hola', capitulo: 0, cta: 'Empezar',
      render: (
        <div className="flex flex-col items-center gap-6 text-center">
          <Logomark size={72} className="kit-rise text-ink" />
          <div className="flex flex-col gap-3">
            <Heading size="2xl" className="kit-reveal kit-retraso-1">Hola. Esto es melu.</Heading>
            <Text size="xl" variant="muted" className="kit-reveal kit-retraso-2 max-w-md text-balance">
              Un lugar donde se aprende haciendo: tocás, probás, te equivocás y seguís. Nada de mirar una pantalla sin hacer nada.
            </Text>
          </div>
        </div>
      ),
    },
    {
      tipo: 'elegir', clave: 'banda', capitulo: 0, columnas: 4, alto: true,
      titulo: '¿Por dónde andás?',
      bajada: 'Para mostrarte ejemplos que te sirvan y no cosas que todavía no viste.',
      opciones: [
        { valor: 'chico', titulo: 'Recién empiezo', pie: 'Estoy aprendiendo a leer y a contar', cuerpo: <DoodleBrote size={72} /> },
        { valor: 'medio', titulo: 'Voy a la primaria', pie: 'Leo bien y ya sé multiplicar', cuerpo: <DoodleLibro size={72} /> },
        { valor: 'grande', titulo: 'Secundaria o más', pie: 'Me manejo con fracciones y ecuaciones', cuerpo: <DoodlePuente size={72} /> },
      ],
    },
    {
      tipo: 'contar', clave: 'como', capitulo: 0, cta: 'Entendido',
      render: (
        <div className="flex w-full max-w-2xl flex-col gap-8">
          <Heading size="xl" className="text-center">Funciona así</Heading>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { d: <DoodleGrupo size={84} />, t: 'Alguien arma la misión', p: chico ? 'Tu seño, tu profe, quien te acompañe.' : 'Tu profe, tu tallerista, quien te acompañe.' },
              { d: <DoodleFoco size={84} />, t: 'Vos la hacés a tu ritmo', p: chico ? 'De a una cosa por vez. Te avisa si va bien.' : 'Un paso por pantalla. Te dice al toque si va bien.' },
              { d: <DoodleBrote size={84} />, t: 'melu se acomoda a vos', p: chico ? 'Mira qué te sale mejor y te trae más de eso.' : 'Mira con qué te va mejor y te propone más de eso.' },
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
    { tipo: 'contar', clave: 'wow', capitulo: 0, cta: 'Buscar la mía', render: <PantallaWow que={muestraA} /> },

    {
      tipo: 'elegir', clave: 'canal1', capitulo: 1, columnas: 4, alto: true,
      titulo: `${tituloDe(muestraA)}, explicado de cuatro maneras.`,
      bajada: chico ? 'Probá las cuatro. Después marcá «con esta» en la que te gustó más.' : 'Probá las cuatro. Después marcá «con esta» en la que te lo hizo entender más rápido.',
      opciones: opcionesDeMuestra(muestraA),
    },
    {
      tipo: 'elegir', clave: 'canal2', capitulo: 1, columnas: 4, alto: true,
      titulo: 'Otra cosa, las mismas cuatro maneras.',
      bajada: `${tituloDe(muestraB)}. Probalas de nuevo y marcá con cuál lo agarrás.`,
      opciones: opcionesDeMuestra(muestraB),
    },
    { tipo: 'elegir', clave: 'chispa', capitulo: 1, columnas: 4, titulo: b.chispa.titulo, bajada: b.chispa.bajada, opciones: b.chispa.opciones },
    {
      tipo: 'elegir', clave: 'ritmo', capitulo: 1, columnas: 2, alto: true,
      titulo: b.ritmo.titulo, bajada: b.ritmo.bajada,
      opciones: [
        { valor: 'paso', titulo: 'Paso a paso', cuerpo: <PanelPasos pasos={b.ritmo.pasos} /> },
        { valor: 'mapa', titulo: 'Todo junto', cuerpo: <PanelMapa texto={b.ritmo.mapa} pie={b.ritmo.mapaPie} /> },
      ],
    },
    {
      tipo: 'elegir', clave: 'compania', capitulo: 1, columnas: 4,
      titulo: b.trabado,
      bajada: '¿Qué hacés, en general?',
      opciones: [
        { valor: 'pensar', titulo: chico ? 'Sigo probando hasta que sale' : 'Le sigo dando vueltas hasta que sale', pie: 'Solo' },
        { valor: 'buscar', titulo: chico ? 'Miro cómo lo hizo otro' : 'Busco un ejemplo parecido', pie: 'Solo, con ayuda' },
        { valor: 'preguntar', titulo: 'Le pregunto a alguien', pie: 'Con otros' },
        { valor: 'contar', titulo: chico ? 'Lo cuento en voz alta y ahí me doy cuenta' : 'Se lo cuento a alguien en voz alta y ahí me doy cuenta', pie: 'Con otros' },
      ],
    },
    {
      tipo: 'elegir', clave: 'andamio', capitulo: 1, columnas: 2,
      titulo: chico ? 'Algo que nunca hiciste.' : 'Algo nuevo que nunca viste.',
      bajada: '¿Cómo preferís arrancar?',
      opciones: [
        { valor: 'ejemplo', titulo: 'Mostrame uno hecho y después lo hago yo', pie: 'Con un ejemplo' },
        { valor: 'probar', titulo: 'Dejame probar y me doy cuenta solo', pie: 'Descubriendo' },
      ],
    },
    {
      tipo: 'elegir', clave: 'dosis', capitulo: 1, columnas: 2,
      titulo: 'Última.',
      bajada: chico ? '¿Cuándo te sale mejor?' : '¿Cuándo te rinde más?',
      opciones: [
        { valor: 'bocado', titulo: 'Un ratito, varias veces', pie: 'Diez minutos y listo' },
        { valor: 'sesion', titulo: chico ? 'Un rato largo y no me interrumpas' : 'Una sentada larga y no me saques', pie: 'Meterme y no salir' },
      ],
    },

    { tipo: 'armando', clave: 'armando', capitulo: 2 },
    { tipo: 'perfil', clave: 'perfil', capitulo: 2 },
  ]
}

/* ═══════════ el recorrido ═══════════ */

export function Comenzar() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const [i, setI] = useState(0)
  const [resp, setResp] = useState<Record<string, string>>({})
  const [perfil, setPerfil] = useState<PerfilVivo | null>(null)

  const banda = (resp.banda as Banda) ?? 'medio'
  const PASOS = useMemo(() => guion(banda), [banda])
  const paso = PASOS[i]
  const chico = banda === 'chico'

  // Ojo: no se invalida ['yo'] al guardar. Si se invalidara, la app vería `perfil: true`, dejaría
  // de renderizar este recorrido y la persona nunca vería su propio resultado. Se invalida al salir.
  const guardar = useMutation({
    mutationFn: (r: Record<string, string>) => api.post<PerfilVivo>('/api/perfil', { respuestas: r }),
    onSuccess: setPerfil,
  })

  async function salir() {
    await qc.invalidateQueries({ queryKey: ['yo'] })
    nav('/hoy', { replace: true })
  }

  const avanzar = () => setI((n) => Math.min(n + 1, PASOS.length - 1))

  // al llegar a "armando" se guarda; la pantalla dura lo que dura la animación
  useEffect(() => {
    if (paso.tipo !== 'armando') return
    guardar.mutate(resp)
    const t = window.setTimeout(avanzar, 2600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso.tipo])

  function elegir(valor: string) {
    setResp((r) => ({ ...r, [paso.clave]: valor }))
    window.setTimeout(avanzar, 220)
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 pt-5 sm:px-8">
        <IconButton icon={<Icon icon={ArrowLeft} />} label="Volver" variant="ghost"
          onClick={() => setI((n) => Math.max(0, n - 1))} className={cn(i === 0 && 'invisible')} />
        <Progreso pasos={PASOS} capitulo={paso.capitulo} indice={i} />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
        <div key={paso.clave} className="kit-reveal flex w-full max-w-4xl flex-col items-center">
          {paso.tipo === 'contar' && paso.render}
          {paso.tipo === 'elegir' && <Pregunta paso={paso} elegido={resp[paso.clave]} onElegir={elegir} conVoz={chico || paso.clave === 'banda'} />}
          {paso.tipo === 'armando' && <Armando />}
          {paso.tipo === 'perfil' && <TuPerfil perfil={perfil} error={guardar.isError} onReintentar={() => guardar.mutate(resp)} />}
        </div>
      </main>

      <footer className="sticky bottom-0 flex justify-center bg-gradient-to-t from-canvas via-canvas px-4 pb-8 pt-4">
        {paso.tipo === 'contar' && <Button size="lg" onClick={avanzar} endIcon={<Icon icon={ChevronRight} />}>{paso.cta}</Button>}
        {paso.tipo === 'perfil' && <Button size="lg" onClick={salir} disabled={!perfil}>Ir a mis misiones</Button>}
      </footer>
    </div>
  )
}

function Progreso({ pasos, capitulo, indice }: { pasos: Paso[]; capitulo: number; indice: number }) {
  const porCapitulo = CAPITULOS.map((_, c) => pasos.filter((p) => p.capitulo === c).length)
  return (
    <div className="flex flex-1 items-center gap-2" role="progressbar" aria-valuenow={indice + 1} aria-valuemax={pasos.length} aria-label="Progreso">
      {CAPITULOS.map((nombre, c) => {
        const antes = porCapitulo.slice(0, c).reduce((a, b) => a + b, 0)
        const hechos = Math.max(0, Math.min(porCapitulo[c], indice - antes))
        return (
          <div key={nombre} className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--color-teal-500)] transition-[width] duration-500 ease-out"
                style={{ width: `${(hechos / porCapitulo[c]) * 100}%` }} />
            </div>
            <span className={cn('mt-1 hidden text-[11px] font-medium sm:block', c === capitulo ? 'text-ink' : 'text-ink-subtle')}>{nombre}</span>
          </div>
        )
      })}
    </div>
  )
}

function Pregunta({ paso, elegido, onElegir, conVoz }: {
  paso: Extract<Paso, { tipo: 'elegir' }>; elegido?: string; onElegir: (v: string) => void; conVoz?: boolean
}) {
  return (
    <div className="flex w-full flex-col items-center gap-7">
      <div className="flex max-w-2xl flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <Heading size="lg" className="text-balance">{paso.titulo}</Heading>
          {/* Para quien todavía no lee suelto, la consigna también se escucha. */}
          {conVoz && <BotonVoz texto={`${paso.titulo} ${paso.bajada ?? ''}`} />}
        </div>
        {paso.bajada && <Text variant="muted" className="text-balance">{paso.bajada}</Text>}
      </div>
      <div role="radiogroup" className={cn('grid w-full gap-3', paso.columnas === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2')}>
        {paso.opciones.map((o, k) => {
          const puesto = cn(
            'kit-reveal flex flex-col gap-3 rounded-xl border-2 border-line bg-surface p-4 text-left transition',
            elegido === o.valor && 'border-ink bg-teal',
            paso.alto && 'min-h-[16rem]',
            `kit-retraso-${Math.min(3, k + 1)}`,
          )
          // Cuando la tarjeta trae algo con lo que se juega, tocarla no puede significar "elijo esta":
          // el toque es del contenido. La elección va aparte, abajo, y se ve.
          const interactiva = o.cuerpo && !o.pie
          return interactiva ? (
            <div key={o.valor} className={puesto}>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-ink-subtle">{o.titulo}</span>
              <span className="flex flex-1 items-center justify-center text-ink">{o.cuerpo}</span>
              <button type="button" role="radio" aria-checked={elegido === o.valor} aria-label={`Elegir: ${o.titulo}`}
                onClick={() => onElegir(o.valor)}
                className={cn('rounded border-2 border-line px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-ink-muted transition',
                  'hover:border-ink hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                  elegido === o.valor && 'border-ink bg-ink text-white')}>
                Con esta
              </button>
            </div>
          ) : (
            <button key={o.valor} type="button" role="radio" aria-checked={elegido === o.valor}
              onClick={() => onElegir(o.valor)}
              className={cn(puesto, 'items-start justify-between hover:border-ink/40 hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus')}>
              {o.cuerpo && <span className="flex w-full flex-1 items-center justify-center text-ink">{o.cuerpo}</span>}
              <span className="text-[15px] font-medium leading-snug text-ink">{o.titulo}</span>
              {o.pie && <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">{o.pie}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════ pantallas propias ═══════════ */

/** El momento en que se entiende la idea: lo mismo, tres veces, solo. */
function PantallaWow({ que }: { que: ClaveMuestra }) {
  const modos = [
    { k: 'ver', etiqueta: 'Viéndolo', nodo: <MuestraVer que={que} /> },
    { k: 'leer', etiqueta: 'Leyéndolo', nodo: <MuestraLeer que={que} /> },
    { k: 'hacer', etiqueta: 'Haciéndolo', nodo: <MuestraHacer que={que} /> },
  ]
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => (x + 1) % modos.length), 2000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [que])
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <Eyebrow>La idea</Eyebrow>
      <Heading size="2xl" className="text-balance">No todos aprendemos igual.</Heading>
      <Card className="w-full max-w-md">
        <div className="flex h-52 flex-col items-center justify-center gap-3 p-6">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{modos[n].etiqueta}</span>
          <div key={n} className="kit-reveal flex w-full items-center justify-center text-ink">{modos[n].nodo}</div>
        </div>
      </Card>
      <div className="flex gap-1.5">
        {modos.map((m, k) => (
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

function PanelPasos({ pasos }: { pasos: string[] }) {
  return (
    <ol className="flex w-full flex-col gap-2 text-sm text-ink">
      {pasos.map((t, i) => (
        <li key={t} className="flex gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white tabular-nums">{i + 1}</span>
          <span className="leading-snug">{t}</span>
        </li>
      ))}
    </ol>
  )
}

function PanelMapa({ texto, pie }: { texto: string; pie: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 text-ink">
      <DoodleMapa size={96} />
      <p className="text-center text-sm leading-snug">
        {texto}
        <span className="block text-ink-muted">{pie}</span>
      </p>
    </div>
  )
}

function Armando() {
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
        {EJES.map((e, k) => (
          <div key={e.clave} className="flex items-center gap-3">
            <span className={cn('w-28 shrink-0 text-right text-xs font-semibold transition-colors', k < n ? 'text-ink' : 'text-ink-subtle')}>{e.nombre}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--color-teal-500)] transition-[width] duration-500 ease-out" style={{ width: k < n ? '100%' : '0%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TuPerfil({ perfil, error, onReintentar }: { perfil: PerfilVivo | null; error: boolean; onReintentar: () => void }) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Heading size="lg">No se pudo guardar tu perfil</Heading>
        <Text variant="muted">Puede ser la conexión. Probá de nuevo.</Text>
        <Button onClick={onReintentar}>Reintentar</Button>
      </div>
    )
  }
  if (!perfil) return <Text variant="muted">Un segundo…</Text>
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <Eyebrow>Tu forma de aprender, hoy</Eyebrow>
      <Heading size="xl" className="text-balance">{titular(perfil.perfil)}</Heading>
      <BarrasPerfil perfil={perfil.perfil} />
      <Text size="sm" variant="muted" className="max-w-lg text-balance">
        Esto no es una etiqueta ni un diagnóstico: es una foto de hoy, hecha con lo que acabás de elegir.
        A medida que hagas misiones, melu va a mirar con qué te va mejor de verdad y esto se va a mover solo.
      </Text>
    </div>
  )
}

/** Las seis barras. Cada eje reparte 100 entre sus polos.
 *  El color es del eje, no del polo: dos polos del mismo eje no compiten por atención,
 *  compiten por ancho. Quién es quién lo dice la etiqueta, y abajo van los números. */
export function BarrasPerfil({ perfil, compacto = false }: { perfil: Record<string, number>; compacto?: boolean }) {
  const ejes = useMemo(() => EJES, [])
  return (
    <div className={cn('grid w-full gap-5 text-left', compacto ? 'gap-3' : 'sm:grid-cols-2')}>
      {ejes.map((e) => {
        const conValor = e.polos.filter((p) => (perfil[p] ?? 0) >= 0.05)
        return (
          <div key={e.clave} className="flex flex-col gap-1.5">
            {!compacto && <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-subtle">{e.nombre}</span>}
            <div className="flex h-7 w-full overflow-hidden rounded border border-line">
              {e.polos.map((p: Polo) => {
                const v = perfil[p] ?? 0
                return (
                  <div key={p} title={`${POLOS[p].nombre} · ${Math.round(v * 100)}%`}
                    className={cn('flex items-center justify-center overflow-hidden whitespace-nowrap border-r border-surface px-1 text-[11px] font-semibold text-ink transition-[flex-grow] duration-700 ease-out last:border-r-0',
                      v >= 0.05 ? e.tinte : 'bg-muted')}
                    style={{ flexGrow: Math.max(v, 0.02), flexBasis: 0 }}>
                    {v > 0.3 && POLOS[p].nombre}
                  </div>
                )
              })}
            </div>
            <span className="text-[11px] tabular-nums text-ink-subtle">
              {conValor.map((p) => `${POLOS[p].nombre} ${Math.round((perfil[p] ?? 0) * 100)}`).join(' · ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
