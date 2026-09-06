// Mi perfil: lo que la persona puede ver y cambiar de sí misma.
//
// Se entra tocando el propio avatar, arriba a la derecha, que es donde todo el mundo lo busca.
//
// Dos columnas, y la división es una sola: a la izquierda lo que se mira (cómo te ve el resto y
// dónde estás), a la derecha lo que se toca. Quedó así después de que la primera versión, todo
// apilado en una columna, dejara el avatar arrancando en el borde de abajo de la ventana: se
// leía como que la pantalla terminaba ahí.
//
// Qué se edita no lo decide esta pantalla, lo decide de dónde viene cada dato. El nombre y el
// avatar los eligió la persona, así que se editan. El email es la identidad de Google y es lo
// que ata la fila a la cuenta: se muestra y no se toca. Los espacios y los roles los da de alta
// quien te sumó, así que se leen.
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Palette, School } from 'lucide-react'
import {
  ART_STYLES, Avatar, Button, Card, Field, Heading, Icon, Input, SegmentedControl,
  SegmentedControlItem, Text, type ArtStyle,
} from '@melu/ui'
import { api, type Me } from '../lib/api'
import { AvatarBuilder, type Figure } from '../blocks/AvatarBuilder'
import { ROLES, SPACE_KINDS } from '../lib/composition'

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
  const [options, setOptions] = useState<Record<string, string>>(person.avatarOptions ?? {})
  const [building, setBuilding] = useState(false)

  // El mismo cálculo que hace el backend. Se repite acá para que la pantalla pueda mostrar el
  // nombre que va a quedar antes de guardar, que es cuando sirve verlo.
  const shown = nick.trim() || `${first.trim()} ${last.trim()}`.trim()
  const artSeed = seed || shown || person.name
  const rolesOf = (spaceId: string) => [...new Set(me.memberships.filter((m) => m.spaceId === spaceId).map((m) => m.role))]

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
  const same = (a: Record<string, string>, b: Record<string, string>) => {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort()
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k])
  }
  const dirty = first.trim() !== (person.firstName ?? '') || last.trim() !== (person.lastName ?? '')
    || nick.trim() !== (person.nickname ?? '') || (style ?? '') !== (person.avatarStyle ?? '')
    || (style ? seed : '') !== (person.avatarSeed ?? '') || !same(style ? options : {}, person.avatarOptions ?? {})
  const canSave = shown !== '' && dirty && !save.isPending

  function revert() {
    setFirst(person.firstName ?? ''); setLast(person.lastName ?? ''); setNick(person.nickname ?? '')
    setStyle(person.avatarStyle ?? null); setSeed(person.avatarSeed ?? ''); setOptions(person.avatarOptions ?? {})
    save.reset()
  }

  // Confirmar en el panel es lo único que puede pasar de la foto a la figura: abrirlo y mirar no
  // le cambia el avatar a nadie.
  function useFigure(f: Figure) {
    setStyle(f.style); setSeed(f.seed); setOptions(f.options); setBuilding(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading level={1} size="2xl">Mi perfil</Heading>
          <Text variant="muted">Cómo te ve el resto.</Text>
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

      {/* El `top-24` despeja el header del shell, que es sticky y mide `h-16`. Es el mismo número
          que usa el editor de actividades, que tiene este mismo layout espejado. */}
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card padding="lg" className="items-center gap-3 text-center">
            <Avatar name={shown || person.name} src={person.avatarUrl} artStyle={style ?? undefined}
              artSeed={artSeed} artOptions={options} className="size-28" />
            <div className="min-w-0">
              <Heading level={2} size="lg" className="break-words">{shown || 'Sin nombre'}</Heading>
              <Text size="sm" variant="muted" className="break-all">{person.email}</Text>
            </div>
          </Card>

          <Card padding="lg" className="gap-3">
            <Heading level={2} size="lg">Dónde estás</Heading>
            <ul className="flex flex-col gap-2">
              {me.spaces.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lilac"><Icon icon={School} size="lg" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.name}</span>
                    {/* El rol va acá y no arriba con el nombre: se es guía de un espacio, no guía
                        a secas, y quien está en dos puede ser una cosa en uno y otra en el otro. */}
                    <span className="block text-xs text-ink-subtle">{rolesOf(e.id).map((r) => ROLES[r] ?? r).join(' · ') || SPACE_KINDS[e.kind] || e.kind}</span>
                  </span>
                </li>
              ))}
              {me.spaces.length === 0 && <Text size="sm" variant="muted">Todavía no estás en ningún espacio.</Text>}
            </ul>
          </Card>
        </aside>

        <div className="flex flex-col gap-6">
          <Card padding="lg" className="gap-4">
            <div>
              <Heading level={2} size="lg">Tu nombre</Heading>
              <Text variant="muted">
                El apellido es para el guía que tiene dos Sofías en el mismo grupo. El apodo, si lo ponés, gana: es como te vamos a llamar.
              </Text>
            </div>
            {/* Nombre y apellido juntos, que son la misma pregunta partida en dos, y el apodo
                abajo y solo, que es otra: la que gana cuando está puesta. */}
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
            {/* Sin bajada: de dónde salió la foto es asunto nuestro, no de quien la mira, y
                nombrar a Google acá manda a pensar en un lugar donde esto no se resuelve. */}
            <Heading level={2} size="lg">Tu avatar</Heading>
            {/* La elección va al pie, y armar cuelga de ella: aparece cuando elegís la figura y
                no está cuando elegís la foto, porque no hay nada que armar. Van en la misma
                línea y el botón es fantasma a propósito: son un solo gesto, no dos bloques
                enfrentados. Sin foto de Google no hay entre qué elegir, así que el segmentado
                no está y queda solo el botón. */}
            <div className="flex flex-wrap items-center gap-1">
              {person.avatarUrl && (
                <SegmentedControl label="Qué avatar usás" value={style ? 'art' : 'photo'}
                  onValueChange={(v) => setStyle(v === 'art' ? (style ?? ART_STYLES[0]) : null)}>
                  <SegmentedControlItem value="photo">Mi foto</SegmentedControlItem>
                  <SegmentedControlItem value="art">Una figura</SegmentedControlItem>
                </SegmentedControl>
              )}
              {style && (
                <Button variant="ghost" startIcon={<Icon icon={Palette} size="sm" />} onClick={() => setBuilding(true)}>
                  Armar mi figura
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Montado siempre, y abierto con `isOpen`: el diálogo del kit devuelve el foco al botón en
          un efecto que mira el paso de abierto a cerrado, y si el panel se desmontara al cerrar
          ese efecto no correría nunca y el foco se caería al body. */}
      <AvatarBuilder isOpen={building} name={shown || person.name}
        value={{ style: style ?? ART_STYLES[0], seed, options }}
        onCancel={() => setBuilding(false)} onUse={useFigure} />
    </div>
  )
}
