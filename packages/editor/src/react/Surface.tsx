// El componente que la plataforma monta, y donde los eventos del navegador se encuentran con el
// motor. Tiene lo que no puede vivir en un bloque: la página, el portapapeles, las selecciones de
// bloques enteros, y lo que flota.

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { BlockId } from '../core/doc.ts'
import { flatten, textLength } from '../core/doc.ts'
import type { Editor } from '../core/editor.ts'
import { isBlocks, isCollapsed, isText, samePoint, spansBlocks } from '../core/selection.ts'
import { plain } from '../core/text.ts'
import { clipboardFor, MELU_MIME } from '../plugins/paste.ts'
import { composing } from './composing.ts'
import { syncBlock } from './BlockText.tsx'
import { EditorProvider, useBlock, useChildren, useEditor, useIsSelected } from './hooks.ts'
import { defaultRenderers, Unknown, wrapperStyle, type Renderers } from './renderers.tsx'
import {
  BLOCK_ATTR,
  SKIP,
  blockIdOf,
  offsetAtPoint,
  offsetOfCaret,
  nearestTextRoot,
  placeRange,
  pointAt,
  readSelection,
  textRoot,
  textRootOf,
} from './dom.ts'
import { isRealMove, measure, targetAt, type DropTarget } from './dnd.ts'

export type SurfaceProps = {
  editor: Editor
  /** Extra or replacement renderers, merged over the defaults. */
  renderers?: Renderers
  readOnly?: boolean
  /** What floats over the page: menus, bars, handles. Rendered inside the surface. */
  children?: ReactNode
  className?: string
  /** Called when a block is clicked with the handle, so a host can open its own menu. */
  onOpenBlockMenu?: (id: BlockId, at: { x: number; y: number }) => void
  'aria-label'?: string
}

/** The one block component. Memoised and subscribed to its own block, and to nothing else. */
const BlockView = memo(function BlockView({
  id,
  renderers,
  readOnly,
}: {
  id: BlockId
  renderers: Renderers
  readOnly: boolean
}) {
  const editor = useEditor()
  const block = useBlock(id)
  const { active, picked } = useIsSelected(id)
  if (!block) return null

  const spec = editor.state.schema.spec(block.type)
  const Render = renderers[block.type] ?? Unknown
  const children = block.children.length ? <Children ids={block.children} renderers={renderers} readOnly={readOnly} /> : null

  return (
    <div
      className="melu-block"
      data-type={block.type}
      data-active={active || undefined}
      data-picked={picked || undefined}
      data-standalone={spec?.standalone || undefined}
      style={wrapperStyle(block)}
      {...{ [BLOCK_ATTR]: id }}
    >
      <Render id={id} block={block} readOnly={readOnly}>
        {children}
      </Render>
    </div>
  )
})

const Children = memo(function Children({
  ids,
  renderers,
  readOnly,
}: {
  ids: readonly BlockId[]
  renderers: Renderers
  readOnly: boolean
}) {
  return (
    <div className="melu-children">
      {ids.map((id) => (
        <BlockView key={id} id={id} renderers={renderers} readOnly={readOnly} />
      ))}
    </div>
  )
})

/** The top level, which re-renders only when the root's list of children changes. */
const Page = memo(function Page({ renderers, readOnly }: { renderers: Renderers; readOnly: boolean }) {
  const editor = useEditor()
  const ids = useChildren(editor.doc.root)
  return (
    <>
      {ids.map((id) => (
        <BlockView key={id} id={id} renderers={renderers} readOnly={readOnly} />
      ))}
    </>
  )
})

/**
 * Si el evento vino de un control propio de un bloque y no del texto del editor. Sin esto, pegar
 * una dirección en la caja de un video lo agarraba el editor, cancelaba el evento e insertaba un
 * bloque en otro lado. Vale igual para copiar, cortar y deshacer.
 */
const fromWidget = (target: EventTarget | null): boolean => {
  const el = target instanceof Element ? target : null
  return Boolean(el?.closest('input, textarea, select, button, [data-melu-skip]'))
}

export function Surface({
  editor,
  renderers,
  readOnly = false,
  children,
  className,
  onOpenBlockMenu,
  ...rest
}: SurfaceProps) {
  const ref = useRef<HTMLDivElement>(null)
  const merged = useMemo(() => ({ ...defaultRenderers, ...renderers }), [renderers])
  const [drop, setDrop] = useState<DropTarget | null>(null)
  const dragging = useRef<{ id: BlockId; placed: ReturnType<typeof measure>; origin: DOMRect } | null>(null)
  /** El último destino calculado, para el `pointerup` que se registró una sola vez. */
  const latestDrop = useRef<DropTarget | null>(null)
  /**
   * Dónde estaba el caret del navegador cuando se pasó a elegir bloques enteros.
   *
   * Una selección de bloques no se escribe en el DOM: la del navegador se queda quieta y deja de
   * pintarse. Entonces un aviso que diga *ese mismo* caret no lo pidió nadie, y escucharlo
   * desharía lo que uno acaba de elegir. Uno que diga otra cosa sí: alguien lo movió, y quiere
   * volver al texto.
   */
  const caretCongelado = useRef<string | null>(null)

  useEffect(() => {
    editor.readOnly = readOnly
  }, [editor, readOnly])

  // -------------------------------------------------------------------------- selection

  /**
   * La selección del navegador entra al modelo tal cual, con cada punta donde esté, aunque estén
   * en bloques distintos. Puede porque la región editable es la superficie entera.
   */
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const onChange = () => {
      const range = readSelection(container)
      if (!range) return
      if (isBlocks(editor.selection) && JSON.stringify(range) === caretCongelado.current) return
      const current = editor.selection
      // Si el modelo ya dice esto, no vale volver a decirlo: sería un ciclo con el DOM.
      if (isText(current) && samePoint(current.anchor, range.anchor) && samePoint(current.head, range.head)) return
      editor.setSelection({ kind: 'text', anchor: range.anchor, head: range.head })
    }
    document.addEventListener('selectionchange', onChange)
    return () => document.removeEventListener('selectionchange', onChange)
  }, [editor])

  /**
   * Y al revés: lo que el modelo elige hay que ponerlo en el DOM.
   *
   * Dos casos, y los dos son de la superficie porque ningún bloque puede solo. Un rango que cruza,
   * porque cada punta está en otro bloque. Y una selección de bloques enteros, que en el DOM es la
   * ausencia de selección: si se le deja el caret viejo puesto, el navegador avisa de ese caret
   * apenas la página se repinta y el modelo vuelve a decir "texto", con lo cual elegir un bloque
   * dura lo que tarda un render. Es lo que hacía que insertar un video no lo dejara elegido, que
   * Escape no hiciera nada y que Backspace borrara una letra en otro lado.
   *
   * Va por suscripción y no por render: la página no se vuelve a dibujar porque se movió el caret.
   */
  useEffect(() => {
    const container = ref.current
    if (!container) return
    return editor.subscribe((change) => {
      if (!change.selectionChanged) return
      const sel = editor.selection
      // Una selección de bloques no se escribe en el DOM, y tampoco se le saca al navegador lo que
      // tenga: se deja donde está y se pinta distinto. Es lo que hace Notion, y tiene una razón que
      // costó encontrar. Sacarle el rango obliga a devolverle el foco, devolverle el foco hace que
      // el navegador ponga un caret por su cuenta, y ese caret llega tarde y deshace la selección
      // que uno acaba de hacer. Dejándolo quieto no se dispara ni un aviso.
      if (isBlocks(sel)) {
        container.toggleAttribute('data-picking', true)
        let quieto = readSelection(container)
        // Salvo que el navegador no tenga nada adentro. Ahí sí hay que darle algo, y en el ancla:
        // sin selección propia, el navegador se inventa un caret al principio de la página en
        // cuanto alguien le devuelve el foco (un menú del host que enfoca la superficie después de
        // insertar), y ese caret llegaba y deshacía lo que se acababa de elegir. No se ve: con
        // bloques elegidos el caret es transparente.
        if (!quieto) {
          const ancla = sel.anchor || sel.ids[0]
          // La región más cercana y no la del ancla: un video no tiene región propia, y ahí no hay
          // dónde poner nada. Da igual cuál sea: con bloques elegidos las teclas las atiende el
          // modelo, así que ese caret no decide nada. Sólo ocupa el lugar.
          const cerca = ancla ? nearestTextRoot(container, ancla) : null
          const dueño = cerca ? blockIdOf(cerca) : null
          if (dueño) {
            placeRange(container, { block: dueño, offset: 0 }, { block: dueño, offset: 0 })
            quieto = readSelection(container)
          }
        }
        caretCongelado.current = quieto ? JSON.stringify(quieto) : null
        return
      }
      container.toggleAttribute('data-picking', false)
      caretCongelado.current = null
      if (!isText(sel) || !spansBlocks(sel)) return
      // Si el navegador ya lo tiene así (porque lo hizo él), no se lo toca: reescribirlo hace
      // parpadear la selección y vuelve a avisar.
      const now = readSelection(container)
      if (now && samePoint(now.anchor, sel.anchor) && samePoint(now.head, sel.head)) return
      placeRange(container, sel.anchor, sel.head)
    })
  }, [editor])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = ref.current
      /**
       * Shift+click con bloques elegidos estira la elección hasta el bloque clickeado.
       *
       * Sobre texto no hace falta y no se toca: el navegador estira solo, incluso de un bloque a
       * otro, y lo hace mejor que cualquier cuenta nuestra sobre coordenadas. Con bloques enteros
       * elegidos no hay selección nativa que estirar, y sin esto el Shift+click caía como un click
       * cualquiera: la elección se perdía y había que empezar de nuevo.
       */
      if (e.shiftKey && !e.altKey && e.button === 0 && container && isBlocks(editor.selection)) {
        const hasta = pointAt(container, e.clientX, e.clientY)
        if (hasta) {
          e.preventDefault()
          editor.run('selectBlockRange', { id: hasta.block })
          return
        }
      }
      // Un click en el hueco de abajo de la página deja el caret en el último bloque, que es lo
      // que espera cualquiera que quiera seguir escribiendo.
      if (!blockIdOf(e.target as Node) && e.target === ref.current) editor.run('focusEnd')
    },
    [editor],
  )

  // -------------------------------------------------------------------------- input

  /**
   * El precio del envoltorio editable, y la única cosa que hay que hacer bien acá.
   *
   * Con la región editable envolviendo la página el navegador puede editar cruzando bloques, y eso
   * no puede pasar: movería nodos de un bloque a otro por atrás de React y del modelo. Lo que queda
   * adentro de un solo bloque sigue siendo suyo, que es de donde salen los acentos con tecla
   * muerta, el dictado y el teclado del celular. Lo que cruce un borde se cancela y lo hace el
   * motor, que ya sabe: `deleteSelection`, `insertText` y `splitBlock` empiezan por borrar el rango
   * aunque abarque diez bloques.
   */
  const onBeforeInput = useCallback(
    (e: InputEvent) => {
      if (fromWidget(e.target)) return
      if (readOnly) {
        e.preventDefault()
        return
      }
      const type = e.inputType
      // Pegar y arrastrar son del editor y no del navegador: los dos meten contenido ajeno
      // adentro de un bloque moviendo nodos por atrás de React y del modelo. El pegado lo atiende
      // `onPaste`, que cancela lo que entiende; si llegó hasta acá es que no lo entendió, y
      // entonces no pasa nada, que es muchísimo mejor que que entre crudo.
      if (type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'deleteByDrag') {
        e.preventDefault()
        return
      }
      // Deshacer desde el menú del navegador llega por acá y no por `keydown`. Sin atenderlo, el
      // navegador deshacía el DOM por atrás de React y del modelo, que es la forma más rápida de
      // dejar la pantalla diciendo una cosa y el documento otra.
      if (type === 'historyUndo' || type === 'historyRedo') {
        e.preventDefault()
        if (type === 'historyUndo') editor.undo()
        else editor.redo()
        return
      }
      const sel = editor.selection
      if (isText(sel) && !spansBlocks(sel)) {
        // Borrar parado en el borde de un bloque junta dos bloques, y eso lo hace el keymap desde
        // `keydown`. Si llegó hasta acá es que el motor dijo que no había nada que hacer: entonces
        // tampoco lo hace el navegador, que ahora podría porque la región editable es una sola.
        if (type.startsWith('delete') && isCollapsed(sel)) {
          const back = type.toLowerCase().includes('backward')
          const borde = back ? sel.head.offset === 0 : sel.head.offset === textLength(editor.doc, sel.head.block)
          if (borde) e.preventDefault()
        }
        return
      }
      e.preventDefault()
      if (type.startsWith('delete')) {
        editor.run('deleteSelection')
        return
      }
      if (type === 'insertParagraph') {
        editor.run('splitBlock')
        return
      }
      if (type === 'insertLineBreak') {
        editor.run('insertSoftBreak')
        return
      }
      if (e.data) editor.run('insertText', { text: e.data })
    },
    [editor, readOnly],
  )

  // A mano y no por JSX: el `onBeforeInput` de React es un evento sintético suyo, armado de
  // `keypress` y de composición, y no el `beforeinput` del navegador. El que trae `inputType` y el
  // que hay que cancelar es este.
  useEffect(() => {
    const container = ref.current
    if (!container) return
    container.addEventListener('beforeinput', onBeforeInput)
    return () => container.removeEventListener('beforeinput', onBeforeInput)
  }, [onBeforeInput])

  /**
   * Lo que el navegador escribió, de vuelta al modelo. El `input` llega a la región editable, que
   * ahora es esta: se averigua en qué bloque cayó el caret y se lee ese bloque de vuelta.
   */
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const sincronizar = () => {
      const root = textRoot(document.getSelection()?.focusNode ?? null)
      const id = root && blockIdOf(root)
      if (!root || !id) return
      syncBlock(editor, root, id)
    }
    const onInput = (e: Event) => {
      // Lo que se escribe en un control propio de un bloque (la dirección de un medio, una opción,
      // la búsqueda de la caja) no es el texto de ningún bloque: leerlo de vuelta sincronizaría
      // contra el caret del modelo, que está en otro lado.
      if (composing.current || fromWidget(e.target)) return
      sincronizar()
      // Las reglas de tipeo miran el texto ya escrito: "# " se vuelve título recién cuando el
      // espacio está puesto.
      editor.applyInputRules()
    }
    const onCompositionStart = (e: Event) => {
      if (fromWidget(e.target)) return
      composing.current = true
    }
    const onCompositionEnd = (e: Event) => {
      if (fromWidget(e.target)) return
      composing.current = false
      sincronizar()
      editor.applyInputRules()
    }
    const onBlur = () => {
      // Lo que se escriba después de volver es otro cambio, no la continuación del anterior.
      editor.history.break()
      sincronizar()
    }
    container.addEventListener('input', onInput)
    container.addEventListener('compositionstart', onCompositionStart)
    container.addEventListener('compositionend', onCompositionEnd)
    container.addEventListener('blur', onBlur)
    return () => {
      container.removeEventListener('input', onInput)
      container.removeEventListener('compositionstart', onCompositionStart)
      container.removeEventListener('compositionend', onCompositionEnd)
      container.removeEventListener('blur', onBlur)
      composing.current = false
    }
  }, [editor])

  // -------------------------------------------------------------------------- clipboard

  const writeClipboard = useCallback(
    (e: React.ClipboardEvent) => {
      const sel = editor.selection
      if (!isBlocks(sel)) return false
      const data = clipboardFor(editor.doc, sel.ids)
      for (const [type, value] of Object.entries(data)) e.clipboardData.setData(type, value)
      return true
    },
    [editor],
  )

  const onCopy = useCallback(
    (e: React.ClipboardEvent) => {
      if (fromWidget(e.target)) return
      if (writeClipboard(e)) e.preventDefault()
    },
    [writeClipboard],
  )

  const onCut = useCallback(
    (e: React.ClipboardEvent) => {
      if (readOnly || fromWidget(e.target)) return
      if (!writeClipboard(e)) return
      e.preventDefault()
      editor.run('deleteSelection')
    },
    [editor, readOnly, writeClipboard],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (readOnly || fromWidget(e.target)) return
      const data: Record<string, string> = {}
      for (const type of [MELU_MIME, 'text/html', 'text/uri-list', 'text/plain']) {
        const value = e.clipboardData.getData(type)
        if (value) data[type] = value
      }
      if (Object.keys(data).length === 0) return
      if (editor.handlePaste(data)) e.preventDefault()
    },
    [editor, readOnly],
  )

  // -------------------------------------------------------------------------- keys outside a block

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.defaultPrevented || fromWidget(e.target) || composing.current) return

      /**
       * Antes de mirar nada, preguntarle al navegador dónde está el caret.
       *
       * El navegador mueve el caret al despachar la tecla, y avisa después, en otra vuelta del
       * bucle. Así que una tecla apretada enseguida de otra (una flecha y un Enter, autorepetición,
       * alguien que escribe rápido) llegaba acá con el modelo todavía diciendo dónde estaba el
       * caret antes, y el comando partía el bloque en el lugar equivocado. Se sincroniza acá y no
       * en un efecto porque acá es donde importa: en el instante en que una tecla va a decidir algo.
       */
      const container = ref.current
      const antes = editor.selection
      if (container && isText(antes) && isCollapsed(antes)) {
        const ahora = readSelection(container)
        // Sólo de un caret a otro caret. Un rango del modelo lo puso un comando, y el DOM todavía
        // puede no haberlo dibujado: pisarlo con lo que el navegador tiene sería deshacer lo que
        // el motor acaba de decidir. Para mover el caret manda el navegador; para un rango puesto
        // a propósito, el modelo.
        const soloElCaret = ahora && samePoint(ahora.anchor, ahora.head)
        if (soloElCaret && !samePoint(antes.head, ahora.head)) {
          editor.setSelection({ kind: 'text', anchor: ahora.anchor, head: ahora.head })
        }
      }

      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) editor.redo()
        else editor.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        editor.redo()
        return
      }
      const sel = editor.selection
      // Con bloques elegidos no hay caret en ningún texto.
      if (isBlocks(sel)) {
        if (e.key === 'Escape') {
          const id = sel.ids[0]
          if (id) editor.run('focusBlock', { id, at: 'end' })
          e.preventDefault()
          return
        }
        // Con un modificador la flecha es un comando (subir el bloque) y no un movimiento por la
        // página: se la queda el keymap, más abajo.
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !mod && !e.altKey) {
          const order = flatten(editor.doc)
          // La selección crece desde la punta lejos del ancla, no desde el ancla: si no, la
          // tercera vez que se aprieta sigue midiendo dos bloques.
          const head = sel.ids[0] === sel.anchor ? sel.ids[sel.ids.length - 1]! : sel.ids[0]!
          const at = order.indexOf(head)
          const next = order[at + (e.key === 'ArrowDown' ? 1 : -1)]
          if (next) {
            editor.run(e.shiftKey ? 'selectBlockRange' : 'selectBlock', { id: next })
            e.preventDefault()
          }
          return
        }
        if (editor.handleKey(e)) e.preventDefault()
        return
      }

      // Con un caret o un rango de texto. Todo esto vivía en cada bloque, cuando el foco vivía
      // adentro suyo: con la región editable envolviendo la página el foco es de la superficie y
      // las teclas llegan todas acá.
      if (!container) return
      // Sin selección no hay caret que mover, pero sí atajos que corren igual: `Mod+A`, insertar
      // un bloque, deshacer. Antes se volvía acá y morían todos.
      if (!isText(sel)) {
        if (editor.handleKey(e)) e.preventDefault()
        return
      }
      const id = sel.head.block
      const root = textRootOf(container, id)

      // Borrar dentro del texto lo hace el navegador: sabe de emojis, de acentos y de lo que
      // eligió el mouse mejor que cualquier cosa que escribamos acá. Parado en el borde no, porque
      // ahí junta dos bloques, y eso es del motor.
      if ((e.key === 'Backspace' || e.key === 'Delete') && !mod && !e.altKey) {
        const at = root ? offsetOfCaret(root) : null
        const collapsed = document.getSelection()?.isCollapsed ?? true
        const total = plain(editor.block(id)?.text).length
        const boundary = e.key === 'Backspace' ? at === 0 : at === total
        if (!collapsed || !boundary) return
        if (editor.handleKey(e)) e.preventDefault()
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Con un modificador la flecha ya no mueve el caret: es un comando, y el keymap sabe cuál.
        if (mod || e.altKey) {
          if (editor.handleKey(e)) e.preventDefault()
          return
        }
        // Con shift la extiende el navegador, y puede salir del bloque: la región editable es la
        // superficie entera. Lo que quede elegido lo cuenta `selectionchange`.
        if (e.shiftKey) return
        if (crossBlockArrow(editor, container, id, root, e.key === 'ArrowUp')) e.preventDefault()
        return
      }

      // Con un rango abierto las flechas horizontales lo colapsan, y eso lo hace el navegador. Sin
      // esta guarda, una flecha izquierda sobre un rango que empieza en el borde saltaba al bloque
      // anterior en lugar de dejar el caret donde empezaba lo elegido.
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey && isCollapsed(sel)) {
        const at = root ? offsetOfCaret(root) : null
        const salida = e.key === 'ArrowLeft' ? at === 0 : at === plain(editor.block(id)?.text).length
        if (salida && editor.run(e.key === 'ArrowLeft' ? 'caretBackward' : 'caretForward')) {
          e.preventDefault()
          return
        }
      }

      if (editor.handleKey(e)) e.preventDefault()
    },
    [editor],
  )

  // -------------------------------------------------------------------------- dragging

  const startDrag = useCallback(
    (id: BlockId, e: React.PointerEvent) => {
      const container = ref.current
      if (!container || readOnly) return
      e.preventDefault()
      // Los rects se miden una vez y son coordenadas de ventana, así que si la página scrollea en
      // el medio del arrastre quedan todos corridos. En lugar de volver a medir en cada movimiento
      // (un layout entero por pixel de mouse), se guarda dónde estaba la superficie: la diferencia
      // contra dónde está ahora es exactamente cuánto se scrolleó, y eso se le suma al puntero.
      dragging.current = { id, placed: measure(container, editor.doc), origin: container.getBoundingClientRect() }
      // Se limpia al empezar: un arrastre que cruza el umbral y se suelta sin un solo movimiento
      // más usaba el destino del arrastre anterior y mandaba el bloque ahí.
      latestDrop.current = null
      // Si el bloque agarrado ya era parte de lo elegido, se arrastra todo lo elegido. Pisar la
      // selección acá era lo que hacía imposible mover varios bloques de una: elegías cinco,
      // agarrabas el asa de uno, y en ese instante quedaba elegido ese solo.
      const elegidos = editor.selection
      if (!isBlocks(elegidos) || !elegidos.ids.includes(id)) editor.run('selectBlock', { id })
      document.body.classList.add('melu-dragging')

      const move = (ev: PointerEvent) => {
        const state = dragging.current
        if (!state) return
        const ahora = container.getBoundingClientRect()
        const target = targetAt(
          editor.doc,
          state.placed,
          state.id,
          ev.clientX + (state.origin.left - ahora.left),
          ev.clientY + (state.origin.top - ahora.top),
          (parent, child) => editor.state.schema.accepts(parent, child),
        )
        // El ref se escribe donde se calcula y no durante el render: `pointerup` se registra una
        // sola vez y necesita el último destino.
        latestDrop.current = target
        setDrop(target)
      }
      const soltar = (aplicar: boolean) => {
        const state = dragging.current
        const target = latestDrop.current
        dragging.current = null
        latestDrop.current = null
        setDrop(null)
        document.body.classList.remove('melu-dragging')
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', cancelar)
        if (aplicar && state && target && isRealMove(editor.doc, state.id, target)) {
          editor.run('moveBlocks', { ids: gruposDeArrastre(editor, state.id), parent: target.parent, index: target.index })
        }
      }
      const up = () => soltar(true)
      /**
       * El puntero se puede perder sin soltarse: el sistema se queda el gesto, o el navegador
       * arranca un arrastre propio. Sin atender esto quedaba `melu-dragging` pegado en el body, con
       * el cursor de agarre y `user-select: none` en toda la página, hasta recargar.
       */
      const cancelar = () => soltar(false)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancelar)
    },
    [editor, readOnly],
  )

  const contexto = useMemo<DragContextValue>(
    () => ({ startDrag, surface: () => ref.current, ...(onOpenBlockMenu ? { onOpenBlockMenu } : {}) }),
    [startDrag, onOpenBlockMenu],
  )

  const surface = (
    <div
      ref={ref}
      className={['melu-surface', className].filter(Boolean).join(' ')}
      data-melu-surface="true"
      data-read-only={readOnly || undefined}
      // La región editable de verdad es esta, no la de cada bloque: es lo que deja que una
      // selección nativa cruce de un párrafo a otro. Los editables de adentro quedan igual, para
      // enfocar un bloque y para que un widget se declare no editable.
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onPointerDown={onPointerDown}
      // El arrastre nativo del navegador no tiene final feliz acá: soltar lo cancelamos igual
      // (`insertFromDrop`), y mientras tanto se come los eventos de puntero del arrastre propio.
      onDragStart={(e) => e.preventDefault()}
      onCopy={onCopy}
      onCut={onCut}
      onPaste={onPaste}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      role="group"
      {...rest}
    >
      <Page renderers={merged} readOnly={readOnly} />
      {drop ? <DropIndicator target={drop} surface={ref.current} origin={dragging.current?.origin ?? null} /> : null}
      <DragContext.Provider value={contexto}>{children}</DragContext.Provider>
      {!readOnly ? <Tail /> : null}
    </div>
  )

  return <EditorProvider value={editor}>{surface}</EditorProvider>
}

/**
 * Qué se arrastra: lo elegido si el bloque agarrado es parte, y si no ese bloque solo.
 *
 * Se decide al soltar y no al agarrar porque entre una cosa y la otra pueden haber pasado cosas,
 * y lo que importa es qué había elegido cuando se soltó.
 */
function gruposDeArrastre(editor: Editor, id: BlockId): BlockId[] {
  const sel = editor.selection
  return isBlocks(sel) && sel.ids.includes(id) ? [...sel.ids] : [id]
}

/**
 * Si una flecha vertical tiene que salir del bloque, y dónde caer. Solo sale del primer o último
 * renglón, y apunta a la columna donde estaba el caret. Eso es geometría, así que se mide acá.
 */
function crossBlockArrow(editor: Editor, surface: HTMLElement, id: BlockId, root: HTMLElement | null, up: boolean): boolean {
  if (!root) return false
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  const bounds = root.getBoundingClientRect()
  const line = parseFloat(getComputedStyle(root).lineHeight) || 24
  const from = rect.height ? rect : bounds
  const leaving = up ? from.top - bounds.top < line * 0.6 : bounds.bottom - from.bottom < line * 0.6
  if (!leaving) return false

  const target = neighbourTextual(editor, id, up)
  if (!target) return false

  const targetRoot = textRootOf(surface, target)
  if (!targetRoot) return editor.run('focusBlock', { id: target, at: up ? 'end' : 'start' })

  // La columna manda: se busca el offset del destino que cae bajo la misma x, en su último
  // renglón si se sube y en el primero si se baja.
  const box = targetRoot.getBoundingClientRect()
  const y = up ? box.bottom - line / 2 : box.top + line / 2
  const at = offsetAtPoint(targetRoot, from.left || box.left, y)
  return editor.run('focusBlock', { id: target, at: at ?? (up ? 'end' : 'start') })
}

/** El bloque con texto anterior o siguiente en el orden de lectura. */
function neighbourTextual(editor: Editor, id: BlockId, up: boolean): BlockId | null {
  const order = flatten(editor.doc).filter((b) => editor.state.schema.isTextual(editor.block(b)?.type ?? ''))
  const i = order.indexOf(id)
  if (i === -1) return null
  return (up ? order[i - 1] : order[i + 1]) ?? null
}

/** El pedazo clickeable del final: una página siempre tiene dónde seguir escribiendo. */
function Tail() {
  const editor = useEditor()
  return (
    <div
      className="melu-tail"
      {...SKIP}
      onClick={() => {
        const kids = editor.doc.blocks[editor.doc.root]!.children
        const last = kids[kids.length - 1]
        const block = last ? editor.block(last) : undefined
        const textual = block && editor.state.schema.isTextual(block.type)
        if (textual && plain(block.text) === '') editor.run('focusBlock', { id: last!, at: 'end' })
        else editor.run('insertBlock', { type: 'paragraph', at: 'end' })
      }}
    />
  )
}

/**
 * La línea o el marco que dice dónde va a caer lo que se está arrastrando.
 *
 * Se ubica contra dónde estaba la superficie al empezar el arrastre y no contra dónde está ahora:
 * el destino se calculó con los rects de ese momento, así que mezclarlos con los de ahora deja la
 * línea corrida justo lo que se haya scrolleado.
 */
function DropIndicator({
  target,
  surface,
  origin,
}: {
  target: DropTarget
  surface: HTMLElement | null
  origin: DOMRect | null
}) {
  if (!surface) return null
  // Dos marcos de referencia, y hay que no mezclarlos. El marco de un contenedor se mide ahora, así
  // que se resta contra la superficie de ahora. La línea viene de los rects congelados al empezar,
  // así que se resta contra dónde estaba la superficie entonces.
  if (target.hint.kind === 'inside') {
    const el = surface.querySelector<HTMLElement>(`[${BLOCK_ATTR}="${target.hint.id.replace(/["\\]/g, '\\$&')}"]`)
    const rect = el?.getBoundingClientRect()
    if (!rect) return null
    const box = surface.getBoundingClientRect()
    return (
      <div
        className="melu-drop-inside"
        {...SKIP}
        style={{ left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height }}
      />
    )
  }
  const box = origin ?? surface.getBoundingClientRect()
  return (
    <div
      className="melu-drop-line"
      {...SKIP}
      style={{ left: target.hint.x - box.left, top: target.hint.y - box.top, width: target.hint.width }}
    />
  )
}

/** Lo que el asa necesita para arrastrar, sin pasarlo por props por toda la página. */
export type DragContextValue = {
  startDrag: (id: BlockId, e: React.PointerEvent) => void
  /**
   * La superficie de este editor. Por el contexto y no por `querySelector`: con dos editores
   * montados, el asa del segundo medía la página del primero y nunca aparecía.
   */
  surface: () => HTMLElement | null
  onOpenBlockMenu?: (id: BlockId, at: { x: number; y: number }) => void
}

export const DragContext = createContext<DragContextValue>({ startDrag: () => {}, surface: () => null })

export const useDragHandle = () => useContext(DragContext)

export { BlockView, Page }
