/**
 * Lo que flota arriba, en dos grupos.
 *
 * A la izquierda del todo las **acciones**: deshacer, rehacer y el agente, que son las que cambian
 * el documento. Pegado al panel de la derecha, el **menú**: cómo se está mirando (solo lectura, el
 * ancho y el lado de la columna, la caja) y volver a empezar. Van separados porque son dos cosas
 * distintas y estaban en la misma píldora: apretar "Solo lectura" buscando "Deshacer" es de las
 * cosas que pasan cuando todo vive junto.
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

/** De qué lado del canvas se apoya la columna. Notion deja elegirlo y se extraña cuando no está. */
export const LADOS = [
  { valor: 'izquierda', nombre: 'A la izquierda' },
  { valor: 'centro', nombre: 'Al centro' },
  { valor: 'derecha', nombre: 'A la derecha' },
] as const

export type Lado = (typeof LADOS)[number]['valor']

export function TopBar({
  editor,
  version,
  columna,
  onColumna,
  lado,
  onLado,
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
  lado: Lado
  onLado: (v: Lado) => void
  readOnly: boolean
  onReadOnly: (v: boolean) => void
  onAgente: () => void
  onReiniciar: () => void
  caja: boolean
  onCaja: (v: boolean) => void
}) {
  const [abierto, setAbierto] = useState<{ cual: 'ancho' | 'lado'; x: number; y: number } | null>(null)
  // `version` no se lee: alcanza con que cambie para que la barra vuelva a preguntar si se puede
  // deshacer. Sin esto los botones quedarían apagados para siempre.
  void version
  const puedeDeshacer = editor?.history.size.past ? editor.history.size.past > 0 : false
  const puedeRehacer = editor?.history.size.future ? editor.history.size.future > 0 : false
  const nombreDelLado = LADOS.find((l) => l.valor === lado)?.nombre ?? 'Al centro'

  /** Abre un menú abajo del botón que lo pidió, o lo cierra si era el mismo. */
  const abrir = (cual: 'ancho' | 'lado') => (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setAbierto((antes) => (antes?.cual === cual ? null : { cual, x: r.left, y: r.bottom }))
  }

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

        <button type="button" className="taller-solido" onClick={onAgente}>
          <Icon name="plus" size={14} />
          Escribe el agente
        </button>
      </div>

      <div className="taller-bar" role="toolbar" aria-label="Cómo se mira el taller">
        <button type="button" className="taller-pill" data-on={readOnly} onClick={() => onReadOnly(!readOnly)}>
          <span className="taller-punto" />
          Solo lectura
        </button>

        {/* El nombre sale del texto del botón, que es el valor: leído en voz alta, "720 px" es un
            botón llamado 720 px y no un botón para cambiar el ancho. Va con `aria-label`, como el
            "Convertir en" de la barra de formato. */}
        <button
          type="button"
          className="taller-pill"
          aria-label={`Ancho de la columna: ${columna} px`}
          aria-expanded={abierto?.cual === 'ancho'}
          onClick={abrir('ancho')}
        >
          {columna} px
          <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
        </button>

        <button
          type="button"
          className="taller-pill"
          aria-label={`Lado de la columna: ${nombreDelLado}`}
          aria-expanded={abierto?.cual === 'lado'}
          onClick={abrir('lado')}
        >
          {nombreDelLado}
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
      </div>

      {abierto ? (
        <Popover
          anchor={pointAnchor(abierto.x, abierto.y, 0)}
          open
          onClose={() => setAbierto(null)}
          role="menu"
          aria-label={abierto.cual === 'ancho' ? 'Ancho de la columna' : 'Lado de la columna'}
        >
          <div className="melu-menu">
            {abierto.cual === 'ancho'
              ? ANCHOS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="melu-menu-item"
                    data-active={n === columna || undefined}
                    role="menuitem"
                    onClick={() => {
                      onColumna(n)
                      setAbierto(null)
                    }}
                  >
                    <span className="melu-menu-text">
                      <span className="melu-menu-name">{n === 1200 ? 'Todo el ancho' : `${n} px`}</span>
                    </span>
                  </button>
                ))
              : LADOS.map((l) => (
                  <button
                    key={l.valor}
                    type="button"
                    className="melu-menu-item"
                    data-active={l.valor === lado || undefined}
                    role="menuitem"
                    onClick={() => {
                      onLado(l.valor)
                      setAbierto(null)
                    }}
                  >
                    <span className="melu-menu-text">
                      <span className="melu-menu-name">{l.nombre}</span>
                    </span>
                  </button>
                ))}
          </div>
        </Popover>
      ) : null}
    </div>
  )
}
