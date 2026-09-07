import { describe, expect, it } from 'vitest'
import {
  docFromJSON,
  fromHtml,
  fromJSON,
  fromMarkdown,
  textFromMarkdown,
  textToMarkdown,
  toHtml,
  toJSON,
  toMarkdown,
  toPlainText,
} from './serialize.ts'
import { assertValid } from './doc.ts'
import { plain } from './text.ts'
import { makeFullEditor } from '../test/engine.ts'

const round = (md: string) => toMarkdown(docFromJSON(fromJSON(fromMarkdown(md))))

describe('JSON', () => {
  it('el árbol de ida y de vuelta es el mismo', () => {
    const e = makeFullEditor(fromMarkdown('# Medir\n\n- uno\n  - anidado\n\n> nota'))
    const json = toJSON(e.doc)
    const back = docFromJSON(json)
    assertValid(back)
    expect(toJSON(back)).toEqual(json)
  })

  it('conserva los ids, así lo que apunta a un bloque sigue apuntando', () => {
    const doc = docFromJSON([{ id: 'fijo', type: 'paragraph', text: [{ text: 'x' }] }])
    expect(doc.blocks['fijo']).toBeDefined()
    expect(toJSON(doc)[0]!.id).toBe('fijo')
  })

  it('no guarda props vacías', () => {
    const doc = docFromJSON([{ type: 'paragraph', text: [], props: {} }])
    expect(toJSON(doc)[0]!.props).toBeUndefined()
  })

  it('un bloque sin texto no inventa un campo de texto', () => {
    const doc = docFromJSON([{ type: 'divider' }])
    expect(toJSON(doc)[0]!.text).toBeUndefined()
  })
})

describe('markdown de salida', () => {
  it('los títulos salen con sus almohadillas', () => {
    expect(round('# uno\n## dos\n### tres')).toBe('# uno\n## dos\n### tres')
  })

  it('una lista numerada se numera sola', () => {
    expect(round('- a\n- b')).toBe('- a\n- b')
    expect(round('1. a\n1. b\n1. c')).toBe('1. a\n2. b\n3. c')
  })

  it('la numeración arranca donde diga el bloque', () => {
    expect(round('5. a\n1. b')).toBe('5. a\n6. b')
  })

  it('un checklist sale con su casilla', () => {
    expect(round('- [x] hecho\n- [ ] falta')).toBe('- [x] hecho\n- [ ] falta')
  })

  it('el anidado sale como sangría', () => {
    expect(round('- uno\n  - dos')).toBe('- uno\n  - dos')
  })

  it('el formato en línea vuelve como estaba', () => {
    expect(textToMarkdown(textFromMarkdown('**a** *b* `c` ~~d~~'))).toBe('**a** *b* `c` ~~d~~')
  })

  it('un link se conserva', () => {
    expect(round('[la página](https://educabot.com)')).toBe('[la página](https://educabot.com)')
  })

  it('lo que parecería markup queda escapado y vuelve igual', () => {
    const rt = textFromMarkdown('un \\*asterisco\\* literal')
    expect(plain(rt)).toBe('un *asterisco* literal')
    expect(textToMarkdown(rt)).toBe('un \\*asterisco\\* literal')
  })

  it('adentro de código no se escapa nada', () => {
    const rt = textFromMarkdown('`a*b`')
    expect(plain(rt)).toBe('a*b')
    expect(textToMarkdown(rt)).toBe('`a*b`')
  })

  it('un bloque de código sale con su cerca y su lenguaje', () => {
    expect(round('```python\nprint(1)\n```')).toBe('```python\nprint(1)\n```')
  })

  it('una tabla sale con su fila de guiones', () => {
    const md = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    expect(round(md)).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |')
  })

  it('una imagen sale como imagen', () => {
    expect(round('![un patio](https://x.ar/p.png)')).toBe('![un patio](https://x.ar/p.png)')
  })

  it('un tipo que markdown no conoce se anuncia y no se pierde', () => {
    const doc = docFromJSON([{ type: 'choice', text: [{ text: '¿Cuánto mide?' }], props: { correct: 1 } }])
    expect(toMarkdown(doc)).toBe('**[choice]** ¿Cuánto mide?')
  })

  it('el texto llano es una línea por bloque', () => {
    const doc = docFromJSON(fromJSON(fromMarkdown('# uno\n\ndos\n\n- tres')))
    expect(toPlainText(doc)).toBe('uno\ndos\ntres')
  })
})

describe('markdown de entrada', () => {
  it('lee lo que escribe un modelo sin que se lo enseñen', () => {
    const blocks = fromMarkdown(`# Medir el patio

Salimos con la cinta.

1. Medir el largo
2. Medir el ancho

- [ ] traer la cinta
- [x] anotar

> Ojo con el cordón

\`\`\`python
print(largo * ancho)
\`\`\`

---

![el patio](https://x.ar/patio.jpg)`)
    expect(blocks.map((b) => b.type)).toEqual([
      'heading_1',
      'paragraph',
      'numbered_list',
      'numbered_list',
      'todo',
      'todo',
      'quote',
      'code',
      'divider',
      'image',
    ])
  })

  it('los renglones vacíos no crean bloques vacíos', () => {
    expect(fromMarkdown('a\n\n\n\nb')).toHaveLength(2)
  })

  it('dos espacios de sangría son un nivel', () => {
    const [root] = fromMarkdown('- uno\n  - dos\n    - tres')
    expect(root!.children?.[0]?.children?.[0]?.type).toBe('bulleted_list')
  })

  it('adentro de una cerca de código no se interpreta nada', () => {
    const [code] = fromMarkdown('```\n# no es un título\n- ni una lista\n```')
    expect(code!.type).toBe('code')
    expect(plain(code!.text)).toBe('# no es un título\n- ni una lista')
  })

  it('una cita que arranca con emoji es un destacado, como los exporta Notion', () => {
    const [callout] = fromMarkdown('> 💡 Ojo con esto')
    expect(callout!.type).toBe('callout')
    expect(callout!.props).toMatchObject({ emoji: '💡' })
    expect(plain(callout!.text)).toBe('Ojo con esto')
  })

  it('una tabla llega con sus celdas como bloques', () => {
    const [table] = fromMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(table!.type).toBe('table')
    expect(table!.children).toHaveLength(2)
    expect(table!.children![0]!.children).toHaveLength(2)
  })

  it('una fórmula entre doble dólar es un bloque de fórmula', () => {
    const [math] = fromMarkdown('$$a^2 + b^2 = c^2$$')
    expect(math!.type).toBe('math')
    expect(math!.props).toMatchObject({ latex: 'a^2 + b^2 = c^2' })
  })

  it('markdown vacío no devuelve nada', () => {
    expect(fromMarkdown('')).toEqual([])
    expect(fromMarkdown('\n\n  \n')).toEqual([])
  })
})

describe('HTML de salida', () => {
  const html = (md: string) => toHtml(docFromJSON(fromJSON(fromMarkdown(md))))

  it('los títulos y párrafos salen con su etiqueta', () => {
    expect(html('# uno\n\ndos')).toBe('<h1 data-type="heading_1">uno</h1><p data-type="paragraph">dos</p>')
  })

  it('una corrida de ítems se vuelve una sola lista', () => {
    expect(html('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
    expect(html('1. a\n1. b')).toBe('<ol><li>a</li><li>b</li></ol>')
  })

  it('el formato sale como etiquetas de verdad', () => {
    expect(html('**a** *b* `c`')).toContain('<strong>a</strong>')
    expect(html('**a** *b* `c`')).toContain('<em>b</em>')
    expect(html('**a** *b* `c`')).toContain('<code>c</code>')
  })

  it('lo que podría ser markup se escapa', () => {
    const doc = docFromJSON([{ type: 'paragraph', text: [{ text: '<script>alert(1)</script>' }] }])
    expect(toHtml(doc)).not.toContain('<script>')
    expect(toHtml(doc)).toContain('&lt;script&gt;')
  })

  it('una imagen sale con su ancho', () => {
    const doc = docFromJSON([{ type: 'image', props: { src: 'https://x.ar/p.png', width: 60, alt: 'p' } }])
    expect(toHtml(doc)).toContain('width:60%')
  })

  it('una tabla sale con encabezado cuando lo tiene', () => {
    expect(html('| a |\n| --- |\n| 1 |')).toContain('<thead>')
  })
})

describe('HTML de entrada', () => {
  it('lee lo que pega un navegador', () => {
    const blocks = fromHtml('<h1>Medir</h1><p>Con la <b>cinta</b></p><ul><li>uno</li><li>dos</li></ul>')
    expect(blocks.map((b) => b.type)).toEqual(['heading_1', 'paragraph', 'bulleted_list', 'bulleted_list'])
    expect(blocks[1]!.text!.at(-1)!.marks).toEqual([{ type: 'bold' }])
  })

  it('los divs que solo envuelven no agregan bloques', () => {
    const blocks = fromHtml('<div><div><p>uno</p><p>dos</p></div></div>')
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph'])
  })

  it('un font-weight en línea también es negrita: así pega Google Docs', () => {
    const blocks = fromHtml('<p><span style="font-weight:700">fuerte</span></p>')
    expect(blocks[0]!.text![0]!.marks).toEqual([{ type: 'bold' }])
  })

  it('una lista con casillas llega como checklist', () => {
    const blocks = fromHtml('<ul><li><input type="checkbox" checked>hecho</li></ul>')
    expect(blocks[0]!.type).toBe('todo')
    expect(blocks[0]!.props).toMatchObject({ checked: true })
  })

  it('una lista anidada llega anidada', () => {
    const blocks = fromHtml('<ul><li>uno<ul><li>dos</li></ul></li></ul>')
    expect(blocks[0]!.children?.[0]?.type).toBe('bulleted_list')
  })

  it('una figura con epígrafe llega como imagen con epígrafe', () => {
    const blocks = fromHtml('<figure><img src="https://x.ar/p.png" alt="p"><figcaption>el patio</figcaption></figure>')
    expect(blocks[0]!.type).toBe('image')
    expect(plain(blocks[0]!.props!.caption as never)).toBe('el patio')
  })

  it('un details llega como desplegable', () => {
    const blocks = fromHtml('<details open><summary>La pista</summary><p>medí primero</p></details>')
    expect(blocks[0]!.type).toBe('toggle')
    expect(blocks[0]!.props).toMatchObject({ open: true })
    expect(blocks[0]!.children?.[0]?.type).toBe('paragraph')
  })

  it('una tabla llega rectangular aunque le falten celdas', () => {
    const blocks = fromHtml('<table><tr><th>a</th><th>b</th></tr><tr><td>1</td></tr></table>')
    expect(blocks[0]!.children![1]!.children).toHaveLength(2)
  })

  it('lo que no se reconoce no se pierde', () => {
    const blocks = fromHtml('<article><span>algo suelto</span></article>')
    expect(plain(blocks[0]?.text)).toContain('algo suelto')
  })

  it('un HTML vacío no devuelve nada', () => {
    expect(fromHtml('')).toEqual([])
  })
})
