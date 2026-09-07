import { describe, expect, test } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { REGISTRY } from '../docs/registry'

// Así mueren las suites: el kit crece y los tests no. El registry es la lista de piezas, así
// que se compara contra lo que los tests nombran. No hace falta acordarse: la suite avisa.
const aqui = dirname(fileURLToPath(import.meta.url))
const suite = readdirSync(aqui)
  .filter((f) => f.endsWith('.test.tsx'))
  .map((f) => readFileSync(join(aqui, f), 'utf8'))
  .join('\n')

const nombra = (exportado: string) => new RegExp(`\\b${exportado}\\b`).test(suite)

describe('cobertura', () => {
  test.each(REGISTRY.map((e) => [e.slug, e.exports] as const))('%s tiene tests', (_slug, exports) => {
    expect(exports.some(nombra)).toBe(true)
  })

  test('los hooks de pantalla también', () => {
    expect(nombra('useDevice')).toBe(true)
    expect(nombra('useMediaQuery')).toBe(true)
  })
})
