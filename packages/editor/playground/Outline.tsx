/**
 * El árbol del documento, a la izquierda.
 *
 * Es la contraparte visual de `outline(editor)`, que hasta ahora había que pedir por consola. Con
 * el árbol al lado se ve el orden, el anidamiento y —lo que más importa— **el caret moviéndose por
 * la estructura mientras alguien escribe**, y a los normalizadores acomodando cosas solos. Es la
 * forma más barata de comprobar que el motor avisa lo que tiene que avisar.
 *
 * Y tiene que ser barato. Medido con quinientos bloques, una tecla costaba ochenta milisegundos con
 * el árbol puesto y diez con el árbol filtrado a una fila: el motor andaba bien y el panel lo hacía
 * sentir lento. Por eso las filas se memorizan por valor y el árbol se deja atrasar: mientras
 * alguien escribe se vuelve a dibujar la fila que cambió, y ninguna otra.
 */

import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react'
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

/** Un botoncito de la fila, que no puede llevarse el click de la fila entera. */
function Mini({
  titulo,
  icono,
  peligro,
  onClick,
}: {
  titulo: string
  icono: string
  peligro?: boolean
  onClick: () => void
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      className="taller-mini"
      data-peligro={peligro || undefined}
      title={titulo}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Icon name={hasIcon(icono) ? icono : 'text'} size={13} />
    </span>
  )
}

/**
 * Una fila, memorizada por sus valores.
 *
 * Las props son datos sueltos y no el objeto de la fila, a propósito: el árbol se vuelve a armar
 * entero en cada cambio, así que los objetos son nuevos siempre y comparar por referencia no
 * ahorraría nada. Comparadas por valor, escribir una letra vuelve a dibujar una sola fila.
 */
const FilaDelArbol = memo(function FilaDelArbol({
  id,
  nivel,
  tipo,
  texto,
  nombre,
  icono,
  activa,
  onIr,
  onSubir,
  onBajar,
  onBorrar,
}: {
  id: BlockId
  nivel: number
  tipo: string
  texto: string
  nombre: string
  icono: string
  activa: boolean
  onIr: (id: BlockId) => void
  onSubir: (id: BlockId) => void
  onBajar: (id: BlockId) => void
  onBorrar: (id: BlockId) => void
}) {
  return (
    <div style={{ paddingLeft: Math.min(nivel, 4) * 12 }}>
      <button
        type="button"
        className="taller-fila"
        data-activa={activa}
        onClick={() => onIr(id)}
        title={`${nombre} · ${tipo}`}
      >
        <Icon name={hasIcon(icono) ? icono : 'text'} size={15} />
        <span className="taller-fila-texto" data-sin-texto={texto === ''}>
          {texto || nombre}
        </span>
        <span className="taller-fila-acciones">
          <Mini titulo="Subir" icono="arrowUp" onClick={() => onSubir(id)} />
          <Mini titulo="Bajar" icono="arrowDown" onClick={() => onBajar(id)} />
          <Mini titulo="Borrar" icono="trash" peligro onClick={() => onBorrar(id)} />
        </span>
      </button>
    </div>
  )
})

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

  // El árbol se puede atrasar, y en un documento largo tiene que atrasarse: el editor dibuja
  // primero y el panel se pone al día cuando hay tiempo. Nadie mira la izquierda mientras escribe.
  const alDia = useDeferredValue(version)
  const todas = useMemo(() => (editor ? filas(editor) : []), [editor, alDia])
  // Todo lo elegido y no sólo el ancla: con tres bloques elegidos, marcar uno solo hace dudar de si
  // el árbol está mostrando lo que pasa o una parte.
  const elegidos = useMemo(
    () => new Set(editor ? selectedBlocks(editor.doc, editor.selection) : []),
    [editor, alDia],
  )

  const subir = useCallback((id: BlockId) => void editor?.run('moveUp', { id }), [editor])
  const bajar = useCallback((id: BlockId) => void editor?.run('moveDown', { id }), [editor])
  const borrar = useCallback((id: BlockId) => void editor?.run('removeBlock', { id }), [editor])

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
              <FilaDelArbol
                key={f.id}
                id={f.id}
                nivel={f.nivel}
                tipo={f.tipo}
                texto={f.texto}
                nombre={spec.name}
                icono={spec.icon ?? 'text'}
                activa={elegidos.has(f.id)}
                onIr={onIr}
                onSubir={subir}
                onBajar={bajar}
                onBorrar={borrar}
              />
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
