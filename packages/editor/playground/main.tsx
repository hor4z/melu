/**
 * El taller: la página donde se prueba a mano lo que los tests prueban solos.
 *
 * No es una demo de vitrina. Tiene a la izquierda el editor y a la derecha lo que el motor está
 * pensando (el documento, el markdown, el esquema que lee un agente y los números de rendimiento),
 * porque la mayoría de los errores de un editor se ven mucho antes en el modelo que en la pantalla.
 */

import { StrictMode, useCallback, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BlockEditor,
  authorMarkdown,
  brief,
  fromMarkdown,
  manifest,
  outline,
  toJSON,
  toMarkdown,
  type BlockJSON,
  type Editor,
} from '../src/index.ts'
import '../src/ui/editor.css'
import './taller.css'

const INICIAL = `# Medir el patio

Salimos con la cinta métrica y anotamos lo que encontramos. Este bloque es **texto** con *cursiva*, algo de \`código\` y un [link](https://educabot.com).

## Antes de salir

- [ ] Traer la cinta métrica
- [x] Anotar la fecha
- [ ] Cargar la batería de la tablet

> La pista
  Si el patio no es un rectángulo, se puede partir en dos.

## Los pasos

1. Medir el largo, caminando por el borde
2. Medir el ancho
3. Multiplicar

> 💡 Ojo con el cordón: se mide desde el borde de adentro.

| Lado | Medida | Unidad |
| --- | --- | --- |
| Largo |  | m |
| Ancho |  | m |

---

![Un patio de escuela](https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=70)

\`\`\`python
largo = 12.5
ancho = 8
print(largo * ancho)
\`\`\`
`

function Taller() {
  const editorRef = useRef<Editor | null>(null)
  const [doc, setDoc] = useState<BlockJSON[]>([])
  const [tab, setTab] = useState<'doc' | 'markdown' | 'agente' | 'perf'>('doc')
  const [readOnly, setReadOnly] = useState(false)
  const [nonce, setNonce] = useState(0)

  const value = useMemo(() => toJSON({ root: 'root', blocks: {} }) && jsonOf(INICIAL), [])

  const onReady = useCallback((editor: Editor) => {
    editorRef.current = editor
    // El taller es una herramienta de desarrollo: tener el motor a mano en la consola es la
    // diferencia entre mirar una pantalla y poder preguntarle qué está pensando.
    ;(window as unknown as { melu: Editor }).melu = editor
  }, [])

  return (
    <div className="taller">
      <header className="taller-top">
        <strong>@melu/editor</strong>
        <span className="taller-sub">el taller del motor</span>
        <div className="taller-acciones">
          <button onClick={() => editorRef.current?.undo()}>Deshacer</button>
          <button onClick={() => editorRef.current?.redo()}>Rehacer</button>
          <button onClick={() => setReadOnly((v) => !v)} data-on={readOnly}>
            {readOnly ? 'Editar' : 'Solo lectura'}
          </button>
          <button
            onClick={() => {
              const editor = editorRef.current
              if (!editor) return
              authorMarkdown(
                editor,
                [
                  '## Lo que escribió un agente',
                  '',
                  'Este pedazo entró por la misma puerta que un click, en una sola transacción.',
                  '',
                  '1. Contar los pasos del largo',
                  '2. Contar los pasos del ancho',
                ].join('\n'),
              )
            }}
          >
            Que escriba un agente
          </button>
          <button onClick={() => setNonce((n) => n + 1)}>Reiniciar</button>
        </div>
      </header>

      <main className="taller-cuerpo">
        <section className="taller-pagina">
          <BlockEditor
            key={nonce}
            value={value}
            readOnly={readOnly}
            aria-label="El contenido de la actividad"
            toolbox={{ initial: { top: 76, right: 424 } }}
            onReady={onReady}
            onChange={(blocks) => setDoc(blocks)}
            debounce={120}
          />
        </section>

        <aside className="taller-panel">
          <nav className="taller-tabs">
            {(['doc', 'markdown', 'agente', 'perf'] as const).map((t) => (
              <button key={t} data-on={tab === t} onClick={() => setTab(t)}>
                {{ doc: 'Documento', markdown: 'Markdown', agente: 'Agente', perf: 'Rendimiento' }[t]}
              </button>
            ))}
          </nav>
          <div className="taller-salida">
            {tab === 'doc' ? <pre>{JSON.stringify(doc, null, 1)}</pre> : null}
            {tab === 'markdown' ? <pre>{editorRef.current ? toMarkdown(editorRef.current.doc) : ''}</pre> : null}
            {tab === 'agente' ? <Agente editorRef={editorRef} /> : null}
            {tab === 'perf' ? <Perf editorRef={editorRef} /> : null}
          </div>
        </aside>
      </main>
    </div>
  )
}

const jsonOf = (markdown: string): BlockJSON[] =>
  fromMarkdown(markdown).map(function walk(b): BlockJSON {
    return {
      type: b.type,
      ...(b.text !== undefined ? { text: b.text } : {}),
      ...(b.props ? { props: b.props } : {}),
      ...(b.children?.length ? { children: b.children.map(walk) } : {}),
    }
  })

function Agente({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
  const editor = editorRef.current
  if (!editor) return <p>Todavía no hay editor.</p>
  return (
    <>
      <h3>Lo que ve el agente del documento</h3>
      <pre>{outline(editor)}</pre>
      <h3>El resumen para un prompt</h3>
      <pre>{brief(editor)}</pre>
      <h3>El manifiesto</h3>
      <pre>{JSON.stringify(manifest(editor), null, 1)}</pre>
    </>
  )
}

/** Los números que importan: cuánto tarda en montar y cuánto en escribir una letra. */
function Perf({ editorRef }: { editorRef: React.RefObject<Editor | null> }) {
  const [medida, setMedida] = useState<string[]>([])

  const correr = () => {
    const editor = editorRef.current
    if (!editor) return
    const lineas: string[] = []

    const bloques = Object.keys(editor.doc.blocks).length - 1
    lineas.push(`Bloques en la página: ${bloques}`)

    // Escribir mil veces en el mismo bloque: es lo que hace alguien tipeando.
    const primero = editor.doc.blocks[editor.doc.root]!.children[0]!
    editor.setSelection({ kind: 'text', anchor: { block: primero, offset: 0 }, head: { block: primero, offset: 0 } })
    const t0 = performance.now()
    for (let i = 0; i < 1000; i++) editor.run('insertText', { text: 'x' })
    const t1 = performance.now()
    lineas.push(`Mil inserciones de texto: ${(t1 - t0).toFixed(1)} ms (${((t1 - t0) / 1000).toFixed(3)} ms cada una)`)

    for (let i = 0; i < 1000; i++) editor.undo()

    const t2 = performance.now()
    for (let i = 0; i < 200; i++) editor.run('insertBlock', { type: 'paragraph', at: 'end', focus: false })
    const t3 = performance.now()
    lineas.push(`Doscientos bloques nuevos: ${(t3 - t2).toFixed(1)} ms`)

    const t4 = performance.now()
    toMarkdown(editor.doc)
    const t5 = performance.now()
    lineas.push(`Serializar a markdown: ${(t5 - t4).toFixed(1)} ms`)

    setMedida(lineas)
  }

  return (
    <>
      <button className="taller-correr" onClick={correr}>
        Medir
      </button>
      <pre>{medida.join('\n')}</pre>
      <p className="taller-nota">
        Cada inserción es una transacción entera: comandos, normalizadores, historial y el aviso a
        los suscriptores. Lo que se repinta es un párrafo, no la página.
      </p>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Taller />
  </StrictMode>,
)
