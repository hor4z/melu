/**
 * El taller: la página donde se prueba a mano lo que los tests prueban solos.
 *
 * No es una demo de vitrina, y tampoco es el editor a pantalla pelada: un editor de bloques se
 * juzga por cómo se siente, y para eso hay que verlo en algo que se parezca a donde va a vivir. Así
 * que hay un documento de verdad, la hoja al centro con lo que se aprieta seguido, y las props a la
 * derecha, que son la única parte del motor sin entrada manual.
 *
 * La estructura del documento se miraba en un panel a la izquierda, y se fue: a quien escribe una
 * actividad no le dice nada, y para mirarla mientras se prueba está la consola, que es la misma
 * puerta que usan los tests (`taller.outline()`, `taller.sketch()`).
 *
 * Los paneles viven **afuera** del editor y reciben el motor por prop. Meterlos como `children`
 * los pondría adentro de la región editable, que es lo último que uno quiere.
 */

import { StrictMode, useCallback, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { BlockEditor, authorMarkdown, focusSurface, fromMarkdown, type Editor } from '../src/index.ts'
import '../src/ui/editor.css'
import './taller.css'
import { ACTIVIDAD, DEL_AGENTE } from './document.ts'
import { montarConsola } from './console.ts'
import { Inspector } from './Inspector.tsx'
import { TopBar, type Lado } from './TopBar.tsx'
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
  const [lado, setLado] = useState<Lado>('centro')
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

  /**
   * Devuelve el teclado al editor.
   *
   * Después de apretar un botón de la barra el foco se queda en el botón, y desde ahí Mod+Z y
   * cualquier atajo no llegan a ninguna parte. Quien acaba de tocar el documento espera poder
   * deshacerlo sin volver a clickear adentro.
   */
  const volverAlEditor = useCallback(() => {
    const superficie = document.querySelector<HTMLElement>('[data-melu-surface]')
    if (superficie) focusSurface(superficie)
  }, [])

  const agente = useCallback(
    (markdown = DEL_AGENTE) => {
      const editor = editorRef.current
      if (editor) authorMarkdown(editor, markdown)
      volverAlEditor()
    },
    [volverAlEditor],
  )

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


  // El editor lee `value` una sola vez, al montar: para cambiar de documento se cambia la `key`.
  void listo

  return (
    <div className="taller">
      <main className="taller-lienzo">
        <div className="taller-hoja" data-lado={lado} style={{ ['--melu-column' as string]: `${columna}px` }}>
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

      <TopBar
        editor={editor}
        version={version}
        columna={columna}
        onColumna={setColumna}
        lado={lado}
        onLado={setLado}
        readOnly={readOnly}
        onReadOnly={setReadOnly}
        onAgente={() => agente()}
        onReiniciar={reiniciar}
        caja={caja}
        onCaja={setCaja}
      />

      <AddMenu editor={editor} onListo={volverAlEditor} />

      <Inspector editor={editor} version={version} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Taller />
  </StrictMode>,
)
