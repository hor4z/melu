// Los bindings de React. Chicos a propósito: React dibuja, el motor decide. El que importa es
// `useBlock`, que se suscribe a un solo bloque: una tecla despierta un componente.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { Block, BlockId } from '../core/doc.ts'
import type { Editor, EditorOptions } from '../core/editor.ts'
import { Editor as EditorClass } from '../core/editor.ts'
import type { EditorState } from '../core/state.ts'
import type { Selection } from '../core/selection.ts'
import { activeBlock, isBlocks } from '../core/selection.ts'
import { marksInSelection } from '../core/commands.ts'
import type { Mark, MarkType } from '../core/text.ts'

const Ctx = createContext<Editor | null>(null)

export const EditorProvider = Ctx.Provider

/** The editor of the surrounding editor. Throws rather than returning null: a missing provider is a bug. */
export function useEditor(): Editor {
  const editor = useContext(Ctx)
  if (!editor) throw new Error('falta el <BlockEditor> alrededor: no hay editor en el contexto')
  return editor
}

/** Creates an editor that lives as long as the component. */
export function useNewEditor(options: EditorOptions): Editor {
  const ref = useRef<Editor>(undefined)
  if (!ref.current) ref.current = new EditorClass(options)
  useEffect(() => () => ref.current?.destroy(), [])
  return ref.current
}

/** Un bloque. Se redibuja solo cuando ese bloque cambió, y ahí está todo el rendimiento. */
export function useBlock(id: BlockId): Block | undefined {
  const editor = useEditor()
  const subscribe = useCallback((fn: () => void) => editor.subscribeBlock(id, fn), [editor, id])
  const snapshot = useCallback(() => editor.block(id), [editor, id])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** The children of a block, as a stable array reference while they do not change. */
export function useChildren(id: BlockId): readonly BlockId[] {
  const block = useBlock(id)
  return block?.children ?? EMPTY
}

const EMPTY: readonly BlockId[] = []

/** Everything. For a toolbar or a status line, which has to know about any change. */
export function useEditorState(): EditorState {
  const editor = useEditor()
  const subscribe = useCallback((fn: () => void) => editor.subscribe(fn), [editor])
  const snapshot = useCallback(() => editor.state, [editor])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Just the selection, so a component that only cares about it is not woken by every letter. */
export function useSelection(): Selection {
  const editor = useEditor()
  const subscribe = useCallback(
    (fn: () => void) =>
      editor.subscribe((change) => {
        if (change.selectionChanged) fn()
      }),
    [editor],
  )
  const snapshot = useCallback(() => editor.selection, [editor])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/**
 * Si este bloque es el que se está editando, o uno de los elegidos.
 *
 * Contesta con un string y no con un objeto, y por eso existe el hook: lo llama cada bloque de la
 * página, así que despertarse con cada cambio de selección repintaría todo. Con un primitivo React
 * se abstiene, y un bloque se redibuja solo cuando su propia respuesta cambió.
 */
export function useIsSelected(id: BlockId): { active: boolean; picked: boolean } {
  const editor = useEditor()
  const subscribe = useCallback(
    (fn: () => void) =>
      editor.subscribe((change) => {
        if (change.selectionChanged) fn()
      }),
    [editor],
  )
  const snapshot = useCallback(() => {
    const selection = editor.selection
    const active = activeBlock(selection) === id
    const picked = isBlocks(selection) && selection.ids.includes(id)
    return `${active ? 'a' : ''}${picked ? 'p' : ''}`
  }, [editor, id])
  const flags = useSyncExternalStore(subscribe, snapshot, snapshot)
  return useMemo(() => ({ active: flags.includes('a'), picked: flags.includes('p') }), [flags])
}

/** The marks the format bar should draw as pressed, pending ones included. */
export function useActiveMarks(): Mark[] {
  const editor = useEditor()
  const subscribe = useCallback((fn: () => void) => editor.subscribe(fn), [editor])
  const version = useSyncExternalStore(subscribe, () => editor.version)
  return useMemo(() => {
    void version
    const stored = editor.state.storedMarks
    return stored ? [...stored] : marksInSelection(editor.state)
  }, [editor, version])
}

export function useIsMarkActive(type: MarkType, value?: string): boolean {
  const marks = useActiveMarks()
  return marks.some((m) => m.type === type && (value === undefined || m.value === value))
}

/** Whether undo and redo have anywhere to go, for the buttons that offer them. */
export function useHistoryState(): { canUndo: boolean; canRedo: boolean } {
  const editor = useEditor()
  const subscribe = useCallback((fn: () => void) => editor.subscribe(fn), [editor])
  const version = useSyncExternalStore(subscribe, () => editor.version)
  return useMemo(() => {
    void version
    return { canUndo: editor.history.canUndo, canRedo: editor.history.canRedo }
  }, [editor, version])
}

/**
 * Avisa después de cada cambio, con espera. De acá cuelga el autoguardado: el editor no opina
 * dónde vive un documento. Al desmontar dispara lo pendiente en lugar de cancelarlo, que es la
 * diferencia entre un autoguardado y un párrafo perdido.
 */
export function useOnChange(fn: (state: EditorState) => void, delay = 700): void {
  const editor = useEditor()
  const latest = useRef(fn)
  latest.current = fn
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let pending = false
    const flush = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      if (!pending) return
      pending = false
      latest.current(editor.state)
    }
    const stop = editor.subscribe((change) => {
      if (!change.docChanged) return
      pending = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delay)
    })
    return () => {
      stop()
      flush()
    }
  }, [editor, delay])
}
