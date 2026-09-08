/**
 * Las props del bloque elegido, a la derecha.
 *
 * Es la única superficie del motor que no tenía forma de tocarse a mano. El menú del asa cubre
 * color y alineación; `tolerance`, `engine`, `figure`, `steps`, `maxSeconds`, `stackBelow` y treinta
 * más existían sólo como datos. El schema ya los publica con su tipo, su rango y sus opciones, así
 * que este panel no inventa nada: dibuja lo que el spec declara.
 *
 * Tenía una pestaña con la forma del documento, el markdown y el JSON, y se fue: a quien escribe
 * una actividad no le sirve, y para mirarla mientras se prueba está la consola, que es la misma
 * puerta que usan los tests (`taller.outline()`, `taller.sketch()`, `melu.doc`).
 */

import { useMemo } from 'react'
import {
  Icon,
  activeBlock,
  hasIcon,
  type BlockId,
  type Editor,
  type PropSpec,
  type Props,
  type RichText,
} from '../src/index.ts'
import { BoolField, JsonField, NumField, OptionsField, StringField, TextField, ToneField } from './fields.tsx'

/**
 * En qué sección va cada prop. Son de la interfaz, no del modelo: el spec no las declara y no tiene
 * por qué. Lo que no está nombrado cae en "Otros", que es mejor que esconderlo.
 */
const SECCIONES: readonly { rotulo: string; claves: readonly string[] }[] = [
  { rotulo: 'Consigna', claves: ['hint', 'explanation', 'caption', 'alt', 'title', 'name', 'label', 'transcript'] },
  {
    rotulo: 'Respuesta',
    claves: ['answer', 'tolerance', 'unit', 'correct', 'correctMulti', 'options', 'blanks', 'items', 'pairs', 'caseSensitive', 'shuffle', 'points', 'required', 'minWords', 'rows', 'low', 'high', 'steps', 'media', 'maxSeconds', 'engine', 'seconds', 'categories', 'questions', 'figure', 'min', 'max', 'step', 'parts', 'coefA', 'coefB', 'coefC'],
  },
  { rotulo: 'Presentación', claves: ['color', 'bg', 'tone', 'align', 'size', 'width', 'height', 'ratio', 'rounded', 'emoji', 'wrap', 'language', 'open', 'checked', 'header', 'headerColumn', 'depth', 'gap', 'stackBelow', 'grow', 'start', 'toggleable', 'autoplay', 'loop', 'autostart', 'chime', 'allowFullscreen', 'latex', 'provider', 'src', 'url', 'image', 'favicon', 'site', 'mime', 'size'] },
]

const TONOS = ['color', 'bg', 'tone']

function Campo({
  nombre,
  spec,
  valor,
  onChange,
}: {
  nombre: string
  spec: PropSpec
  valor: unknown
  onChange: (v: unknown) => void
}) {
  const etiqueta = spec.label ?? nombre
  // Un control ancho (un segmentado de tres, las muestras de color, un json) no entra al lado de su
  // nombre en un panel de trescientos: se apila, en lugar de hacer scrollear el panel de costado.
  const apilado =
    spec.kind === 'json' ||
    spec.kind === 'list' ||
    (spec.kind === 'string' && Boolean(spec.options) && (spec.options!.length > 2 || TONOS.includes(nombre)))
  const control = () => {
    if (spec.kind === 'boolean') return <BoolField value={valor === true} onChange={onChange} />
    if (spec.kind === 'number') return <NumField value={valor as number} onChange={onChange} spec={spec} />
    if (spec.kind === 'text') return <TextField value={(valor as RichText) ?? []} onChange={onChange} />
    if (spec.kind === 'string' && spec.options) {
      return TONOS.includes(nombre) ? (
        <ToneField value={valor as string} onChange={onChange} options={spec.options} />
      ) : (
        <OptionsField value={valor as string} onChange={onChange} options={spec.options} />
      )
    }
    if (spec.kind === 'string') return <StringField value={(valor as string) ?? ''} onChange={onChange} />
    return <JsonField value={valor} onChange={onChange} />
  }
  return (
    <div className="taller-campo" data-apilado={apilado}>
      <span className="taller-campo-nombre" title={spec.hint ?? etiqueta}>
        {etiqueta}
      </span>
      <span className="taller-campo-control">{control()}</span>
    </div>
  )
}

function DelBloque({ editor, id }: { editor: Editor; id: BlockId }) {
  const bloque = editor.block(id)
  const spec = editor.state.schema.specOr(bloque?.type ?? '')
  const declaradas = Object.entries(spec.props ?? {})
  const props: Props = bloque?.props ?? {}

  const usadas = new Set<string>()
  const secciones = SECCIONES.map((s) => {
    const suyas = declaradas.filter(([n]) => s.claves.includes(n))
    for (const [n] of suyas) usadas.add(n)
    return { rotulo: s.rotulo, campos: suyas }
  })
  const otras = declaradas.filter(([n]) => !usadas.has(n))
  if (otras.length) secciones.push({ rotulo: 'Otros', campos: otras })

  const set = (nombre: string, valor: unknown) => editor.run('setBlockProps', { id, props: { [nombre]: valor } })

  return (
    <>
      <div className="taller-cabecera">
        <span className="taller-insignia" data-grupo={spec.group}>
          <Icon name={hasIcon(spec.icon) ? spec.icon : 'text'} size={18} />
        </span>
        <div>
          <div className="taller-cabecera-nombre">{spec.name}</div>
          {spec.hint ? <div className="taller-cabecera-hint">{spec.hint}</div> : null}
          <div className="taller-cabecera-id">
            {id} · {bloque?.type}
          </div>
        </div>
      </div>

      {declaradas.length === 0 ? (
        <p className="taller-vacio">Este bloque no declara props.</p>
      ) : (
        secciones
          .filter((s) => s.campos.length > 0)
          .map((s) => (
            <div key={s.rotulo}>
              <div className="taller-rotulo">{s.rotulo}</div>
              {s.campos.map(([nombre, propSpec]) => (
                <Campo
                  key={nombre}
                  nombre={nombre}
                  spec={propSpec}
                  // Una prop ausente no es una prop vacía: vale su default, que es con lo que el
                  // motor va a corregir. Mostrarla apagada sería mentir sobre lo que hace.
                  valor={props[nombre] ?? propSpec.default}
                  onChange={(v) => set(nombre, v)}
                />
              ))}
            </div>
          ))
      )}
    </>
  )
}

export function Inspector({ editor, version }: { editor: Editor | null; version: number }) {
  const elegido = useMemo(() => (editor ? activeBlock(editor.selection) : null), [editor, version])

  return (
    <aside className="taller-panel" data-lado="der" aria-label="Las propiedades del bloque">
      <div className="taller-panel-cabeza">
        <span className="taller-panel-titulo">El bloque</span>
      </div>

      <div className="taller-panel-cuerpo">
        {!editor ? (
          <p className="taller-vacio">Todavía no hay editor.</p>
        ) : elegido && editor.block(elegido) ? (
          <DelBloque editor={editor} id={elegido} />
        ) : (
          <p className="taller-vacio">
            Elegí un bloque para ver sus propiedades.
            <br />
            Hay {editor.state.schema.types.length} tipos en {editor.state.schema.groups.length} grupos.
          </p>
        )}
      </div>
    </aside>
  )
}
