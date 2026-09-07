// El motor, los bloques y la superficie que los dibuja. Tres puertas según cuánto control se
// quiera: `<BlockEditor />` entero, `<Surface />` con tu propio marco, o `@melu/editor/core` sin
// React ni DOM. Sin dependencias de runtime: React es peer y solo lo piden los componentes.

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
export * from './ui/PasteMenu.tsx'
export * from './ui/BlockHandle.tsx'
export * from './ui/Toolbox.tsx'

export * from './BlockEditor.tsx'
