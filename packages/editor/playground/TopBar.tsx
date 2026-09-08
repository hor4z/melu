/**
 * La barra flotante de arriba: lo que se aprieta seguido probando un editor a mano.
 *
 * El control con chevron cambia el **ancho de columna** y no el zoom, y es a propósito. Un zoom que
 * escala píxeles rompe justo la geometría de la que dependen `caretRect`, `place` y el cálculo del
 * primer renglón del asa, o sea que rompería lo único que el taller sabe probar y los tests no. El
 * ancho, en cambio, ejercita el reflow, el apilado de columnas por container query y las tablas
 * anchas.
 */

import { useState } from 'react'
import { Icon, Popover, pointAnchor, type Editor } from '../src/index.ts'

const ANCHOS = [560, 720, 900, 1200] as const

export function TopBar({
  editor,
  version,
  columna,
  onColumna,
  readOnly,
  onReadOnly,
  onAgente,
  onReiniciar,
  caja,
  onCaja,
}: {
  editor: Editor | null
  version: number
  columna: number
  onColumna: (n: number) => void
  readOnly: boolean
  onReadOnly: (v: boolean) => void
  onAgente: () => void
  onReiniciar: () => void
  caja: boolean
  onCaja: (v: boolean) => void
}) {
  const [anchos, setAnchos] = useState<{ x: number; y: number } | null>(null)
  // `version` no se lee: alcanza con que cambie para que la barra vuelva a preguntar si se puede
  // deshacer. Sin esto los botones quedarían apagados para siempre.
  void version
  const puedeDeshacer = editor?.history.size.past ? editor.history.size.past > 0 : false
  const puedeRehacer = editor?.history.size.future ? editor.history.size.future > 0 : false

  return (
    <div className="taller-bar-hueco">
      <div className="taller-bar" role="toolbar" aria-label="Acciones del taller">
        <button
          type="button"
          className="taller-boton"
          title="Deshacer"
          disabled={!puedeDeshacer}
          onClick={() => editor?.undo()}
        >
          <Icon name="undo" size={17} />
        </button>
        <button
          type="button"
          className="taller-boton"
          title="Rehacer"
          disabled={!puedeRehacer}
          onClick={() => editor?.redo()}
        >
          <Icon name="redo" size={17} />
        </button>

        <span className="taller-sep" />

        <button type="button" className="taller-pill" data-on={readOnly} onClick={() => onReadOnly(!readOnly)}>
          <span className="taller-punto" />
          Solo lectura
        </button>

        <button
          type="button"
          className="taller-pill"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setAnchos(anchos ? null : { x: r.left, y: r.bottom })
          }}
        >
          {columna} px
          <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
        </button>

        <button
          type="button"
          className="taller-pill"
          data-on={caja}
          disabled={readOnly}
          title={readOnly ? 'En solo lectura no hay nada que insertar' : 'La caja de bloques, para arrastrar uno a la hoja'}
          onClick={() => onCaja(!caja)}
        >
          <Icon name="grip" size={14} />
          Caja
        </button>

        <span className="taller-sep" />

        <button type="button" className="taller-boton" title="Volver a empezar" onClick={onReiniciar}>
          <Icon name="reset" size={17} />
        </button>

        <button type="button" className="taller-solido" onClick={onAgente}>
          <Icon name="plus" size={14} />
          Escribe el agente
        </button>
      </div>

      {anchos ? (
        <Popover
          anchor={pointAnchor(anchos.x, anchos.y, 0)}
          open
          onClose={() => setAnchos(null)}
          role="menu"
          aria-label="Ancho de la columna"
        >
          <div className="melu-menu">
            {ANCHOS.map((n) => (
              <button
                key={n}
                type="button"
                className="melu-menu-item"
                data-active={n === columna || undefined}
                role="menuitem"
                onClick={() => {
                  onColumna(n)
                  setAnchos(null)
                }}
              >
                <span className="melu-menu-text">
                  <span className="melu-menu-name">{n === 1200 ? 'Todo el ancho' : `${n} px`}</span>
                </span>
              </button>
            ))}
          </div>
        </Popover>
      ) : null}
    </div>
  )
}
