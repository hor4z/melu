// El core entero, sin React adentro: eso es lo que deja que un servidor rinda una actividad, que
// un script migre mil documentos y que un test cubra todo el comportamiento sin navegador.

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

// `toggleMark` existe dos veces: la función que reescribe un texto y el comando que actúa sobre
// la selección. Afuera vale el comando; la función pura queda con su nombre largo.
export { toggleMark } from './commands.ts'
export { toggleMark as toggleTextMark } from './text.ts'
