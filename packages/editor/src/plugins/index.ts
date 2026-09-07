/**
 * The plugins that ship with the package, and the two ways of putting them together.
 *
 * `basics()` is the writing surface: text, media and structure. It has nothing to do with school,
 * so it is what any other page in the platform would use. `activityKit()` adds the blocks that
 * ask something of a learner, which is the editor a guide opens.
 *
 * Both are just lists. Dropping a plugin, reordering them or slipping one of your own in the
 * middle is a line at the call site, and none of them knows about the others.
 */

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
