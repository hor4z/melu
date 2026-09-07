/**
 * `@melu/editor`: the engine, the blocks and the surface that draws them.
 *
 * Three doors, and which one to use depends on how much control you want:
 *
 *   <BlockEditor />          the whole thing, one line, for the common case
 *   <Surface editor={...} />  the page, with your own chrome and renderers around it
 *   @melu/editor/core        the engine alone, with no React and no DOM
 *
 * The runtime has no dependencies. React is a peer, and only the components need it.
 */

export * from './core/index.ts'
export * from './plugins/index.ts'

export * from './react/hooks.ts'
export * from './react/Surface.tsx'
export * from './react/BlockText.tsx'
export * from './react/renderers.tsx'
export * from './react/icons.tsx'
export * from './react/dom.ts'
export * from './react/dnd.ts'

export * from './ui/float.ts'
export * from './ui/Popover.tsx'
export * from './ui/SlashMenu.tsx'
export * from './ui/FormatBar.tsx'
export * from './ui/BlockHandle.tsx'
export * from './ui/Toolbox.tsx'

export * from './BlockEditor.tsx'
