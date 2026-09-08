/**
 * Si el navegador está componiendo una letra: un acento con tecla muerta, un IME, el dictado.
 *
 * Uno solo para todos, y a propósito: se compone en un lugar a la vez. Lo enciende la superficie,
 * que es la que recibe los eventos, y lo mira cada bloque antes de repintarse, porque tocar el DOM
 * en el medio de una composición la cancela y se pierde la letra a medio armar.
 */
export const composing = { current: false }
