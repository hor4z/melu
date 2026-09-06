// Mi perfil: lo que la persona puede ver y cambiar de sí misma.
//
// Se entra tocando el propio avatar, arriba a la derecha, que es donde todo el mundo lo busca.
// Y como se entra por ahí, el avatar es lo primero de la pantalla: quien viene a cambiarse la
// cara no tiene que pasar por encima de un formulario de nombres para encontrarlo.
//
// La regla de qué se edita no la decide esta pantalla, la decide de dónde viene cada dato. El
// nombre y el avatar los eligió la persona, así que se editan. El email es la identidad de
// Google y es lo que ata la fila a la cuenta: se muestra y no se toca. Los espacios y los roles
// los da de alta quien te sumó, así que se leen.
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Dices, School } from 'lucide-react'
import {
  ART_PARTS, ART_PART_LABELS, ART_STYLES, ART_STYLE_LABELS, Avatar, Button, Card, Chip, Field, FormActions,
  Heading, Icon, Input, Text, artValues, avatarArt, cn, focusRing, isColorPart, type ArtStyle,
} from '@melu/ui'
import { api, newId, type Me } from '../lib/api'
import { ROLES, SPACE_KINDS } from '../lib/composition'

type Options = Record<string, string>

/** Un cuadradito para elegir: la figura adentro y el borde diciendo si está elegida. */
function Pick({ label, isOn, onPick, className, children }: {
  label: string; isOn: boolean; onPick: () => void; className?: string; children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onPick} aria-pressed={isOn} title={label}
      className={cn('rounded-xl border-2 p-1 transition-colors', focusRing,
        isOn ? 'border-ink bg-accent-subtle' : 'border-line hover:border-ink', className)}>
      {children}
      {isOn && <span className="sr-only">elegido</span>}
    </button>
  )
}

/** Las opciones de una parte, cada una dibujada con el avatar de la persona y no con un ejemplo. */
function PartRow({ style, seed, options, part, onPick }: {
  style: ArtStyle; seed: string; options: Options; part: string; onPick: (v: string) => void
}) {
  const values = artValues(style, part)
  const color = isColorPart(part)
  if (values.length === 0) return null
  return (
    // `items-start`: sin esto cada opción es un item flex que se estira a lo alto de la fila de
    // la grilla, que la manda la columna de las partes de al lado, y quedan botones de doscientos
    // y pico de píxeles con una carita de cuarenta y ocho adentro.
    <div className="flex flex-wrap items-start content-start gap-2">
      {values.map((v) => (
        <Pick key={v} label={`${ART_PART_LABELS[part] ?? part}: ${v}`} isOn={options[part] === v} onPick={() => onPick(v)}>
          {color
            ? <span className="block size-9 rounded-lg" style={{ background: `#${v}` }} />
            : <span className="block size-12 overflow-hidden rounded-lg [&>svg]:size-full" aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: avatarArt(style, seed, { ...options, [part]: v }) }} />}
        </Pick>
      ))}
    </div>
  )
}

export function Profile({ me }: { me: Me }) {
  const qc = useQueryClient()
  const { person } = me
  const [first, setFirst] = useState(person.firstName ?? '')
  const [last, setLast] = useState(person.lastName ?? '')
  const [nick, setNick] = useState(person.nickname ?? '')
  const [style, setStyle] = useState<ArtStyle | null>(person.avatarStyle ?? null)
  // La semilla se guarda incluso mientras se mira la foto, así que volver a la figura devuelve
  // la que la persona había armado y no una nueva.
  const [seed, setSeed] = useState(person.avatarSeed ?? '')
  const [options, setOptions] = useState<Options>(person.avatarOptions ?? {})
  const [part, setPart] = useState<string>(ART_PARTS[person.avatarStyle ?? ART_STYLES[0]][0])

  // El mismo cálculo que hace el backend. Se repite acá para que la pantalla pueda mostrar el
  // nombre que va a quedar antes de guardar, que es cuando sirve verlo.
  const shown = nick.trim() || `${first.trim()} ${last.trim()}`.trim()
  const artSeed = seed || shown || person.name

  const save = useMutation({
    mutationFn: () => api.patch<Me>('/api/me', {
      firstName: first.trim(), lastName: last.trim(), nickname: nick.trim(),
      avatarStyle: style ?? '', avatarSeed: style ? seed : '', avatarOptions: style ? options : null,
    }),
    // El header, el selector de espacios y esta pantalla leen el mismo `me`: se escribe la
    // respuesta en la cache y los tres cambian juntos, sin un segundo viaje.
    onSuccess: (up) => qc.setQueryData(['me'], up),
  })

  // Comparadas por clave ordenada y no con `JSON.stringify` a secas: el orden de las claves de
  // un objeto es el de inserción, el de acá lo da el orden en el que la persona tocó las partes,
  // y el que vuelve del servidor viene alfabético, porque Go serializa los mapas ordenados. Con
  // stringify pelado, guardar dejaba la pantalla diciendo que todavía había cambios sin guardar.
  const same = (a: Options, b: Options) => {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort()
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k])
  }
  const dirty = first.trim() !== (person.firstName ?? '') || last.trim() !== (person.lastName ?? '')
    || nick.trim() !== (person.nickname ?? '') || (style ?? '') !== (person.avatarStyle ?? '')
    || (style ? seed : '') !== (person.avatarSeed ?? '') || !same(style ? options : {}, person.avatarOptions ?? {})
  const canSave = shown !== '' && dirty && !save.isPending

  function pickStyle(s: ArtStyle | null) {
    setStyle(s)
    // Las partes son de cada estilo: el robot no tiene pelo. Cambiar de estilo empieza de cero,
    // porque arrastrar las partes viejas termina en una cara que nadie eligió.
    if (s) { setOptions({}); setPart(ART_PARTS[s][0]) }
  }

  function revert() {
    setFirst(person.firstName ?? ''); setLast(person.lastName ?? ''); setNick(person.nickname ?? '')
    setStyle(person.avatarStyle ?? null); setSeed(person.avatarSeed ?? ''); setOptions(person.avatarOptions ?? {})
    save.reset()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Guardar vive acá arriba y no en una barra pegada abajo. La barra tapaba los últimos
          sesenta y pico de píxeles de la ventana, que es justo donde asomaba la sección
          siguiente: en una pantalla chica parecía que la página terminaba ahí. */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading level={1} size="2xl">Mi perfil</Heading>
          <Text variant="muted">Cómo te ve el resto de melu.</Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shown === '' && <Text size="sm" variant="danger">Poné al menos un nombre o un apodo.</Text>}
          {save.isError && <Text size="sm" variant="danger">No se pudo guardar. Probá de nuevo.</Text>}
          {save.isSuccess && !dirty && (
            <Text size="sm" className="flex items-center gap-1 text-success"><Icon icon={Check} size="sm" /> Guardado</Text>
          )}
          {dirty && <Button variant="ghost" onClick={revert}>Descartar</Button>}
          <Button onClick={() => save.mutate()} disabled={!canSave} loading={save.isPending}>Guardar</Button>
        </div>
      </header>

      <Card padding="lg" className="gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={shown || person.name} src={person.avatarUrl} artStyle={style ?? undefined}
            artSeed={artSeed} artOptions={options} size="xl" />
          <div className="min-w-0 flex-1">
            <Heading level={2} size="lg">Tu avatar</Heading>
            <Text variant="muted">Tu foto de Google, o una figura que armás parte por parte.</Text>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {person.avatarUrl && (
            <Pick label="Mi foto de Google" isOn={style === null} onPick={() => pickStyle(null)} className="flex flex-col items-center gap-1 p-2">
              <Avatar name={person.name} src={person.avatarUrl} size="lg" />
              <span className="text-xs font-medium text-ink-muted">Mi foto</span>
            </Pick>
          )}
          {ART_STYLES.map((s) => (
            <Pick key={s} label={ART_STYLE_LABELS[s]} isOn={style === s} onPick={() => pickStyle(s)} className="flex flex-col items-center gap-1 p-2">
              <Avatar name={person.name} artStyle={s} artSeed={artSeed} size="lg" />
              <span className="text-xs font-medium text-ink-muted">{ART_STYLE_LABELS[s]}</span>
            </Pick>
          ))}
        </div>

        {style ? (
          <>
            {/* Las partes a un costado y sus opciones al lado. Los cuarenta y cinco peinados de
                un estilo, todos juntos con las bocas y los ojos, son una pantalla que nadie
                termina de recorrer. */}
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <div className="flex gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
                {ART_PARTS[style].map((p) => (
                  <button key={p} type="button" onClick={() => setPart(p)} aria-pressed={part === p}
                    className={cn('shrink-0 rounded-lg px-3 py-2 text-left text-sm transition-colors', focusRing,
                      part === p ? 'bg-teal font-semibold text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink')}>
                    {ART_PART_LABELS[p] ?? p}
                  </button>
                ))}
              </div>
              <PartRow style={style} seed={artSeed} options={options} part={part}
                onPick={(v) => setOptions((o) => ({ ...o, [part]: v }))} />
            </div>

            <FormActions>
              <Button variant="secondary" startIcon={<Icon icon={Dices} size="sm" />} onClick={() => { setSeed(newId()); setOptions({}) }}>
                Sorpresa
              </Button>
              {Object.keys(options).length > 0 && (
                <Button variant="ghost" onClick={() => setOptions({})}>Volver a la de fábrica</Button>
              )}
              <Text size="sm" variant="muted">Sorpresa reparte todo de nuevo. Lo que elijas a mano queda.</Text>
            </FormActions>
          </>
        ) : (
          <Text size="sm" variant="muted">Estás usando tu foto de Google. Tocá la figura y aparecen las partes para armarla.</Text>
        )}
      </Card>

      <Card padding="lg" className="gap-4">
        <div>
          <Heading level={2} size="lg">Tu nombre</Heading>
          <Text variant="muted">
            El apellido es para el guía que tiene dos Sofías en el mismo grupo. El apodo, si lo ponés, gana: es como te vamos a llamar.
          </Text>
        </div>
        {/* Nombre y apellido juntos, que son la misma pregunta partida en dos, y el apodo abajo
            y solo, que es otra: la que gana cuando está puesta. */}
        <div className="flex max-w-lg flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><Input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} /></Field>
            <Field label="Apellido"><Input value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} /></Field>
          </div>
          <Field label="Apodo" optional>
            <Input value={nick} onChange={(e) => setNick(e.target.value)} maxLength={60} placeholder={first || 'Cómo te dicen'} />
          </Field>
        </div>
      </Card>

      <Card padding="lg" className="gap-4">
        <div>
          <Heading level={2} size="lg">Dónde estás</Heading>
          <Text variant="muted">Tu email es {person.email}, y es con lo que te suman a un espacio o a un grupo. Se cambia en tu cuenta de Google.</Text>
        </div>
        <ul className="flex flex-col gap-2">
          {me.spaces.map((e) => {
            const roles = [...new Set(me.memberships.filter((m) => m.spaceId === e.id).map((m) => m.role))]
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block text-xs text-ink-subtle">{SPACE_KINDS[e.kind] ?? e.kind}</span>
                </span>
                {roles.map((r) => <Chip key={r} size="sm" color={r === 'learner' ? 'accent' : 'default'}>{ROLES[r] ?? r}</Chip>)}
              </li>
            )
          })}
          {me.spaces.length === 0 && <Text variant="muted">Todavía no estás en ningún espacio.</Text>}
        </ul>
      </Card>
    </div>
  )
}
