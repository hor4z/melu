/**
 * The layout plugin: blocks whose job is to arrange other blocks.
 *
 * A cell is a block. That is the decision this whole file rests on, and the alternative was
 * tempting: Notion keeps the cells of a simple table as an array of rich text inside the row, and
 * it is fewer objects. But then a cell is not a block, so none of the engine reaches it. No bold
 * inside a cell without a second code path for marks, no "/" menu, no input rules, no caret
 * walking out of the table with the arrow keys. Making a cell a block costs a table of five by
 * four twenty five entries in a flat map, which is nothing, and every command already written
 * works inside it for free.
 *
 * Columns are the same shape, and the width of a column is a fraction, not a pixel count, which
 * is what lets the same page put its two columns side by side on a projector and stack them on a
 * phone with one media query and no second layout.
 */

import type { BlockSpec } from '../core/schema.ts'
import type { KeyBinding, Plugin } from '../core/plugins.ts'
import type { Command } from '../core/commands.ts'
import { insertBlock } from '../core/commands.ts'
import { childrenOf, getBlock, indexOf, parentOf, type BlockId, type BlockInit } from '../core/doc.ts'
import { caret } from '../core/selection.ts'

const CELL_TYPE = 'table_cell'
const ROW_TYPE = 'table_row'

export const layoutBlocks: BlockSpec[] = [
  {
    type: 'table',
    name: 'Tabla',
    hint: 'Filas y columnas: una comparación, una toma de datos',
    group: 'Estructura',
    keywords: ['tabla', 'cuadro', 'filas', 'columnas', 'grilla', 'datos'],
    icon: 'table',
    content: 'none',
    container: { only: [ROW_TYPE] },
    draggable: true,
    selectable: true,
    standalone: true,
    props: {
      header: { kind: 'boolean', default: true, label: 'Primera fila de encabezado' },
      headerColumn: { kind: 'boolean', default: false, label: 'Primera columna de encabezado' },
      /** Anchos relativos por columna. Vacío quiere decir que se reparten en partes iguales. */
      widths: { kind: 'list', of: { kind: 'number', min: 4 }, default: [], label: 'Anchos' },
      caption: { kind: 'text', label: 'Epígrafe' },
    },
  },
  {
    type: ROW_TYPE,
    name: 'Fila',
    // Sin grupo: no aparece en el menú, solo existe dentro de una tabla.
    content: 'none',
    container: { only: [CELL_TYPE] },
    draggable: false,
    selectable: false,
  },
  {
    type: CELL_TYPE,
    name: 'Celda',
    content: 'text',
    container: false,
    draggable: false,
    selectable: false,
    placeholder: '',
    // Enter dentro de una celda no puede crear otra celda: la tecla la maneja el keymap de tabla.
    split: { middle: CELL_TYPE },
    props: {
      align: { kind: 'string', options: ['left', 'center', 'right'], label: 'Alineación' },
      bg: { kind: 'string', label: 'Fondo' },
    },
  },
  {
    type: 'columns',
    name: 'Columnas',
    hint: 'Dos o tres cosas al lado de la otra',
    group: 'Estructura',
    keywords: ['columnas', 'lado', 'dividir', 'mitades', 'grilla'],
    icon: 'columns',
    content: 'none',
    container: { only: ['column'] },
    draggable: true,
    selectable: true,
    standalone: true,
    props: {
      /** En pantalla angosta las columnas se apilan; debajo de esto, siempre. */
      stackBelow: { kind: 'number', default: 640, min: 0, max: 1400, label: 'Apilar debajo de (px)' },
      gap: { kind: 'number', default: 24, min: 0, max: 96, label: 'Separación (px)' },
    },
  },
  {
    type: 'column',
    name: 'Columna',
    content: 'none',
    container: true,
    draggable: false,
    selectable: false,
    props: { grow: { kind: 'number', default: 1, min: 0.2, max: 8, label: 'Proporción' } },
  },
  {
    type: 'table_of_contents',
    name: 'Índice',
    hint: 'La lista de títulos, armada sola',
    group: 'Estructura',
    keywords: ['indice', 'contenido', 'toc', 'titulos', 'navegacion'],
    icon: 'toc',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    standalone: true,
    props: { depth: { kind: 'number', default: 3, min: 1, max: 3, label: 'Hasta el nivel' } },
  },
  {
    type: 'timer',
    name: 'Reloj',
    hint: 'Cuánto dura la parte, contando a la vista de todos',
    group: 'Estructura',
    keywords: ['reloj', 'tiempo', 'cronometro', 'minutos', 'contrarreloj', 'duracion'],
    icon: 'timer',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    props: {
      seconds: { kind: 'number', default: 300, min: 5, max: 7200, label: 'Duración (s)' },
      label: { kind: 'string', default: '', label: 'Para qué es' },
      /** Un reloj que arranca solo apura a quien todavía está leyendo la consigna. */
      autostart: { kind: 'boolean', default: false, label: 'Arranca solo' },
      chime: { kind: 'boolean', default: true, label: 'Suena al terminar' },
    },
  },
  {
    type: 'math',
    name: 'Fórmula',
    hint: 'Una ecuación, escrita en LaTeX',
    group: 'Estructura',
    keywords: ['formula', 'ecuacion', 'latex', 'matematica', 'katex'],
    icon: 'math',
    content: 'none',
    container: false,
    draggable: true,
    selectable: true,
    standalone: true,
    props: {
      latex: { kind: 'string', default: '', label: 'LaTeX' },
      /** El renderizador lo inyecta la plataforma: este package no trae uno y no depende de nadie. */
      align: { kind: 'string', options: ['left', 'center'], default: 'center', label: 'Alineación' },
    },
  },
]

// ---------------------------------------------------------------------------- building

export const cell = (text = ''): BlockInit => ({ type: CELL_TYPE, text: text ? [{ text }] : [] })

export const row = (cells: number, texts?: readonly string[]): BlockInit => ({
  type: ROW_TYPE,
  children: Array.from({ length: cells }, (_, i) => cell(texts?.[i] ?? '')),
})

export const table = (rows = 3, cols = 3): BlockInit => ({
  type: 'table',
  children: Array.from({ length: rows }, () => row(cols)),
})

export const columns = (count = 2): BlockInit => ({
  type: 'columns',
  children: Array.from({ length: count }, () => ({ type: 'column', children: [{ type: 'paragraph', text: [] }] })),
})

// ---------------------------------------------------------------------------- geometry

/** How wide the table is, taken from its first row: the rows are kept in step by `normalize`. */
export function tableWidth(doc: Parameters<typeof childrenOf>[0], id: BlockId): number {
  const first = childrenOf(doc, id)[0]
  return first ? childrenOf(doc, first).length : 0
}

/** Where a cell sits, so a command can talk in rows and columns instead of ids. */
export function cellAt(doc: Parameters<typeof childrenOf>[0], id: BlockId): { table: BlockId; row: number; col: number } | undefined {
  const rowId = parentOf(doc, id)
  if (!rowId) return undefined
  const tableId = parentOf(doc, rowId)
  if (!tableId) return undefined
  return { table: tableId, row: indexOf(doc, rowId), col: indexOf(doc, id) }
}

// ---------------------------------------------------------------------------- commands

const insertTable: Command<{ rows?: number; cols?: number }> = (ctx, { rows = 3, cols = 3 } = {}) => {
  const built = table(Math.max(1, rows), Math.max(1, cols))
  if (!insertBlock(ctx, { type: 'table', children: built.children, focus: false })) return false
  // El caret va a la primera celda: una tabla recién puesta se empieza a llenar arriba a la izquierda.
  const made = [...ctx.tr.touched].find((id) => getBlock(ctx.tr.doc, id)?.type === 'table')
  const firstCell = made ? childrenOf(ctx.tr.doc, childrenOf(ctx.tr.doc, made)[0] ?? '')[0] : undefined
  if (firstCell) ctx.tr.select(caret(firstCell, 0))
  return true
}

const insertColumns: Command<{ count?: number }> = (ctx, { count = 2 } = {}) => {
  const built = columns(Math.max(2, Math.min(count, 5)))
  if (!insertBlock(ctx, { type: 'columns', children: built.children, focus: false })) return false
  const made = [...ctx.tr.touched].find((id) => getBlock(ctx.tr.doc, id)?.type === 'columns')
  const firstPara = made ? childrenOf(ctx.tr.doc, childrenOf(ctx.tr.doc, made)[0] ?? '')[0] : undefined
  if (firstPara) ctx.tr.select(caret(firstPara, 0))
  return true
}

const addRow: Command<{ id: BlockId; where?: 'before' | 'after' }> = ({ tr }, { id, where = 'after' }) => {
  const at = cellAt(tr.doc, id) ?? (getBlock(tr.doc, id)?.type === 'table' ? { table: id, row: -1, col: 0 } : undefined)
  if (!at) return false
  const cols = tableWidth(tr.doc, at.table) || 1
  const index = at.row === -1 ? childrenOf(tr.doc, at.table).length : at.row + (where === 'after' ? 1 : 0)
  const made = tr.insert(at.table, index, row(cols))
  const first = childrenOf(tr.doc, made)[0]
  if (first) tr.select(caret(first, 0))
  return true
}

const addColumn: Command<{ id: BlockId; where?: 'before' | 'after' }> = ({ tr }, { id, where = 'after' }) => {
  const at = cellAt(tr.doc, id)
  if (!at) return false
  const index = at.col + (where === 'after' ? 1 : 0)
  // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
  for (const rowId of [...childrenOf(tr.doc, at.table)]) tr.insert(rowId, index, cell())
  const rowId = childrenOf(tr.doc, at.table)[at.row]
  const landing = rowId ? childrenOf(tr.doc, rowId)[index] : undefined
  if (landing) tr.select(caret(landing, 0))
  return true
}

const removeRow: Command<{ id: BlockId }> = ({ tr }, { id }) => {
  const at = cellAt(tr.doc, id)
  if (!at) return false
  const rows = childrenOf(tr.doc, at.table)
  if (rows.length <= 1) return false
  const rowId = rows[at.row]
  if (!rowId) return false
  const landing = rows[at.row + 1] ?? rows[at.row - 1]
  tr.remove(rowId)
  const cellId = landing ? childrenOf(tr.doc, landing)[at.col] : undefined
  if (cellId) tr.select(caret(cellId, 0))
  return true
}

const removeColumn: Command<{ id: BlockId }> = ({ tr }, { id }) => {
  const at = cellAt(tr.doc, id)
  if (!at) return false
  if (tableWidth(tr.doc, at.table) <= 1) return false
  // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
  for (const rowId of [...childrenOf(tr.doc, at.table)]) {
    const target = childrenOf(tr.doc, rowId)[at.col]
    if (target) tr.remove(target)
  }
  const rowId = childrenOf(tr.doc, at.table)[at.row]
  const landing = rowId ? (childrenOf(tr.doc, rowId)[at.col] ?? childrenOf(tr.doc, rowId)[at.col - 1]) : undefined
  if (landing) tr.select(caret(landing, 0))
  return true
}

/** Tab inside a table: the next cell, and a new row when there is no next cell. */
const nextCell: Command<{ back?: boolean }> = (ctx, { back = false } = {}) => {
  const sel = ctx.state.selection
  const id = sel?.kind === 'text' ? sel.head.block : undefined
  if (!id) return false
  const at = cellAt(ctx.tr.doc, id)
  if (!at || getBlock(ctx.tr.doc, id)?.type !== CELL_TYPE) return false
  const rows = childrenOf(ctx.tr.doc, at.table)
  const cols = tableWidth(ctx.tr.doc, at.table)
  let r = at.row
  let c = at.col + (back ? -1 : 1)
  if (c >= cols) {
    c = 0
    r++
  }
  if (c < 0) {
    c = cols - 1
    r--
  }
  if (r < 0) return false
  if (r >= rows.length) {
    if (back) return false
    return addRow(ctx, { id, where: 'after' })
  }
  const rowId = rows[r]
  const target = rowId ? childrenOf(ctx.tr.doc, rowId)[c] : undefined
  if (!target) return false
  ctx.tr.select(caret(target, 0))
  return true
}

/** Enter inside a cell moves down instead of splitting it, which is what a grid should do. */
const cellBelow: Command = (ctx) => {
  const sel = ctx.state.selection
  const id = sel?.kind === 'text' ? sel.head.block : undefined
  if (!id || getBlock(ctx.tr.doc, id)?.type !== CELL_TYPE) return false
  const at = cellAt(ctx.tr.doc, id)
  if (!at) return false
  const rows = childrenOf(ctx.tr.doc, at.table)
  const below = rows[at.row + 1]
  if (!below) return addRow(ctx, { id, where: 'after' })
  const target = childrenOf(ctx.tr.doc, below)[at.col]
  if (!target) return false
  ctx.tr.select(caret(target, 0))
  return true
}

// ---------------------------------------------------------------------------- invariants

/**
 * What this plugin promises about its own shapes, checked after every change:
 * a table is rectangular, it always has one row, and a column layout with one column left is not
 * a layout any more, so it gives its content back to the page instead of pretending.
 */
const normalizeLayout: Plugin['normalize'] = ({ tr, touched }) => {
  for (const id of touched) {
    const b = tr.doc.blocks[id]
    if (!b) continue

    if (b.type === 'table') {
      const rows = b.children
      if (rows.length === 0) {
        tr.remove(id)
        continue
      }
      const width = Math.max(...rows.map((r) => childrenOf(tr.doc, r).length), 1)
      for (const rowId of rows) {
        const have = childrenOf(tr.doc, rowId).length
        for (let i = have; i < width; i++) tr.insert(rowId, i, cell())
      }
    }

    if (b.type === ROW_TYPE && b.children.length === 0 && parentOf(tr.doc, id)) {
      tr.remove(id)
    }

    if (b.type === 'columns') {
      const cols = b.children.filter((c) => tr.doc.blocks[c]?.type === 'column')
      if (cols.length === 0) {
        tr.remove(id)
      } else if (cols.length === 1) {
        // Una sola columna no es un armado: el contenido vuelve a la página y el envoltorio se va.
        const only = cols[0]!
        let at = indexOf(tr.doc, id) + 1
        const parent = parentOf(tr.doc, id) ?? tr.doc.root
        // oxlint-disable-next-line unicorn/no-useless-spread -- la copia es necesaria: el bucle mueve o borra lo que está recorriendo, y sobre la lista viva se saltearía elementos.
        for (const child of [...childrenOf(tr.doc, only)]) {
          tr.move(child, parent, at)
          at++
        }
        tr.remove(id)
      }
    }

    if (b.type === 'column' && b.children.length === 0) {
      // Una columna vacía no se puede clickear: se le deja un párrafo donde escribir.
      tr.append(id, { type: 'paragraph', text: [] })
    }
  }
}

export const layoutKeys: KeyBinding[] = [
  { key: 'Tab', run: 'nextCell', label: 'Celda siguiente' },
  { key: 'Shift-Tab', run: 'nextCell', args: { back: true }, label: 'Celda anterior' },
  { key: 'Enter', run: 'cellBelow', label: 'Celda de abajo' },
]

export const layout = (): Plugin => ({
  name: 'layout',
  blocks: layoutBlocks,
  keys: layoutKeys,
  normalize: normalizeLayout,
  commands: {
    insertTable: insertTable as Command<never>,
    insertColumns: insertColumns as Command<never>,
    addRow: addRow as Command<never>,
    addColumn: addColumn as Command<never>,
    removeRow: removeRow as Command<never>,
    removeColumn: removeColumn as Command<never>,
    nextCell: nextCell as Command<never>,
    cellBelow: cellBelow as Command<never>,
  },
})
