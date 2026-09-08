/**
 * La puerta de la consola, que sigue estando aunque ahora haya botones.
 *
 * Dos motivos para no sacarla. Uno: preguntarle al motor qué está pensando es más rápido escrito
 * que clickeado. Dos, y es el que manda: `window.taller` es lo que va a llamar la capa de tests del
 * navegador, con el mismo vocabulario que afirma un test de jsdom. Por eso el vocabulario entra
 * entero y sin adaptar.
 */

import { vocabulary } from '../src/test/vocabulary.ts'
import type { Editor } from '../src/index.ts'

/** Lo que el taller sabe hacer y no es una pregunta al motor. */
export type Acciones = {
  soloLectura: (v?: boolean) => void
  agente: (markdown?: string) => void
  reiniciar: () => void
  cargar: (markdown: string) => void
}

export function montarConsola(editor: Editor, acciones: Acciones): void {
  Object.assign(window, {
    melu: editor,
    taller: { ...vocabulary(editor), ...acciones },
  })
}
