// El editor armado, listo para montar. Es una comodidad y no la API: todo lo que hace es público,
// así que la plataforma puede tomar la superficie y traer su propio marco. Existe para que el caso
// común sea una línea.

import { useMemo, type ReactNode } from 'react'
import type { BlockInit } from './core/doc.ts'
import type { Editor, EditorOptions } from './core/editor.ts'
import type { Plugin } from './core/plugins.ts'
import type { EditorState } from './core/state.ts'
import { fromJSON, toJSON, type BlockJSON } from './core/serialize.ts'
import { activityKit } from './plugins/index.ts'
import { Surface, type SurfaceProps } from './react/Surface.tsx'
import { useNewEditor, useOnChange } from './react/hooks.ts'
import type { Renderers } from './react/renderers.tsx'
import { SlashMenu } from './ui/SlashMenu.tsx'
import { FormatBar } from './ui/FormatBar.tsx'
import { PasteMenu } from './ui/PasteMenu.tsx'
import { BlockHandle } from './ui/BlockHandle.tsx'
import { Toolbox, type ToolboxProps } from './ui/Toolbox.tsx'

export type BlockEditorProps = {
  /** The document, in the format the platform stores. Read once, on mount. */
  value?: readonly BlockJSON[]
  /** Called after each change, debounced. What autosave hangs from. */
  onChange?: (blocks: BlockJSON[], state: EditorState) => void
  /** How long to wait before calling `onChange`. */
  debounce?: number
  plugins?: readonly Plugin[]
  renderers?: Renderers
  readOnly?: boolean
  /** El panel flotante de bloques. Va por defecto mientras se edita; `false` lo saca. */
  toolbox?: boolean | ToolboxProps
  className?: string
  /** Anything else that should float over the page. */
  children?: ReactNode
  /** Gets the editor, for a host that wants to drive it: an agent, a save button, a test. */
  onReady?: (editor: Editor) => void
  strict?: boolean
} & Pick<SurfaceProps, 'onOpenBlockMenu' | 'aria-label'>

export function BlockEditor({
  value,
  onChange,
  debounce = 700,
  plugins,
  renderers,
  readOnly = false,
  toolbox,
  className,
  children,
  onReady,
  strict,
  ...rest
}: BlockEditorProps) {
  const options = useMemo<EditorOptions>(() => {
    const blocks: BlockInit[] | undefined = value ? fromJSON(value) : undefined
    return {
      plugins: plugins ?? activityKit(),
      ...(blocks ? { blocks } : {}),
      ...(readOnly ? { readOnly } : {}),
      ...(strict ? { strict } : {}),
    }
    // Solo al montar, a propósito: un `value` que vuelve del guardado no puede pisar lo que
    // alguien está escribiendo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editor = useNewEditor(options)
  if (onReady) onReady(editor)

  return (
    <Surface editor={editor} renderers={renderers} readOnly={readOnly} className={className} {...rest}>
      {onChange ? <Autosave onChange={onChange} debounce={debounce} /> : null}
      {!readOnly ? (
        <>
          <BlockHandle />
          <SlashMenu />
          <FormatBar />
          <PasteMenu />
          {toolbox === false ? null : <Toolbox {...(typeof toolbox === 'object' ? toolbox : {})} />}
        </>
      ) : null}
      {children}
    </Surface>
  )
}

/** Le avisa al de afuera, en el formato que guarda: el editor no sabe dónde vive un documento. */
function Autosave({
  onChange,
  debounce,
}: {
  onChange: (blocks: BlockJSON[], state: EditorState) => void
  debounce: number
}) {
  useOnChange((state) => onChange(toJSON(state.doc), state), debounce)
  return null
}
