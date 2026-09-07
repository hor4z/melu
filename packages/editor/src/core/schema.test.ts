import { describe, expect, it } from 'vitest'
import { coerceProp, coerceProps, defineSchema, fold, type BlockSpec } from './schema.ts'
import { makeFullEditor } from '../test/engine.ts'

const specs: BlockSpec[] = [
  { type: 'paragraph', name: 'Texto', group: 'Básicos', content: 'text', container: true },
  { type: 'image', name: 'Imagen', group: 'Medios', keywords: ['foto'], content: 'none' },
  { type: 'code', name: 'Código', group: 'Básicos', content: 'text', marks: false },
  { type: 'table', name: 'Tabla', group: 'Estructura', content: 'none', container: { only: ['table_row'] } },
  { type: 'table_row', name: 'Fila', content: 'none', container: { only: ['table_cell'] } },
  { type: 'table_cell', name: 'Celda', content: 'text' },
]

const schema = defineSchema(specs)

describe('el registro', () => {
  it('conoce los tipos en el orden en que se declararon', () => {
    expect(schema.types).toEqual(['paragraph', 'image', 'code', 'table', 'table_row', 'table_cell'])
  })

  it('agrupa el menú, y deja afuera lo que no tiene grupo', () => {
    expect(schema.groups.map((g) => g.group)).toEqual(['Básicos', 'Medios', 'Estructura'])
    expect(schema.groups.flatMap((g) => g.items.map((i) => i.type))).not.toContain('table_row')
  })

  it('un tipo desconocido cae en el de reserva en lugar de romper el render', () => {
    expect(schema.spec('inventado')).toBeUndefined()
    expect(schema.specOr('inventado').content).toBe('text')
  })

  it('el último que declara un tipo gana, sin perder su lugar en el menú', () => {
    const s = defineSchema([...specs, { type: 'paragraph', name: 'Párrafo', group: 'Básicos', content: 'text' }])
    expect(s.blocks['paragraph']!.name).toBe('Párrafo')
    expect(s.types[0]).toBe('paragraph')
  })
})

describe('qué puede tener qué', () => {
  it('un contenedor abierto acepta cualquier cosa', () => {
    expect(schema.accepts('paragraph', 'image')).toBe(true)
  })

  it('uno restringido acepta solo lo suyo', () => {
    expect(schema.accepts('table', 'table_row')).toBe(true)
    expect(schema.accepts('table', 'paragraph')).toBe(false)
  })

  it('lo que no es contenedor no acepta nada', () => {
    expect(schema.accepts('image', 'paragraph')).toBe(false)
  })

  it('la raíz acepta todo', () => {
    expect(schema.accepts('doc', 'table')).toBe(true)
  })
})

describe('marcas por tipo', () => {
  it('por defecto se aceptan todas', () => {
    expect(schema.allowsMark('paragraph', 'bold')).toBe(true)
  })

  it('un bloque con marcas en false no acepta ninguna', () => {
    expect(schema.allowsMark('code', 'bold')).toBe(false)
    expect(schema.allowsMark('code', 'link')).toBe(false)
  })
})

describe('la búsqueda del menú', () => {
  it('sin texto trae lo que tiene grupo', () => {
    expect(schema.search('').map((s) => s.type)).toEqual(['paragraph', 'image', 'code', 'table'])
  })

  it('un prefijo del nombre gana', () => {
    expect(schema.search('ima')[0]!.type).toBe('image')
  })

  it('encuentra por palabra clave', () => {
    expect(schema.search('foto')[0]!.type).toBe('image')
  })

  it('ignora los acentos, que es lo que se escribe apurado', () => {
    expect(schema.search('codigo')[0]!.type).toBe('code')
    expect(fold('Código')).toBe('codigo')
  })

  it('lo que no existe no trae nada', () => {
    expect(schema.search('zzz')).toEqual([])
  })

  it('en el editor completo, "tabla" trae la tabla y no una pregunta', () => {
    const e = makeFullEditor()
    expect(e.schema.search('tabla')[0]!.type).toBe('table')
  })

  it('y "opciones" trae la pregunta de opciones', () => {
    const e = makeFullEditor()
    expect(e.schema.search('opciones')[0]!.type).toBe('choice')
  })
})

describe('las props declaradas', () => {
  it('el editor le pone los valores por defecto a un bloque nuevo', () => {
    const e = makeFullEditor()
    e.run('insertBlock', { type: 'callout' })
    const nuevo = Object.values(e.doc.blocks).find((b) => b.type === 'callout')!
    expect(nuevo.props).toMatchObject({ emoji: '💡', tone: 'yellow' })
  })

  it('un número fuera de rango se recorta en lugar de entrar', () => {
    expect(coerceProp({ kind: 'number', min: 15, max: 100 }, 500)).toBe(100)
    expect(coerceProp({ kind: 'number', min: 15, max: 100 }, 1)).toBe(15)
  })

  it('un valor que no está entre las opciones se descarta', () => {
    expect(coerceProp({ kind: 'string', options: ['left', 'center'] }, 'diagonal')).toBeUndefined()
  })

  it('un texto llano donde se esperaba texto enriquecido se envuelve', () => {
    expect(coerceProp({ kind: 'text' }, 'hola')).toEqual([{ text: 'hola' }])
  })

  it('lo que no se puede convertir se informa y no se guarda', () => {
    const spec = specs[1]!
    const out = coerceProps({ ...spec, props: { width: { kind: 'number', min: 0, max: 100 } } }, { width: 'ancho' })
    expect(out.dropped).toEqual(['width'])
    expect(out.props).toEqual({})
  })

  it('si el spec tiene un valor por defecto, un valor rechazado cae en ese', () => {
    const spec = specs[1]!
    const out = coerceProps({ ...spec, props: { align: { kind: 'string', options: ['left'], default: 'left' } } }, { align: 'diagonal' })
    expect(out.dropped).toEqual(['align'])
    expect(out.props).toEqual({ align: 'left' })
  })

  it('una clave que el spec no declara se conserva: perder datos en silencio es peor', () => {
    const out = coerceProps(specs[0], { inventada: 42 })
    expect(out.props).toEqual({ inventada: 42 })
  })

  it('el editor recorta lo que llega fuera de rango', () => {
    const e = makeFullEditor([{ type: 'image', props: { src: 'x', width: 999 } }])
    e.run('setBlockProps', { id: Object.values(e.doc.blocks).find((b) => b.type === 'image')!.id, props: { width: 999 } })
    const img = Object.values(e.doc.blocks).find((b) => b.type === 'image')!
    expect(img.props!.width).toBe(100)
  })
})
