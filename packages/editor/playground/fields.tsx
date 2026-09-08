/**
 * Los controles del inspector, uno por cada `kind` que el schema declara.
 *
 * Ninguno conoce al editor: reciben un valor y avisan el nuevo. Lo que hace que valgan la pena es
 * que los rangos y las opciones salen del spec, así que un ancho con `min 15, max 100` llega con su
 * slider puesto sin que nadie lo escriba dos veces. Y de paso se ve `coerceProps` a ojo: poné 5000
 * en un ancho y volvé a mirar.
 */

import { useEffect, useState } from 'react'
import { plain, type PropSpec, type RichText } from '../src/index.ts'

type Props<T> = { value: T; onChange: (v: T) => void }

export function BoolField({ value, onChange }: Props<boolean>) {
  return (
    <button
      type="button"
      className="taller-switch"
      data-on={value === true}
      aria-pressed={value === true}
      onClick={() => onChange(!value)}
    />
  )
}

export function NumField({ value, onChange, spec }: Props<number> & { spec: Extract<PropSpec, { kind: 'number' }> }) {
  const conRango = spec.min !== undefined && spec.max !== undefined
  return (
    <>
      {conRango ? (
        <input
          type="range"
          className="taller-slider"
          min={spec.min}
          max={spec.max}
          step={spec.step ?? 1}
          value={Number.isFinite(value) ? value : (spec.default ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : null}
      <input
        type="number"
        className="taller-input"
        data-numero="true"
        min={spec.min}
        max={spec.max}
        step={spec.step ?? 'any'}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </>
  )
}

export function StringField({ value, onChange }: Props<string>) {
  return <input className="taller-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}

/**
 * Cómo se lee cada opción. Las claves están en inglés porque son del código, y lo que se muestra va
 * en español porque es producto: el mismo puente que hacen los catálogos de la plataforma.
 */
const ETIQUETAS: Record<string, string> = {
  left: 'Izquierda', center: 'Centro', right: 'Derecha',
  sm: 'Chico', base: 'Normal', lg: 'Grande',
  photo: 'Foto', audio: 'Audio', file: 'Archivo',
  sort: 'Clasificar', memory: 'Memoria', time_attack: 'Contrarreloj',
  number_line: 'Recta', fraction_bar: 'Barra', balance: 'Balanza',
  default: 'Sin color', gray: 'Gris', brown: 'Marrón', orange: 'Naranja', yellow: 'Amarillo',
  green: 'Verde', blue: 'Azul', purple: 'Violeta', pink: 'Rosa', red: 'Rojo',
}

const etiqueta = (o: string) => ETIQUETAS[o] ?? o

/** Pocas opciones entran como segmentado; muchas, como una lista desplegable. */
export function OptionsField({ value, onChange, options }: Props<string> & { options: readonly string[] }) {
  if (options.length <= 3) {
    return (
      <div className="taller-segmentado">
        {options.map((o) => (
          <button key={o} type="button" data-on={value === o} onClick={() => onChange(o)}>
            {etiqueta(o)}
          </button>
        ))}
      </div>
    )
  }
  return (
    <select className="taller-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {etiqueta(o)}
        </option>
      ))}
    </select>
  )
}

/** Los diez tonos, que son datos del documento y no del theme. */
export function ToneField({ value, onChange, options }: Props<string> & { options: readonly string[] }) {
  return (
    <div className="taller-muestras">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="taller-muestra"
          data-on={value === o}
          title={etiqueta(o)}
          style={{ background: o === 'default' ? 'transparent' : `var(--melu-wash-${o}, #eee)` }}
          onClick={() => onChange(o)}
        />
      ))}
    </div>
  )
}

/** Un texto con formato se edita como texto plano: el formato de una pista no es lo que se prueba. */
export function TextField({ value, onChange }: Props<RichText>) {
  const [borrador, setBorrador] = useState(() => plain(value))
  useEffect(() => setBorrador(plain(value)), [value])
  return (
    <input
      className="taller-input"
      value={borrador}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={() => onChange(borrador ? [{ text: borrador }] : [])}
    />
  )
}

/**
 * Una lista o un json se editan como texto, y se aplican al soltar el foco.
 *
 * Aplicar en cada tecla sería imposible: a media escritura el JSON no parsea. Mientras no parsea el
 * campo se pone rojo y no se manda nada, que es más honesto que descartarlo en silencio.
 */
export function JsonField({ value, onChange }: Props<unknown>) {
  const escribir = (v: unknown) => JSON.stringify(v ?? null, null, 1)
  const [borrador, setBorrador] = useState(() => escribir(value))
  const [mal, setMal] = useState(false)
  useEffect(() => {
    setBorrador(escribir(value))
    setMal(false)
  }, [value])

  return (
    <textarea
      className="taller-input"
      data-mal={mal}
      rows={3}
      value={borrador}
      onChange={(e) => {
        setBorrador(e.target.value)
        try {
          JSON.parse(e.target.value)
          setMal(false)
        } catch {
          setMal(true)
        }
      }}
      onBlur={() => {
        try {
          onChange(JSON.parse(borrador))
          setMal(false)
        } catch {
          setMal(true)
        }
      }}
    />
  )
}
