/**
 * El árbol del documento, a la izquierda.
 *
 * Es la contraparte visual de `outline(editor)`, que hasta ahora había que pedir por consola. Con
 * el árbol al lado se ve el orden, el anidamiento y —lo que más importa— **el caret moviéndose por
 * la estructura mientras alguien escribe**, y a los normalizadores acomodando cosas solos. Es la
 * forma más barata de comprobar que el motor avisa lo que tiene que avisar.
 */

import { useMemo, useState } from 'react'
import { Icon, childrenOf, hasIcon, plain, selectedBlocks, type BlockId, type Editor } from '../src/index.ts'

type Fila = { id: BlockId; nivel: number; tipo: string; texto: string }

/** El documento aplanado, con su nivel, en orden de lectura. */
function filas(editor: Editor, parent: BlockId = editor.doc.root, nivel = 0): Fila[] {
  const out: Fila[] = []
  for (const id of childrenOf(editor.doc, parent)) {
    const b = editor.doc.blocks[id]
    if (!b) continue
    out.push({ id, nivel, tipo: b.type, texto: plain(b.text).replace(/\s+/g, ' ').trim() })
    out.push(...filas(editor, id, nivel + 1))
  }
  return out
}

export function Outline({
  editor,
  version,
  onIr,
}: {
  editor: Editor | null
  version: number
  onIr: (id: BlockId) => void
}) {
  const [busqueda, setBusqueda] = useState('')

  // `version` sube en cada transacción: es lo que hace que el árbol siga al documento sin que el
  // panel se suscriba a cada bloque.
  const todas = useMemo(() => (editor ? filas(editor) : []), [editor, version])
  // Todo lo elegido y no sólo el ancla: con tres bloques elegidos, marcar uno solo hace dudar de si
  // el árbol está mostrando lo que pasa o una parte.
  const elegidos = useMemo(
    () => new Set(editor ? selectedBlocks(editor.doc, editor.selection) : []),
    [editor, version],
  )

  const q = busqueda.trim().toLowerCase()
  const visibles = q ? todas.filter((f) => f.texto.toLowerCase().includes(q) || f.tipo.includes(q)) : todas

  return (
    <aside className="taller-panel" data-lado="izq" aria-label="El árbol del documento">
      <div className="taller-panel-cabeza">
        <span className="taller-panel-titulo">Actividad</span>
        <span className="taller-panel-cuenta">{todas.length} bloques</span>
      </div>

      <div className="taller-panel-cuerpo">
        {visibles.length === 0 ? (
          <p className="taller-vacio">{q ? 'Nada con eso.' : 'El documento está vacío.'}</p>
        ) : (
          visibles.map((f) => {
            const spec = editor!.state.schema.specOr(f.tipo)
            return (
              <div key={f.id} style={{ paddingLeft: Math.min(f.nivel, 4) * 12 }}>
                <button
                  type="button"
                  className="taller-fila"
                  data-activa={elegidos.has(f.id)}
                  onClick={() => onIr(f.id)}
                  title={`${spec.name} · ${f.tipo}`}
                >
                  <Icon name={hasIcon(spec.icon) ? spec.icon : 'text'} size={15} />
                  <span className="taller-fila-texto" data-sin-texto={f.texto === ''}>
                    {f.texto || spec.name}
                  </span>
                  <span className="taller-fila-acciones">
                    <span
                      role="button"
                      tabIndex={-1}
                      className="taller-mini"
                      title="Subir"
                      onClick={(e) => {
                        e.stopPropagation()
                        editor!.run('moveUp', { id: f.id })
                      }}
                    >
                      <Icon name="arrowUp" size={13} />
                    </span>
                    <span
                      role="button"
                      tabIndex={-1}
                      className="taller-mini"
                      title="Bajar"
                      onClick={(e) => {
                        e.stopPropagation()
                        editor!.run('moveDown', { id: f.id })
                      }}
                    >
                      <Icon name="arrowDown" size={13} />
                    </span>
                    <span
                      role="button"
                      tabIndex={-1}
                      className="taller-mini"
                      data-peligro="true"
                      title="Borrar"
                      onClick={(e) => {
                        e.stopPropagation()
                        editor!.run('removeBlock', { id: f.id })
                      }}
                    >
                      <Icon name="trash" size={13} />
                    </span>
                  </span>
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="taller-panel-pie">
        <div className="taller-buscador">
          <Icon name="search" size={14} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en el documento"
            aria-label="Buscar en el documento"
          />
          {busqueda ? (
            <span role="button" tabIndex={-1} className="taller-mini" title="Limpiar" onClick={() => setBusqueda('')}>
              <Icon name="close" size={13} />
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
