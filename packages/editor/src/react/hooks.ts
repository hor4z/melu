/**
 * The React bindings. Small on purpose: React renders, the engine decides.
 *
 * `useBlock` is the one that matters. It subscribes to a single block, so a keystroke wakes one
 * component and repaints one paragraph. The alternative, subscribing every block to the document,
 * is what makes a long page feel like it is thinking: a thousand components would compare
 * themselves on every letter. Here the transaction already knows which blocks it touched, so the
 * notification is exact and React has nothing to look for.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Block, BlockId } from '../core/doc.ts'
import type { Editor, EditorOptions } from '../core/editor.ts'
import { Editor as EditorClass } from '../core/editor.ts'
import type { EditorState } from '../core/state.ts'
import type { Selection } from '../core/selection.ts'
import { activeBlock, isBlocks, isText } from '../core/selection.ts'
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

export const useEditorOrNull = (): Editor | null => useContext(Ctx)

/** Creates an editor that lives as long as the component. */
export function useNewEditor(options: EditorOptions): Editor {
  const ref = useRef<Editor>(undefined)
  if (!ref.current) ref.current = new EditorClass(options)
  useEffect(() => () => ref.current?.destroy(), [])
  return ref.current
}

/**
 * One block. Re-renders only when that block changes, which is the whole performance story of
 * this package.
 */
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
 * Whether this block is the one being edited, or one of the ones picked.
 *
 * The snapshot is a string and not an object, and that is the whole reason this hook exists
 * instead of reading the selection directly. Every block on the page calls this, so if it woke up
 * on every selection change it would re-render the entire page on every keystroke, which is
 * exactly what the per-block subscription was built to avoid. Answering with a primitive lets
 * React bail out: a block only re-renders when its own answer changed.
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
 * Calls back after every change to the document, debounced. What autosave hangs from: the editor
 * has no opinion about where a document is stored, so the platform gets told and decides.
 */
export function useOnChange(fn: (state: EditorState) => void, delay = 700): void {
  const editor = useEditor()
  const latest = useRef(fn)
  latest.current = fn
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = editor.subscribe((change) => {
      if (!change.docChanged) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => latest.current(editor.state), delay)
    })
    return () => {
      if (timer) clearTimeout(timer)
      stop()
    }
  }, [editor, delay])
}

/** The current text selection as a range inside one block, for the format bar. */
export function useTextRange(): { block: BlockId; from: number; to: number } | null {
  const selection = useSelection()
  return useMemo(() => {
    if (!isText(selection)) return null
    if (selection.anchor.block !== selection.head.block) return null
    const from = Math.min(selection.anchor.offset, selection.head.offset)
    const to = Math.max(selection.anchor.offset, selection.head.offset)
    return { block: selection.head.block, from, to }
  }, [selection])
}

/** A piece of view state that belongs to the editor rather than to a component, keyed by name. */
export function useViewState<T>(key: string, initial: T): [T, (value: T) => void] {
  const editor = useEditor()
  const store = viewStores.get(editor) ?? new Map<string, unknown>()
  if (!viewStores.has(editor)) viewStores.set(editor, store)
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial))
  const set = useCallback(
    (next: T) => {
      store.set(key, next)
      setValue(next)
    },
    [store, key],
  )
  return [value, set]
}

const viewStores = new WeakMap<Editor, Map<string, unknown>>()
