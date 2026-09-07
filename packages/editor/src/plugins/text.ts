/**
 * The text plugin: the blocks a page is mostly made of, and the keys and typing rules that make
 * them appear without opening a menu.
 *
 * Headings are three types and not one type with a level, which is the choice Notion made and it
 * pays off everywhere downstream: the insert menu is the list of types, `Mod-Alt-2` is one
 * binding, "## " is one rule, and turning a heading into a list is one command with no props to
 * reconcile. The document format the platform stores maps them back to a level, and that mapping
 * lives in the serialiser where it belongs.
 */

import type { BlockSpec, PropSpec } from '../core/schema.ts'
import type { InputRule, KeyBinding, Plugin } from '../core/plugins.ts'
import { insertBlock, setBlockType, type Command } from '../core/commands.ts'
import { caret } from '../core/selection.ts'
import { getBlock, textLength } from '../core/doc.ts'
import { remove as removeText, setMark, slice as sliceText, concat, plain } from '../core/text.ts'

/** Colour and alignment, shared by every block that shows text. Values are token names. */
export const TONES = ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const

const STYLE_PROPS: Record<string, PropSpec> = {
  color: { kind: 'string', options: TONES, label: 'Color del texto' },
  bg: { kind: 'string', options: TONES, label: 'Fondo' },
  align: { kind: 'string', options: ['left', 'center', 'right'], label: 'Alineación' },
}

const SIZE_PROP: Record<string, PropSpec> = {
  size: { kind: 'string', options: ['sm', 'base', 'lg'], label: 'Tamaño' },
}

/** Everything textual can hold everything textual: that is what indentation is. */
const NESTS = { container: true as const, draggable: true, selectable: true }

export const textBlocks: BlockSpec[] = [
  {
    type: 'paragraph',
    name: 'Texto',
    hint: 'Consigna, contexto, explicación',
    group: 'Básicos',
    keywords: ['parrafo', 'texto', 'p'],
    icon: 'text',
    content: 'text',
    placeholder: 'Escribí algo, o apretá "/" para elegir un bloque',
    props: { ...STYLE_PROPS, ...SIZE_PROP },
    ...NESTS,
  },
  {
    type: 'heading_1',
    name: 'Título 1',
    hint: 'Separa las partes grandes de una fase',
    group: 'Básicos',
    keywords: ['titulo', 'encabezado', 'h1'],
    icon: 'h1',
    content: 'text',
    placeholder: 'Título',
    split: { end: 'paragraph', empty: 'paragraph' },
    backspace: 'paragraph',
    props: { ...STYLE_PROPS, toggleable: { kind: 'boolean', default: false, label: 'Se puede plegar' } },
    ...NESTS,
  },
  {
    type: 'heading_2',
    name: 'Título 2',
    hint: 'Un apartado dentro de una parte',
    group: 'Básicos',
    keywords: ['subtitulo', 'h2'],
    icon: 'h2',
    content: 'text',
    placeholder: 'Título',
    split: { end: 'paragraph', empty: 'paragraph' },
    backspace: 'paragraph',
    props: { ...STYLE_PROPS, toggleable: { kind: 'boolean', default: false, label: 'Se puede plegar' } },
    ...NESTS,
  },
  {
    type: 'heading_3',
    name: 'Título 3',
    hint: 'El nivel más chico',
    group: 'Básicos',
    keywords: ['subtitulo', 'h3'],
    icon: 'h3',
    content: 'text',
    placeholder: 'Título',
    split: { end: 'paragraph', empty: 'paragraph' },
    backspace: 'paragraph',
    props: { ...STYLE_PROPS, toggleable: { kind: 'boolean', default: false, label: 'Se puede plegar' } },
    ...NESTS,
  },
  {
    type: 'bulleted_list',
    name: 'Lista',
    hint: 'Materiales o ideas, una por línea',
    group: 'Básicos',
    keywords: ['vineta', 'bullet', 'puntos', 'ul'],
    icon: 'list',
    content: 'text',
    placeholder: 'Lista',
    split: { empty: 'paragraph' },
    backspace: 'paragraph',
    props: STYLE_PROPS,
    ...NESTS,
  },
  {
    type: 'numbered_list',
    name: 'Lista numerada',
    hint: 'Pasos en orden: el número se cuenta solo',
    group: 'Básicos',
    keywords: ['numeros', 'pasos', 'ol', 'ordenada'],
    icon: 'listOrdered',
    content: 'text',
    placeholder: 'Paso',
    split: { empty: 'paragraph' },
    backspace: 'paragraph',
    props: { ...STYLE_PROPS, start: { kind: 'number', min: 1, label: 'Empieza en' } },
    ...NESTS,
  },
  {
    type: 'todo',
    name: 'Checklist',
    hint: 'Algo que se tilda al hacerlo',
    group: 'Básicos',
    keywords: ['tarea', 'checkbox', 'tildar', 'pendiente'],
    icon: 'check',
    content: 'text',
    placeholder: 'Por hacer',
    split: { empty: 'paragraph' },
    backspace: 'paragraph',
    props: { ...STYLE_PROPS, checked: { kind: 'boolean', default: false, label: 'Hecho' } },
    ...NESTS,
  },
  {
    type: 'toggle',
    name: 'Desplegable',
    hint: 'Esconde la pista o la respuesta hasta que se abre',
    group: 'Básicos',
    keywords: ['plegable', 'acordeon', 'pista', 'spoiler', 'respuesta'],
    icon: 'chevron',
    content: 'text',
    placeholder: 'Desplegable',
    split: { empty: 'paragraph' },
    backspace: 'paragraph',
    props: { ...STYLE_PROPS, open: { kind: 'boolean', default: false, label: 'Abierto' } },
    ...NESTS,
  },
  {
    type: 'quote',
    name: 'Cita',
    hint: 'Palabras de otro, con su marca al costado',
    group: 'Básicos',
    keywords: ['cita', 'blockquote', 'comillas'],
    icon: 'quote',
    content: 'text',
    placeholder: 'Cita',
    split: { end: 'paragraph', empty: 'paragraph' },
    backspace: 'paragraph',
    props: STYLE_PROPS,
    ...NESTS,
  },
  {
    type: 'callout',
    name: 'Destacado',
    hint: 'Algo que no se puede pasar por alto',
    group: 'Básicos',
    keywords: ['aviso', 'nota', 'importante', 'atencion'],
    icon: 'callout',
    content: 'text',
    placeholder: 'Lo importante',
    split: { end: 'paragraph', empty: 'paragraph' },
    props: {
      ...STYLE_PROPS,
      emoji: { kind: 'string', default: '💡', label: 'Ícono' },
      tone: { kind: 'string', options: TONES, default: 'yellow', label: 'Tono' },
    },
    ...NESTS,
  },
  {
    type: 'code',
    name: 'Código',
    hint: 'Un programa, tal como se escribe',
    group: 'Básicos',
    keywords: ['codigo', 'programa', 'monospace', 'python', 'scratch'],
    icon: 'code',
    content: 'text',
    placeholder: 'código',
    // Sin marcas: negrita dentro de un programa no significa nada y ensucia lo que se copia.
    marks: false,
    split: { middle: 'code' },
    props: {
      language: { kind: 'string', default: 'python', label: 'Lenguaje' },
      wrap: { kind: 'boolean', default: true, label: 'Cortar las líneas largas' },
      caption: { kind: 'text', label: 'Epígrafe' },
    },
    container: false,
    draggable: true,
    selectable: true,
  },
  {
    type: 'divider',
    name: 'Separador',
    hint: 'Una línea, para cambiar de tema',
    group: 'Básicos',
    keywords: ['linea', 'hr', 'separar', 'corte'],
    icon: 'divider',
    content: 'none',
    container: false,
    standalone: true,
    draggable: true,
    selectable: true,
  },
]

// ---------------------------------------------------------------------------- keys

const mark = (key: string, type: string, label: string): KeyBinding => ({
  key,
  run: 'toggleMark',
  args: { type },
  label,
})

const block = (key: string, type: string, label: string): KeyBinding => ({
  key,
  run: 'setBlockType',
  args: { type },
  label,
})

export const textKeys: KeyBinding[] = [
  { key: 'Enter', run: 'splitBlock', label: 'Bloque nuevo' },
  { key: 'Shift-Enter', run: 'insertSoftBreak', label: 'Renglón dentro del bloque' },
  { key: 'Backspace', run: 'deleteBackward' },
  { key: 'Delete', run: 'deleteForward' },
  { key: 'Mod-Backspace', run: 'deleteWordBackward' },
  { key: 'Tab', run: 'indent', label: 'Anidar' },
  { key: 'Shift-Tab', run: 'outdent', label: 'Sacar un nivel' },
  { key: 'Escape', run: 'selectEnclosingBlock', label: 'Seleccionar el bloque' },
  { key: 'Mod-a', run: 'selectAllStep', label: 'Seleccionar el bloque, y de nuevo toda la página' },

  mark('Mod-b', 'bold', 'Negrita'),
  mark('Mod-i', 'italic', 'Cursiva'),
  mark('Mod-u', 'underline', 'Subrayado'),
  mark('Mod-Shift-s', 'strike', 'Tachado'),
  mark('Mod-e', 'code', 'Código'),
  { key: 'Mod-Shift-h', run: 'toggleMark', args: { type: 'bg', value: 'yellow' }, label: 'Resaltar' },
  { key: 'Mod-Shift-c', run: 'clearFormatting', label: 'Quitar el formato' },

  block('Mod-Alt-0', 'paragraph', 'Texto'),
  block('Mod-Alt-1', 'heading_1', 'Título 1'),
  block('Mod-Alt-2', 'heading_2', 'Título 2'),
  block('Mod-Alt-3', 'heading_3', 'Título 3'),
  block('Mod-Alt-4', 'bulleted_list', 'Lista'),
  block('Mod-Alt-5', 'numbered_list', 'Lista numerada'),
  block('Mod-Alt-6', 'todo', 'Checklist'),
  block('Mod-Alt-7', 'quote', 'Cita'),
  block('Mod-Alt-8', 'callout', 'Destacado'),
  block('Mod-Alt-9', 'code', 'Código'),

  { key: 'Mod-d', run: 'duplicateBlock', label: 'Duplicar el bloque' },
  { key: 'Mod-Shift-ArrowUp', run: 'moveUp', label: 'Subir el bloque' },
  { key: 'Mod-Shift-ArrowDown', run: 'moveDown', label: 'Bajar el bloque' },
  { key: 'Mod-Alt-t', run: 'insertBlock', args: { type: 'divider' }, label: 'Separador' },
]

// ---------------------------------------------------------------------------- typing rules

/** Turns the block into `type` and eats the characters that triggered it. */
const becomes = (type: string, props?: Record<string, unknown>): InputRule['run'] =>
  ({ ctx, id, to }) => {
    const b = getBlock(ctx.tr.doc, id)
    if (!b || b.type === type) return false
    if (!setBlockType(ctx, { type, id, props })) return false
    ctx.tr.setText(id, removeText(b.text ?? [], 0, to))
    ctx.tr.select(caret(id, 0))
    return true
  }

/** Wraps the captured group in a mark and drops the punctuation around it. */
const wraps = (type: 'bold' | 'italic' | 'code' | 'strike' | 'bg', value?: string): InputRule['run'] =>
  ({ ctx, id, match, from, to }) => {
    const inner = match[1]
    if (inner === undefined || inner === '') return false
    const b = getBlock(ctx.tr.doc, id)
    if (!b || !ctx.state.schema.allowsMark(b.type, type)) return false
    const text = b.text ?? []
    const openLen = match[0].indexOf(inner)
    const innerFrom = from + openLen
    const kept = concat(
      sliceText(text, 0, from),
      setMark(sliceText(text, innerFrom, innerFrom + inner.length), 0, inner.length, value === undefined ? { type } : { type, value }),
      sliceText(text, to, textLength(ctx.tr.doc, id)),
    )
    ctx.tr.setText(id, kept)
    ctx.tr.select(caret(id, from + inner.length))
    // Se cierra la marca: escribir `**algo**` y seguir escribiendo no puede quedar en negrita
    // para siempre. El caret queda justo afuera de lo que se marcó.
    ctx.tr.setStoredMarks([])
    return true
  }

export const textRules: InputRule[] = [
  { name: 'h1', match: /^# $/, run: becomes('heading_1') },
  { name: 'h2', match: /^## $/, run: becomes('heading_2') },
  { name: 'h3', match: /^### $/, run: becomes('heading_3') },
  { name: 'bulleted', match: /^[-*+] $/, run: becomes('bulleted_list') },
  {
    name: 'numbered',
    match: /^(\d{1,3})[.)] $/,
    run: ({ ctx, id, match, to }) => {
      const start = Number(match[1])
      const props = start > 1 ? { start } : undefined
      return becomes('numbered_list', props)({ ctx, id, match, from: 0, to })
    },
  },
  { name: 'todo', match: /^\[[ xX]?\] $/, run: becomes('todo') },
  // Cada una con su carácter: si la cita también tomara "> ", el desplegable no llegaría nunca.
  { name: 'quote', match: /^["|] $/, run: becomes('quote') },
  { name: 'toggle', match: /^> $/, run: becomes('toggle') },
  { name: 'callout', match: /^!! $/, run: becomes('callout') },
  {
    name: 'code',
    match: /^```([a-zA-Z0-9+#-]*) $/,
    run: ({ ctx, id, match, to }) =>
      becomes('code', match[1] ? { language: match[1] } : undefined)({ ctx, id, match, from: 0, to }),
  },
  {
    name: 'divider',
    match: /^(---|\*\*\*|___) $/,
    run: ({ ctx, id }) => {
      const b = getBlock(ctx.tr.doc, id)
      if (!b) return false
      // El párrafo se convierte en la línea, y abajo queda otro: un separador nunca es lo último
      // que alguien quiso escribir, y sin esto el caret se queda sin dónde ir.
      ctx.tr.setText(id, [])
      if (!setBlockType(ctx, { type: 'divider', id, props: null })) return false
      return insertBlock(ctx, { type: 'paragraph', target: id, at: 'after', focus: true })
    },
  },

  // Las de formato van después: una línea que empieza con "*" es una lista, no una cursiva.
  { name: 'bold', match: /\*\*([^*\n]+)\*\*$/, run: wraps('bold'), priority: 10 },
  { name: 'bold-alt', match: /__([^_\n]+)__$/, run: wraps('bold'), priority: 10 },
  { name: 'italic', match: /(?<![*\w])\*([^*\n]+)\*$/, run: wraps('italic'), priority: 11 },
  { name: 'italic-alt', match: /(?<![_\w])_([^_\n]+)_$/, run: wraps('italic'), priority: 11 },
  { name: 'strike', match: /~~([^~\n]+)~~$/, run: wraps('strike'), priority: 10 },
  { name: 'code-inline', match: /`([^`\n]+)`$/, run: wraps('code'), priority: 10 },
  { name: 'highlight', match: /==([^=\n]+)==$/, run: wraps('bg', 'yellow'), priority: 10 },
  {
    name: 'autolink',
    match: /(https?:\/\/[^\s]+)\s$/,
    priority: 12,
    run: ({ ctx, id, match, from, to }) => {
      const href = match[1]
      if (!href) return false
      const b = getBlock(ctx.tr.doc, id)
      if (!b) return false
      const text = b.text ?? []
      const linked = setMark(text, from, from + href.length, { type: 'link', value: href })
      ctx.tr.setText(id, linked)
      ctx.tr.select(caret(id, to))
      return true
    },
  },
]

// ---------------------------------------------------------------------------- commands

/** Tilda o destilda un checklist sin mover el caret. */
const toggleChecked: Command<{ id: string }> = ({ tr }, { id }) => {
  const b = getBlock(tr.doc, id)
  if (!b || b.type !== 'todo') return false
  tr.setProps(id, { checked: !b.props?.checked })
  return true
}

/** Abre o cierra un desplegable. Es props, no estado de vista: se guarda con el documento. */
const toggleOpen: Command<{ id: string }> = ({ tr }, { id }) => {
  const b = getBlock(tr.doc, id)
  if (!b) return false
  tr.setProps(id, { open: !b.props?.open })
  return true
}

/**
 * Keeps the plugin's own promises. Two of them: a divider never holds children, because you
 * cannot see them, and a code block never holds marks, because a paste can bring them in.
 */
const normalizeText: Plugin['normalize'] = ({ tr, state, touched }) => {
  for (const id of touched) {
    const b = tr.doc.blocks[id]
    if (!b) continue
    if (b.type === 'divider' && b.children.length > 0) tr.liftChildren(id)
    if (state.schema.spec(b.type)?.marks === false && b.text?.some((s) => s.marks?.length)) {
      tr.setText(id, [{ text: plain(b.text) }])
    }
  }
}

export const text = (): Plugin => ({
  name: 'text',
  blocks: textBlocks,
  keys: textKeys,
  rules: textRules,
  commands: { toggleChecked: toggleChecked as Command<never>, toggleOpen: toggleOpen as Command<never> },
  normalize: normalizeText,
})
