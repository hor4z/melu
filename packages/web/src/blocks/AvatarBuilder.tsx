// El armador de la figura: un panel donde se elige parte por parte, con la cara grande a la
// vista mientras se prueba.
//
// Vive acá y no en @melu/ui porque sabe de melu: de qué partes tiene una figura, de cuánto hay
// que acercarse para que se distingan ocho pares de ojos, y de que nada se guarda hasta que la
// persona toque Guardar en su perfil.
//
// Y vive fuera de la pantalla de perfil porque armar una cara es una tarea con principio y fin.
// En la pantalla ocupaba seis filas de miniaturas y empujaba todo lo demás fuera de la vista.
import { useState } from 'react'
import { Dices } from 'lucide-react'
import {
  ART_PARTS, ART_PART_LABELS, Avatar, Button, Icon, Tabs, TabsContent, TabsList, TabsTrigger, Text,
  artValues, avatarArt, cn, focusRing, isColorPart, type ArtStyle, type ArtView,
} from '@melu/ui'
import { newId } from '../lib/api'
import { Modal } from './Modal'

export type Figure = { style: ArtStyle; seed: string; options: Record<string, string> }

// How close each part's thumbnail sits. Eyes and mouth are a small patch of the face: drawn
// whole at 56 px, the eight variants are eight identical smudges. Hair, skin and accessories
// change the whole head, so they are shown whole and zooming in would crop what is being chosen.
//
// The numbers are not a guess. They come from measuring the drawn SVG in the browser: on this
// style's canvas of 480 the eyes sit at (360, 280) and the mouth at (367, 384), neither of them
// centred, because the head leans to one side. The generator scales around the centre of the
// canvas and then translates by hundredths of it, so what brings a point to the middle is
// `translate = -scale * (centre of the part - 240) / 4.8`.
const PART_VIEW: Record<string, ArtView> = {
  eyes: { scale: 180, translateX: -33, translateY: 7 },
  mouth: { scale: 180, translateX: -36, translateY: -32 },
}

/** Una opción de una parte. Es un radio y no un botón apretado: se elige una entre muchas. */
function Swatch({ label, isOn, onPick, children }: {
  label: string; isOn: boolean; onPick: () => void; children: React.ReactNode
}) {
  return (
    <button type="button" role="radio" aria-checked={isOn} aria-label={label} onClick={onPick}
      className={cn('grid aspect-square w-full place-items-center overflow-hidden rounded-xl border-2 p-1 transition-colors',
        focusRing, isOn ? 'border-ink bg-accent-subtle' : 'border-line hover:border-ink')}>
      {children}
    </button>
  )
}

/** Las opciones de una parte, cada una dibujada con la cara de la persona y no con un ejemplo. */
function PartGrid({ style, seed, options, part, onPick }: {
  style: ArtStyle; seed: string; options: Record<string, string>; part: string; onPick: (v: string) => void
}) {
  const values = artValues(style, part)
  const color = isColorPart(part)
  const name = ART_PART_LABELS[part] ?? part
  if (values.length === 0) return null
  return (
    // Celdas de 3.5rem que se reparten el ancho: ocho columnas en el panel abierto, cuatro en un
    // teléfono, sin escribir un solo breakpoint.
    <div role="radiogroup" aria-label={name} className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
      {values.map((v, i) => (
        // La etiqueta se numera en vez de decir el valor: los valores de la librería son claves
        // internas en inglés (cheery, openedSmile, ac6511) y el producto habla español.
        <Swatch key={v} label={`${name}, opción ${i + 1} de ${values.length}`} isOn={options[part] === v} onPick={() => onPick(v)}>
          {color
            ? <span className="size-9 rounded-lg" style={{ background: `#${v}` }} />
            : <span className="size-full [&>svg]:size-full" aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: avatarArt(style, seed, { ...options, [part]: v }, PART_VIEW[part]) }} />}
        </Swatch>
      ))}
    </div>
  )
}

export function AvatarBuilder({ isOpen, value, name, onCancel, onUse }: {
  isOpen: boolean
  /** Lo confirmado. El borrador arranca de acá cada vez que el panel se abre. */
  value: Figure
  /** De quién es la cara: nombra el avatar, y es la semilla mientras no haya una elegida. */
  name: string
  onCancel: () => void
  onUse: (figure: Figure) => void
}) {
  const [draft, setDraft] = useState(value)
  const [part, setPart] = useState(() => ART_PARTS[value.style][0])
  const [wasOpen, setWasOpen] = useState(isOpen)

  // Abrir siempre arranca de lo confirmado: lo que se probó y se canceló no vuelve. Se ajusta
  // durante el render y no en un efecto, así el primer cuadro nunca es el borrador viejo.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) { setDraft(value); setPart(ART_PARTS[value.style][0]) }
  }

  const seed = draft.seed || name
  const parts = ART_PARTS[draft.style]

  return (
    <Modal isOpen={isOpen} onClose={onCancel} boxWidth={880}
      title="Armá tu figura"
      description="Elegí una parte y probá las opciones. Se ve enseguida, pero se guarda cuando toques Guardar en tu perfil."
      footer={<>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onUse(draft)}>Usar esta figura</Button>
      </>}>
      <div className="grid gap-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-start">
        {/* La cara queda quieta mientras las opciones scrollean: en el teléfono es una barra
            arriba, en pantalla ancha es la columna de la izquierda. El `sticky` funciona porque
            el que scrollea es el cuerpo del diálogo, y el `self-start` es lo que le da a qué
            pegarse: sin eso la celda se estira al alto de la fila y no hay recorrido. */}
        <div className="sticky top-0 z-10 -mx-5 -mt-4 flex items-center gap-4 border-b border-line bg-surface px-5 py-3
                        sm:mx-0 sm:mt-0 sm:flex-col sm:items-start sm:gap-3 sm:self-start sm:border-0 sm:p-0">
          <Avatar name={name} artStyle={draft.style} artSeed={seed} artOptions={draft.options}
            size="xl" className="size-20 shrink-0 sm:size-44" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" startIcon={<Icon icon={Dices} size="sm" />}
              onClick={() => setDraft((d) => ({ ...d, seed: newId(), options: {} }))}>Sorpresa</Button>
            {Object.keys(draft.options).length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, options: {} }))}>
                Volver a la de fábrica
              </Button>
            )}
          </div>
        </div>

        <Tabs value={part} onValueChange={setPart} variant="pill" className="flex flex-col gap-3">
          <TabsList aria-label="Partes de la figura">
            {parts.map((p) => <TabsTrigger key={p} value={p}>{ART_PART_LABELS[p] ?? p}</TabsTrigger>)}
          </TabsList>
          {parts.map((p) => (
            <TabsContent key={p} value={p}>
              <PartGrid style={draft.style} seed={seed} options={draft.options} part={p}
                onPick={(v) => setDraft((d) => ({ ...d, options: { ...d.options, [p]: v } }))} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Text size="sm" variant="muted" className="mt-4">Sorpresa reparte todo de nuevo. Lo que elijas a mano queda.</Text>
    </Modal>
  )
}
