/**
 * El "+" de abajo, que abre hacia arriba.
 *
 * Es la tercera puerta de inserción, y la única que no necesita caret ni saberse los nombres: en
 * una sesión de taller es la forma más rápida de meter uno por uno los treinta y pico de tipos. Es
 * también el único lugar donde el `hint` de cada spec se lee de verdad.
 *
 * Usa el mismo `Popover` que los flotantes del editor, a propósito: si el menú del taller se ve
 * bien y el del editor no, la diferencia está en el editor y no en el marco.
 */

import { useState } from 'react'
import { Icon, Popover, hasIcon, pointAnchor, type BlockSpec, type Editor } from '../src/index.ts'

/** Dos tipos no se insertan solos: una tabla sin filas y un armado sin columnas no son nada. */
const ESPECIALES: Record<string, { command: string; args: Record<string, number> }> = {
  table: { command: 'insertTable', args: { rows: 3, cols: 3 } },
  columns: { command: 'insertColumns', args: { count: 2 } },
}

export function AddMenu({ editor }: { editor: Editor | null }) {
  const [en, setEn] = useState<{ x: number; y: number } | null>(null)

  const insertar = (spec: BlockSpec) => {
    if (!editor) return
    const especial = ESPECIALES[spec.type]
    if (especial) editor.run(especial.command, especial.args)
    else editor.run('insertBlock', { type: spec.type })
    setEn(null)
  }

  return (
    <>
      <button
        type="button"
        className="taller-mas"
        title="Agregar un bloque"
        aria-label="Agregar un bloque"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setEn(en ? null : { x: r.left, y: r.top })
        }}
      >
        <Icon name="plus" size={20} />
      </button>

      {en && editor ? (
        <Popover
          anchor={pointAnchor(en.x, en.y, 0)}
          open
          onClose={() => setEn(null)}
          placement="top-start"
          role="menu"
          aria-label="Agregar un bloque"
          className="taller-add"
        >
          <div className="melu-menu">
            <div className="melu-menu-scroll">
              {editor.state.schema.groups.map((g) => (
                <div key={g.group} className="melu-menu-group">
                  <div className="melu-menu-title">{g.group}</div>
                  {g.items.map((spec) => (
                    <button
                      key={spec.type}
                      type="button"
                      className="melu-menu-item"
                      role="menuitem"
                      onClick={() => insertar(spec)}
                    >
                      <span className="melu-menu-icon">
                        <Icon name={hasIcon(spec.icon) ? spec.icon : 'text'} size={17} />
                      </span>
                      <span className="melu-menu-text">
                        <span className="melu-menu-name">{spec.name}</span>
                        {spec.hint ? <span className="melu-menu-hint">{spec.hint}</span> : null}
                      </span>
                      <span className="melu-menu-key">{spec.type}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Popover>
      ) : null}
    </>
  )
}
