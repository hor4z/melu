// El menú que aparece al pegar una dirección. Pegar un link no puede adivinar, así que el pegado
// hace lo menos destructivo (el texto con su link) y acá se ofrece el resto. Lo que se ofrece sale
// del reconocedor. Seguir escribiendo también es una respuesta: el menú se va y el link queda.

import { useCallback, useEffect, useState } from 'react'
import { PASTED_URL, type PastedUrl } from '../plugins/paste.ts'
import { bookmarkProps } from '../plugins/media.ts'
import { concat, len as textLen, slice as sliceText } from '../core/text.ts'
import { getBlock } from '../core/doc.ts'
import { insertBlock } from '../core/commands.ts'
import { useEditor } from '../react/hooks.ts'
import { caretRect } from '../react/dom.ts'
import { Icon, hasIcon, type IconName } from '../react/icons.tsx'
import { Popover } from './Popover.tsx'
import { pointAnchor, type Anchor } from './float.ts'

/** Lo que se puede hacer con una dirección recién pegada. */
type Choice = { key: string; label: string; hint?: string; icon: IconName; type?: string; props?: Record<string, unknown> }

export function PasteMenu() {
  const editor = useEditor()
  const [pasted, setPasted] = useState<PastedUrl | null>(null)
  const [anchor, setAnchor] = useState<Anchor | null>(null)

  const close = useCallback(() => {
    setPasted(null)
    setAnchor(null)
  }, [])

  // El pegado avisa por el meta de la transacción, que es el canal que ya existe para "qué pasó".
  useEffect(
    () =>
      editor.subscribe((change) => {
        const found = change.tr?.meta[PASTED_URL] as PastedUrl | undefined
        if (found) {
          setPasted(found)
          return
        }
        // Cualquier otro cambio del documento cierra el menú: seguir escribiendo es decidir que el
        // link estaba bien así.
        if (change.docChanged) setPasted(null)
      }),
    [editor],
  )

  // El ancla se mide después de que el texto pegado esté dibujado, o mediría dónde estaba antes.
  useEffect(() => {
    if (!pasted) {
      setAnchor(null)
      return
    }
    const frame = requestAnimationFrame(() => {
      const rect = caretRect()
      setAnchor(rect ? pointAnchor(rect.left, rect.top, rect.height || 20) : null)
    })
    return () => cancelAnimationFrame(frame)
  }, [pasted])

  const choices = pasted ? choicesFor(pasted) : []

  const apply = useCallback(
    (choice: Choice) => {
      const at = pasted
      close()
      if (!at || !choice.type) return
      editor.exec((ctx) => {
        const block = getBlock(ctx.tr.doc, at.block)
        if (!block) return false
        // Se saca la dirección que se había pegado: lo que queda es el bloque, no el texto.
        const text = block.text ?? []
        const total = textLen(text)
        ctx.tr.setText(at.block, concat(sliceText(text, 0, at.from), sliceText(text, at.to, total)))
        ctx.tr.select({ kind: 'text', anchor: { block: at.block, offset: at.from }, head: { block: at.block, offset: at.from } })
        // Sobre un bloque que quedó vacío, `insertBlock` lo reemplaza en el lugar; si todavía
        // tiene texto, el bloque nuevo va abajo y la oración se queda como estaba.
        return insertBlock(ctx, { type: choice.type!, props: choice.props, target: at.block, at: 'after' })
      })
    },
    [editor, pasted, close],
  )

  if (!pasted || !anchor || choices.length === 0) return null

  return (
    <Popover anchor={anchor} open onClose={close} role="menu" aria-label="Qué hacer con el link" keepFocus>
      <div className="melu-menu">
        <div className="melu-menu-title">Lo pegaste como link</div>
        {choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            className="melu-menu-item"
            // Un `role="menu"` cuyos hijos no son `menuitem` está mal armado: un lector de
            // pantalla anuncia un menú y después no encuentra opciones adentro.
            role="menuitem"
            onClick={() => (choice.type ? apply(choice) : close())}
          >
            <span className="melu-menu-icon">
              <Icon name={hasIcon(choice.icon) ? choice.icon : 'link'} size={16} />
            </span>
            <span className="melu-menu-text">
              <span className="melu-menu-name">{choice.label}</span>
              {choice.hint ? <span className="melu-menu-hint">{choice.hint}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </Popover>
  )
}

const NAMES: Record<string, { label: string; hint: string; icon: IconName }> = {
  video: { label: 'Ponerlo como video', hint: 'Se ve y se reproduce acá', icon: 'video' },
  image: { label: 'Ponerlo como imagen', hint: 'Se ve acá, y se puede redimensionar', icon: 'image' },
  audio: { label: 'Ponerlo como audio', hint: 'Con su reproductor', icon: 'audio' },
  embed: { label: 'Incrustarlo', hint: 'La página entera, acá adentro', icon: 'embed' },
}

/** Las opciones que aplican a esta dirección, la mejor primero. */
function choicesFor(pasted: PastedUrl): Choice[] {
  const out: Choice[] = []
  if (pasted.becomes) {
    const name = NAMES[pasted.becomes.type]
    if (name) {
      out.push({
        key: pasted.becomes.type,
        label: name.label,
        hint: name.hint,
        icon: name.icon,
        type: pasted.becomes.type,
        props: pasted.becomes.props,
      })
    }
  }
  // La etiqueta dice lo que la tarjeta va a mostrar y no lo que uno quisiera que mostrara: sin
  // miniatura que deducir, prometerla es prometer algo que no llega hasta que la plataforma
  // busque los datos del sitio.
  const props = bookmarkProps(pasted.url)
  const conMiniatura = typeof props.image === 'string'
  out.push({
    key: 'bookmark',
    label: conMiniatura ? 'Tarjeta con miniatura' : 'Tarjeta con el link',
    hint: conMiniatura ? 'La imagen y el sitio' : 'El sitio, y el título cuando se pueda buscar',
    icon: 'link',
    type: 'bookmark',
    props,
  })
  out.push({ key: 'keep', label: 'Dejarlo como link', icon: 'text' })
  return out
}

