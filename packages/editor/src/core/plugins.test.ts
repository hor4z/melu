/**
 * El contrato de extensión: cómo se juntan los plugins y cómo se nombra una tecla.
 *
 * Todo lo que el editor sabe hacer entra por acá, y el orden en que entra decide quién gana: un
 * plugin que llega después puede corregir un bloque de uno anterior, y una regla de entrada con
 * más prioridad tiene que probarse antes que la de "-", que matchea casi cualquier cosa.
 *
 * Lo de las teclas se prueba en las dos máquinas: en una Mac, Mod es Cmd y Ctrl sigue siendo Ctrl,
 * y esa diferencia es de las que andan en la máquina de quien lo escribió y fallan en el CI.
 */

import { describe, expect, it } from 'vitest'
import { collect, nameKey, normalizeKey, type Plugin } from './plugins.ts'

const plugin = (p: Partial<Plugin> & { name: string }): Plugin => p

describe('juntar los plugins', () => {
  it('el que llega después gana el nombre, y el resto se suma', () => {
    const { commands, blocks } = collect([
      plugin({ name: 'a', commands: { saludar: () => true }, blocks: [{ type: 'paragraph', name: 'Texto' }] }),
      plugin({ name: 'b', commands: { saludar: () => false }, blocks: [{ type: 'timer', name: 'Reloj' }] }),
    ])
    expect(commands.get('saludar')!({} as never, undefined as never)).toBe(false)
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'timer'])
  })

  it('las reglas de entrada quedan ordenadas por prioridad, y no por quién se cargó primero', () => {
    const { rules } = collect([
      plugin({ name: 'tarde', rules: [{ name: 'guion', match: /-$/, run: () => true }] }),
      plugin({ name: 'temprano', rules: [{ name: 'titulo', match: /^#$/, run: () => true, priority: -10 }] }),
    ])
    expect(rules.map((r) => r.name)).toEqual(['titulo', 'guion'])
  })

  it('los del pegado también, que es lo que decide si una URL entra como link o como video', () => {
    const { paste } = collect([
      plugin({ name: 'texto', paste: [{ name: 'plano', types: ['text/plain'], run: () => true }] }),
      plugin({ name: 'medios', paste: [{ name: 'url', types: ['text/plain'], run: () => true, priority: -5 }] }),
    ])
    expect(paste.map((p) => p.name)).toEqual(['url', 'plano'])
  })

  it('los normalizadores y los filtros se guardan todos: ninguno pisa a otro', () => {
    const { normalizers, filters } = collect([
      plugin({ name: 'a', normalize: () => {}, filter: () => true }),
      plugin({ name: 'b', normalize: () => {}, filter: () => true }),
    ])
    expect(normalizers).toHaveLength(2)
    expect(filters).toHaveLength(2)
  })

  it('lo que un plugin le deja a la vista se junta en un solo objeto', () => {
    const { view } = collect([
      plugin({ name: 'a', view: { renderers: 1 } }),
      plugin({ name: 'b', view: { iconos: 2 } }),
    ])
    expect(view).toEqual({ renderers: 1, iconos: 2 })
  })

  it('un plugin que no trae nada no rompe la cuenta', () => {
    const todo = collect([plugin({ name: 'vacío' })])
    expect(todo.blocks).toEqual([])
    expect(todo.commands.size).toBe(0)
  })
})

describe('cómo se llama una tecla', () => {
  const evento = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {}) => ({ key, ...mods })

  it('en una máquina que no es Mac, Mod es Ctrl', () => {
    expect(nameKey(evento('b', { ctrlKey: true }), false)).toBe('Mod-b')
  })

  it('en una Mac, Mod es Cmd y Ctrl sigue nombrándose Ctrl', () => {
    expect(nameKey(evento('b', { metaKey: true }), true)).toBe('Mod-b')
    expect(nameKey(evento('b', { ctrlKey: true }), true)).toBe('Ctrl-b')
  })

  it('los modificadores salen siempre en el mismo orden, sin importar cómo llegaron', () => {
    expect(nameKey(evento('b', { ctrlKey: true, shiftKey: true, altKey: true }), false)).toBe('Mod-Alt-Shift-b')
  })

  it('una letra se nombra en minúscula, y una tecla con nombre se respeta', () => {
    expect(nameKey(evento('B', { ctrlKey: true }), false)).toBe('Mod-b')
    expect(nameKey(evento('ArrowUp'), false)).toBe('ArrowUp')
  })

  it('lo que escribió un binding se lee igual que lo que llegó del teclado', () => {
    expect(normalizeKey('Cmd-Shift-B')).toBe(nameKey(evento('B', { metaKey: true, shiftKey: true }), true))
    expect(normalizeKey('Control-Alt-t')).toBe('Ctrl-Alt-t')
    expect(normalizeKey('Shift-Mod-b')).toBe('Mod-Shift-b')
  })
})
