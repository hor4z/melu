/**
 * El taller: la página donde se prueba a mano lo que los tests prueban solos.
 *
 * No es una demo de vitrina, y tampoco es el editor a pantalla pelada: un editor de bloques se
 * juzga por cómo se siente, y para eso hay que verlo en algo que se parezca a donde va a vivir. Así
 * que hay un documento de verdad, el árbol a la izquierda para ver la estructura mientras se
 * escribe, y las props a la derecha, que son la única parte del motor sin entrada manual.
 *
 * Los paneles viven **afuera** del editor y reciben el motor por prop. Meterlos como `children`
 * los pondría adentro de la región editable, que es lo último que uno quiere.
 */

import { StrictMode, useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { BlockEditor, authorMarkdown, fromMarkdown, type BlockId, type Editor } from '../src/index.ts'
import '../src/ui/editor.css'
import './taller.css'
import { ACTIVIDAD, DEL_AGENTE } from './document.ts'
import { montarConsola } from './console.ts'
import { Outline } from './Outline.tsx'
import { Inspector } from './Inspector.tsx'
import { TopBar } from './TopBar.tsx'
import { AddMenu } from './AddMenu.tsx'

/** Sube en cada transacción. Es lo que hace que los paneles sigan al documento con un solo hilo. */
function useVersion(editor: Editor | null): number {
  const suscribir = useCallback((fn: () => void) => (editor ? editor.subscribe(fn) : () => {}), [editor])
  const leer = useCallback(() => editor?.version ?? 0, [editor])
  return useSyncExternalStore(suscribir, leer, leer)
}

function Taller() {
  const editorRef = useRef<Editor | null>(null)
  const [listo, setListo] = useState(0)
  const [readOnly, setReadOnly] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [columna, setColumna] = useState(720)
  const [caja, setCaja] = useState(false)
  const [contenido, setContenido] = useState(() => ACTIVIDAD)

  const editor = editorRef.current
  const version = useVersion(editor)

  const reiniciar = useCallback(() => {
    setContenido(ACTIVIDAD)
    setNonce((n) => n + 1)
  }, [])

  /** Cambia el documento entero sin recargar. La usa la capa de tests del navegador. */
  const cargar = useCallback((markdown: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.run('replaceContent', { blocks: fromMarkdown(markdown) })
    editor.history.clear()
  }, [])

  const agente = useCallback((markdown = DEL_AGENTE) => {
    const editor = editorRef.current
    if (editor) authorMarkdown(editor, markdown)
  }, [])

  const onReady = useCallback(
    (nuevo: Editor) => {
      // `onReady` se llama en cada render, así que acá adentro no puede haber un `setState` sin
      // guarda: sería un ciclo. Un solo despertar alcanza para que los paneles se enteren de que
      // ya hay motor.
      if (editorRef.current === nuevo) return
      editorRef.current = nuevo
      montarConsola(nuevo, {
        soloLectura: (v?: boolean) => setReadOnly((antes) => v ?? !antes),
        agente,
        reiniciar,
        cargar,
      })
      setListo((n) => n + 1)
    },
    [agente, reiniciar, cargar],
  )

  const irA = useCallback((id: BlockId) => {
    const editor = editorRef.current
    if (!editor) return
    const bloque = editor.block(id)
    if (!bloque) return
    // Un bloque sin texto no tiene dónde poner el caret: se elige entero, que es lo que el motor
    // ya distingue con `isTextual`.
    if (editor.state.schema.isTextual(bloque.type)) editor.run('focusBlock', { id, at: 'end' })
    else editor.run('selectBlock', { id })
    document.querySelector(`[data-melu-block="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  // El editor lee `value` una sola vez, al montar: para cambiar de documento se cambia la `key`.
  void listo

  return (
    <div className="taller">
      <main className="taller-lienzo">
        <div className="taller-hoja" style={{ ['--melu-column' as string]: `${columna}px` }}>
          <BlockEditor
            key={nonce}
            value={contenido}
            readOnly={readOnly}
            aria-label="El contenido de la actividad"
            toolbox={caja ? { initial: { top: 76, right: 336 } } : false}
            onReady={onReady}
          />
        </div>
      </main>

      <Outline editor={editor} version={version} onIr={irA} />

      <TopBar
        editor={editor}
        version={version}
        columna={columna}
        onColumna={setColumna}
        readOnly={readOnly}
        onReadOnly={setReadOnly}
        onAgente={() => agente()}
        onReiniciar={reiniciar}
        caja={caja}
        onCaja={setCaja}
      />

      <AddMenu editor={editor} />

      <Inspector editor={editor} version={version} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Taller />
  </StrictMode>,
)
