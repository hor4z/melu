// Los plugins que vienen, y las dos formas de juntarlos. `basics()` no sabe nada de escuela:
// sirve para cualquier página. `activityKit()` le suma las preguntas. Son listas, y ninguno de
// los plugins sabe de los otros.

import type { Plugin } from '../core/plugins.ts'
import { text } from './text.ts'
import { media } from './media.ts'
import { layout } from './layout.ts'
import { activity } from './activity.ts'
import { paste } from './paste.ts'

export * from './text.ts'
export * from './media.ts'
export * from './layout.ts'
export * from './activity.ts'
export * from './paste.ts'

/** Text, media and structure: everything that is not a question. */
export const basics = (): Plugin[] => [text(), media(), layout(), paste()]

/** The full editor a guide gets, questions included. */
export const activityKit = (): Plugin[] => [...basics(), activity()]
