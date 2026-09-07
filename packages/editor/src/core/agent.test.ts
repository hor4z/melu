/**
 * La puerta del agente. Lo que se prueba acá no es que un modelo escriba bien: es que la puerta
 * sea la misma que usa un click, que lo que se publique alcance para atravesarla sin que nadie
 * explique nada, y que un lote a medio camino no deje una actividad partida.
 */

import { describe, expect, it } from 'vitest'
import { apply, authorBlocks, authorMarkdown, brief, manifest, outline, readMarkdown } from './agent.ts'
import { makeFullEditor, sketch } from '../test/engine.ts'
import { toJSON } from './serialize.ts'
import { plain } from './text.ts'

describe('el manifiesto', () => {
  it('publica todos los tipos con sus props', () => {
    const e = makeFullEditor()
    const m = manifest(e)
    expect(m.blocks.map((b) => b.type)).toContain('choice')
    const choice = m.blocks.find((b) => b.type === 'choice')!
    expect(choice.text).toBe(true)
    expect(choice.props.map((p) => p.name)).toContain('correct')
  })

  it('dice las opciones válidas de una prop cerrada', () => {
    const e = makeFullEditor()
    const evidencia = manifest(e).blocks.find((b) => b.type === 'evidence')!
    const media = evidencia.props.find((p) => p.name === 'media')!
    expect(media.options).toEqual(['photo', 'audio', 'file'])
  })

  it('dice los rangos, así un modelo no manda un ancho de mil', () => {
    const e = makeFullEditor()
    const imagen = manifest(e).blocks.find((b) => b.type === 'image')!
    const width = imagen.props.find((p) => p.name === 'width')!
    expect(width.min).toBe(15)
    expect(width.max).toBe(100)
  })

  it('publica los comandos, que son los mismos que corre un click', () => {
    const e = makeFullEditor()
    const m = manifest(e)
    expect(m.commands).toContain('insertBlock')
    expect(m.commands).toContain('setBlockType')
    expect(m.commands).toContain('insertTable')
  })

  it('un plugin nuevo aparece en el manifiesto sin tocar nada más', () => {
    const e = makeFullEditor()
    const conNuevo = makeFullEditor(undefined, {
      plugins: [
        ...e.plugins,
        { name: 'extra', blocks: [{ type: 'sensor', name: 'Sensor', group: 'Robótica', content: 'text', props: { pin: { kind: 'number', default: 13 } } }] },
      ],
    })
    const sensor = manifest(conNuevo).blocks.find((b) => b.type === 'sensor')!
    expect(sensor.group).toBe('Robótica')
    expect(sensor.props[0]).toMatchObject({ name: 'pin', default: 13 })
  })

  it('es JSON: viaja tal cual en una llamada de herramienta', () => {
    const e = makeFullEditor()
    expect(() => JSON.parse(JSON.stringify(manifest(e)))).not.toThrow()
  })
})

describe('el esquema del documento', () => {
  it('cada línea arranca con el id, que es con lo que después se apunta', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '# Medir\n\n- uno')
    const lines = outline(e).split('\n')
    for (const line of lines.filter(Boolean)) expect(line).toMatch(/\[\w+\]/)
  })

  it('muestra la jerarquía con sangría', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '- uno\n  - dos')
    expect(outline(e)).toMatch(/\n {2}1\. \[\w+\] bulleted_list "dos"/)
  })

  it('corta el texto largo para que entre en un prompt', () => {
    const e = makeFullEditor()
    authorMarkdown(e, 'a'.repeat(500))
    expect(outline(e, { chars: 20 })).toContain('…')
    expect(outline(e, { chars: 20 }).length).toBeLessThan(200)
  })

  it('con props las incluye, y sin ellas no', () => {
    const e = makeFullEditor()
    apply(e, [{ do: 'insertBlock', args: { type: 'number', props: { answer: 12, unit: 'm' } } }])
    expect(outline(e, { props: true })).toContain('"answer":12')
    expect(outline(e)).not.toContain('answer')
  })

  it('el markdown del documento es lo que se le da a un modelo para reescribir', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '# Medir\n\n- uno', 'replace')
    expect(readMarkdown(e)).toBe('# Medir\n- uno')
  })

  it('el resumen para un system prompt nombra los grupos y el estado', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '# Medir', 'replace')
    const b = brief(e)
    expect(b).toContain('Preguntas:')
    expect(b).toContain('Medios:')
    expect(b).toContain('heading_1')
  })
})

describe('un lote de operaciones', () => {
  it('escribe una actividad entera y queda como un solo deshacer', () => {
    const e = makeFullEditor()
    const report = apply(e, [
      { do: 'markdown', args: { text: '# Medir el patio\n\nSalimos con la cinta.', at: 'replace' } },
      { do: 'insertBlock', args: { type: 'number', text: [{ text: '¿Cuántos metros de largo?' }], props: { answer: 12, tolerance: 0.5, unit: 'm' } } },
      { do: 'insertBlock', args: { type: 'evidence', text: [{ text: 'Sacale una foto a la medición' }], props: { media: 'photo' } } },
    ])
    expect(report.ok).toBe(true)
    expect(sketch(e)).toEqual([
      'heading_1: Medir el patio',
      'paragraph: Salimos con la cinta.',
      'number: ¿Cuántos metros de largo?',
      'evidence: Sacale una foto a la medición',
    ])
    expect(e.history.size.past).toBe(1)
    e.undo()
    expect(sketch(e)).toEqual(['paragraph'])
  })

  it('una operación se apoya en lo que hizo la anterior', () => {
    const e = makeFullEditor()
    const report = apply(e, [
      { do: 'insertBlock', args: { type: 'heading_2', text: [{ text: 'Primero' }] } },
      { do: 'insertBlock', args: { type: 'paragraph', text: [{ text: 'Después' }] } },
    ])
    expect(report.ok).toBe(true)
    // El segundo entra después del primero porque vio la selección que el primero dejó.
    expect(sketch(e)).toEqual(['heading_2: Primero', 'paragraph: Después'])
  })

  it('un comando que no existe cancela el lote entero y no deja nada a medias', () => {
    const e = makeFullEditor()
    const antes = toJSON(e.doc)
    const report = apply(e, [
      { do: 'insertBlock', args: { type: 'heading_1', text: [{ text: 'Título' }] } },
      { do: 'inventarUnBloque', args: {} },
    ])
    expect(report.ok).toBe(false)
    expect(report.error).toContain('inventarUnBloque')
    expect(toJSON(e.doc)).toEqual(antes)
  })

  it('el reporte dice qué pasó con cada operación', () => {
    const e = makeFullEditor()
    const report = apply(e, [
      { do: 'markdown', args: { text: '# uno' } },
      { do: 'moveUp', args: {} },
    ])
    expect(report.results[0]).toMatchObject({ op: 'markdown', ok: true })
    expect(report.results[1]!.op).toBe('moveUp')
  })

  it('un lote vacío no es un cambio', () => {
    const e = makeFullEditor()
    expect(apply(e, []).ok).toBe(false)
  })

  it('un lote que no cambia nada lo dice en lugar de mentir', () => {
    const e = makeFullEditor()
    const report = apply(e, [{ do: 'moveUp', args: {} }])
    expect(report.ok).toBe(false)
    expect(report.error).toContain('ninguna operación')
  })

  it('props fuera de rango se recortan en lugar de tumbar el lote', () => {
    const e = makeFullEditor()
    apply(e, [{ do: 'insertBlock', args: { type: 'image', props: { src: 'https://x.ar/p.png', width: 5000 } } }])
    const img = Object.values(e.doc.blocks).find((b) => b.type === 'image')!
    expect(img.props!.width).toBe(100)
  })

  it('un valor que no está entre las opciones no entra', () => {
    const e = makeFullEditor()
    apply(e, [{ do: 'insertBlock', args: { type: 'evidence', props: { media: 'telepatia' } } }])
    const ev = Object.values(e.doc.blocks).find((b) => b.type === 'evidence')!
    expect(ev.props!.media).toBe('photo')
  })
})

describe('escribir en markdown', () => {
  it('reemplaza todo cuando se lo pide', () => {
    const e = makeFullEditor()
    authorMarkdown(e, 'antes')
    authorMarkdown(e, '# Nuevo', 'replace')
    expect(sketch(e)).toEqual(['heading_1: Nuevo'])
  })

  it('agrega al final por defecto', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '# uno', 'replace')
    authorMarkdown(e, '# dos')
    expect(sketch(e)).toEqual(['heading_1: uno', 'heading_1: dos'])
  })

  it('un markdown sin contenido no cambia nada', () => {
    const e = makeFullEditor()
    expect(authorMarkdown(e, '   \n\n').ok).toBe(false)
  })
})

describe('escribir bloques armados', () => {
  it('mete un árbol entero', () => {
    const e = makeFullEditor()
    const report = authorBlocks(e, [
      {
        type: 'toggle',
        text: [{ text: 'La pista' }],
        children: [{ type: 'paragraph', text: [{ text: 'medí primero el largo' }] }],
      },
    ])
    expect(report.ok).toBe(true)
    expect(sketch(e)).toEqual(['paragraph', 'toggle: La pista', '  paragraph: medí primero el largo'])
  })

  it('se puede colgar de un bloque que ya está', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '> La pista', 'replace')
    const toggle = Object.values(e.doc.blocks).find((b) => b.type === 'quote')!
    authorBlocks(e, [{ type: 'paragraph', text: [{ text: 'adentro' }] }], toggle.id)
    expect(sketch(e)).toEqual(['quote: La pista', '  paragraph: adentro'])
  })

  it('un padre que no existe se rechaza con un mensaje y no con una excepción', () => {
    const e = makeFullEditor()
    const report = authorBlocks(e, [{ type: 'paragraph' }], 'fantasma')
    expect(report.ok).toBe(false)
    expect(report.error).toContain('fantasma')
  })

  it('el texto de una consigna acepta formato', () => {
    const e = makeFullEditor()
    authorBlocks(e, [
      { type: 'choice', text: [{ text: '¿Cuál es ' }, { text: 'más largo', marks: [{ type: 'bold' }] }, { text: '?' }], props: { options: [[{ text: 'el patio' }], [{ text: 'el aula' }]], correct: 0 } },
    ])
    const choice = Object.values(e.doc.blocks).find((b) => b.type === 'choice')!
    expect(plain(choice.text)).toBe('¿Cuál es más largo?')
    expect(choice.text![1]!.marks).toEqual([{ type: 'bold' }])
  })
})

describe('en solo lectura el agente tampoco escribe', () => {
  it('un lote se rechaza, y lo dice', () => {
    const e = makeFullEditor(undefined, { readOnly: true })
    const antes = toJSON(e.doc)
    const report = apply(e, [{ do: 'insertBlock', args: { type: 'heading_1', text: [{ text: 'Título' }] } }])
    expect(report.ok).toBe(false)
    expect(report.error).toContain('solo lectura')
    expect(toJSON(e.doc)).toEqual(antes)
  })

  it('markdown tampoco', () => {
    const e = makeFullEditor(undefined, { readOnly: true })
    expect(authorMarkdown(e, '# Puesto por la máquina').ok).toBe(false)
  })

  it('y cuando deja de ser solo lectura, escribe', () => {
    const e = makeFullEditor(undefined, { readOnly: true })
    expect(authorMarkdown(e, '# Uno').ok).toBe(false)
    e.readOnly = false
    expect(authorMarkdown(e, '# Uno').ok).toBe(true)
    expect(sketch(e)).toContain('heading_1: Uno')
  })
})

describe('el agente y una persona comparten el mismo motor', () => {
  it('lo que hace el agente se deshace con el mismo deshacer', () => {
    const e = makeFullEditor()
    const antes = toJSON(e.doc)
    authorMarkdown(e, '# Puesto por la máquina')
    e.undo()
    expect(toJSON(e.doc)).toEqual(antes)
  })

  it('un bloque del agente se edita igual que cualquier otro', () => {
    const e = makeFullEditor()
    authorMarkdown(e, '# Título de la máquina', 'replace')
    const id = Object.values(e.doc.blocks).find((b) => b.type === 'heading_1')!.id
    e.setSelection({ kind: 'text', anchor: { block: id, offset: 6 }, head: { block: id, offset: 6 } })
    e.run('insertText', { text: 'zo' })
    expect(plain(e.block(id)!.text)).toBe('Títulozo de la máquina')
  })
})
