// La puerta del agente, y no hay una segunda implementación: manda los mismos comandos con nombre
// que manda un click, y aprende cuáles existen leyendo un manifiesto generado de los mismos specs.
// `manifest` dice qué existe, `outline` qué hay ahora, `apply` corre un lote atómico.

import type { Editor } from './editor.ts'
import { ctxOf } from './editor.ts'
import type { BlockId, BlockInit } from './doc.ts'
import { childrenOf, has } from './doc.ts'
import type { BlockSpec, PropSpec, Schema } from './schema.ts'
import { plain } from './text.ts'
import { appendBlocks, replaceContent } from './commands.ts'
import { fromMarkdown, toMarkdown } from './serialize.ts'
import { Transaction } from './transaction.ts'
import { StepError } from './steps.ts'

// ---------------------------------------------------------------------------- manifest

export type PropManifest = {
  name: string
  kind: PropSpec['kind']
  label?: string
  hint?: string
  options?: readonly string[]
  default?: unknown
  min?: number
  max?: number
}

export type BlockManifest = {
  type: string
  name: string
  hint?: string
  group?: string
  /** Whether the block has editable text of its own, which is where the prompt goes. */
  text: boolean
  /** Whether it can hold children. */
  children: boolean
  props: PropManifest[]
}

export type Manifest = {
  blocks: BlockManifest[]
  commands: string[]
  keys: { key: string; run: string; label?: string }[]
  /** A worked example, because one example is worth more than the whole schema. */
  example: AgentOp[]
}

const propManifest = (name: string, p: PropSpec): PropManifest => ({
  name,
  kind: p.kind,
  ...(p.label ? { label: p.label } : {}),
  ...(p.hint ? { hint: p.hint } : {}),
  ...('options' in p && p.options ? { options: p.options } : {}),
  ...(p.default !== undefined ? { default: p.default } : {}),
  ...('min' in p && p.min !== undefined ? { min: p.min } : {}),
  ...('max' in p && p.max !== undefined ? { max: p.max } : {}),
})

export const blockManifest = (spec: BlockSpec, schema: Schema): BlockManifest => ({
  type: spec.type,
  name: spec.name,
  ...(spec.hint ? { hint: spec.hint } : {}),
  ...(spec.group ? { group: spec.group } : {}),
  text: schema.isTextual(spec.type),
  children: schema.isContainer(spec.type),
  props: Object.entries(spec.props ?? {}).map(([name, p]) => propManifest(name, p)),
})

/** Everything an agent needs to know to drive this editor, as JSON. */
export function manifest(editor: Editor): Manifest {
  return {
    blocks: editor.schema.types.map((t) => blockManifest(editor.schema.specOr(t), editor.schema)),
    commands: editor.commandNames,
    keys: editor.keyBindings
      .filter((b) => b.label)
      .map((b) => ({ key: b.key, run: b.run, ...(b.label ? { label: b.label } : {}) })),
    example: [
      { do: 'markdown', args: { text: '# Medir el patio\n\nSalimos con la cinta y anotamos.' } },
      { do: 'insertBlock', args: { type: 'number', text: [{ text: '¿Cuántos metros de largo tiene?' }], props: { answer: 12, tolerance: 0.5, unit: 'm' } } },
    ],
  }
}

// ---------------------------------------------------------------------------- outline

export type OutlineOptions = {
  /** How many characters of each block to show. */
  chars?: number
  /** Include the props of each block. Off by default: it triples the size. */
  props?: boolean
  /** Stop at this depth. */
  depth?: number
}

/** El documento como una lista corta. Cada línea arranca con el id: es para poder apuntarle. */
export function outline(editor: Editor, opts: OutlineOptions = {}): string {
  const { chars = 80, props = false, depth = 6 } = opts
  const lines: string[] = []
  const walk = (parent: BlockId, level: number) => {
    if (level > depth) return
    childrenOf(editor.doc, parent).forEach((id, i) => {
      const b = editor.doc.blocks[id]!
      const text = plain(b.text).replace(/\s+/g, ' ').trim()
      const cut = text.length > chars ? `${text.slice(0, chars)}…` : text
      const propsText = props && b.props && Object.keys(b.props).length ? ` ${JSON.stringify(b.props)}` : ''
      lines.push(`${'  '.repeat(level)}${i + 1}. [${id}] ${b.type}${cut ? ` "${cut}"` : ''}${propsText}`)
      walk(id, level + 1)
    })
  }
  walk(editor.doc.root, 0)
  return lines.join('\n')
}

/** The document as markdown, which is what to hand a model that has to rewrite the content. */
export const readMarkdown = (editor: Editor): string => toMarkdown(editor.doc)

// ---------------------------------------------------------------------------- operations

/** `do` es un nombre de comando y `args` lo que ese comando toma. Es JSON: llega tal cual. */
export type AgentOp =
  | { do: 'markdown'; args: { text: string; at?: 'end' | 'replace'; parent?: BlockId } }
  | { do: string; args?: unknown }

export type AgentReport = {
  ok: boolean
  /** One line per operation, in order, saying what happened. In Spanish: it surfaces in the UI. */
  results: { op: string; ok: boolean; note?: string }[]
  /** Set when the batch was rolled back. */
  error?: string
}

/**
 * Un lote en una sola transacción, todo o nada: una actividad a medio escribir por un modelo que
 * se perdió es peor que una que no se escribió, y un solo deshacer tiene que llevarse todo.
 */
export function apply(editor: Editor, ops: readonly AgentOp[], opts: { label?: string } = {}): AgentReport {
  const results: AgentReport['results'] = []
  if (ops.length === 0) return { ok: false, results, error: 'no vino ninguna operación' }
  // Esta es la única puerta que no pasa por `exec`, así que el permiso se pregunta acá: si no, un
  // agente podía escribir en un documento que una persona no puede tocar.
  if (editor.readOnly) return { ok: false, results, error: 'el documento está en solo lectura' }

  const tr = new Transaction(editor.state)
  tr.setMeta('agent', opts.label ?? true)
  const ctx = ctxOf(tr)

  try {
    for (const op of ops) {
      if (op.do === 'markdown') {
        const args = (op.args ?? {}) as { text?: string; at?: 'end' | 'replace'; parent?: BlockId }
        const blocks = fromMarkdown(args.text ?? '')
        if (blocks.length === 0) {
          results.push({ op: op.do, ok: false, note: 'el markdown no tenía contenido' })
          continue
        }
        const ok =
          args.at === 'replace'
            ? replaceContent(ctx, { blocks })
            : appendBlocks(ctx, { blocks, ...(args.parent ? { parent: args.parent } : {}) })
        results.push({ op: op.do, ok, note: ok ? `${blocks.length} bloques` : 'no se pudo insertar' })
        continue
      }

      const cmd = editor.commandOf(op.do)
      if (!cmd) {
        return {
          ok: false,
          results: [...results, { op: op.do, ok: false, note: 'no existe ese comando' }],
          error: `no existe el comando "${op.do}"`,
        }
      }
      const ok = cmd(ctx, op.args as never)
      results.push({ op: op.do, ok, ...(ok ? {} : { note: 'no aplicaba' }) })
    }
  } catch (err) {
    const note = err instanceof StepError ? err.message : String(err)
    return { ok: false, results, error: note }
  }

  if (tr.steps.length === 0) return { ok: false, results, error: 'ninguna operación cambió nada' }

  editor.dispatch(tr)
  return { ok: true, results }
}

/** Bulk authoring in the format a model writes best. One transaction, one undo. */
export function authorMarkdown(editor: Editor, markdown: string, at: 'end' | 'replace' = 'end'): AgentReport {
  return apply(editor, [{ do: 'markdown', args: { text: markdown, at } }], { label: 'markdown' })
}

/** Blocks straight from JSON, for an agent that would rather build the tree itself. */
export function authorBlocks(editor: Editor, blocks: readonly BlockInit[], parent?: BlockId): AgentReport {
  if (parent && !has(editor.doc, parent)) return { ok: false, results: [], error: `no existe el bloque ${parent}` }
  return apply(editor, [{ do: 'appendBlocks', args: { blocks, parent } }], { label: 'blocks' })
}

/** Todo junto para un system prompt: qué puede armar, qué hay, y cómo pedirlo. */
export function brief(editor: Editor): string {
  const groups = editor.schema.groups
    .map((g) => `${g.group}: ${g.items.map((s) => s.type).join(', ')}`)
    .join('\n')
  return [
    'Editás una actividad por bloques. Cada operación es {"do":"<comando>","args":{...}}.',
    'Los bloques que existen, por grupo:',
    groups,
    '',
    'Para escribir contenido largo conviene {"do":"markdown","args":{"text":"..."}}.',
    'Para una pregunta, insertBlock con el tipo y sus props: mirá el manifiesto.',
    '',
    'El documento ahora:',
    outline(editor) || '(vacío)',
  ].join('\n')
}

/** A single block, built and inserted where it belongs. The narrow, common case. */
export function addBlock(editor: Editor, init: BlockInit & { at?: 'after' | 'end'; target?: BlockId }): AgentReport {
  const { at = 'end', target, ...rest } = init
  return apply(editor, [{ do: 'insertBlock', args: { ...rest, at, target } }], { label: 'block' })
}
