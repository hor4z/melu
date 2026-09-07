/**
 * The core, whole, with no React in it.
 *
 * Importing `@melu/editor/core` gets the engine and nothing else: no components, no styles, no
 * framework. That is what lets a server render an activity to HTML, a script migrate a thousand
 * documents, and a test cover the whole behaviour of the editor without a browser.
 */

export * from './text.ts'
export * from './doc.ts'
export * from './schema.ts'
export * from './selection.ts'
export * from './steps.ts'
export * from './state.ts'
export * from './transaction.ts'
export * from './history.ts'
export * from './commands.ts'
export * from './plugins.ts'
export * from './editor.ts'
export * from './serialize.ts'
export * from './agent.ts'

// `toggleMark` existe dos veces con dos significados: la función que reescribe un texto y el
// comando que actúa sobre la selección. Afuera vale el comando, que es el que se usa; la función
// pura sigue disponible con su nombre largo.
export { toggleMark } from './commands.ts'
export { toggleMark as toggleTextMark } from './text.ts'
