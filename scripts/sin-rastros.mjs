// El guardián del design system: que no vuelva nada del kit viejo, y que ningún color se escriba
// a mano. El front no tiene tests, así que esta es la única red que lo sostiene.
//
// Se corre con `node scripts/sin-rastros.mjs`, y lo corren `make test` y la CI.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))

/** Dónde se busca. El motor tiene su propia paleta de documento, declarada en un solo lugar. */
const MIRA = [
  { dir: 'packages/web/src', hex: true },
  { dir: 'packages/editor/playground', hex: false },
]

const SALTEAR = new Set(['node_modules', 'dist', '.git'])
const EXT = /\.(tsx?|css|html)$/

/** Lo que no puede volver, y por qué. */
const PROHIBIDO = [
  { re: /@melu\/ui/, dice: 'el kit viejo se borró: las piezas salen de @milo/ui' },
  { re: /\blucide-react\b/, dice: 'los iconos son los del sistema (Icon de @milo/ui)' },
  { re: /\bDoodle[A-Z]\w*/, dice: 'los doodles se fueron: un vacío se resuelve con EmptyState y un icono' },
  { re: /\b(ProgressRing|SegmentedControl|DataList|MenuButton|MoreMenu|NativeSelect|RadioCard|Sparkline|Logomark2|FormActions|TableSkeleton|PhotoFrame)\b/, dice: 'esa pieza era del kit viejo' },
  { re: /var\(--(ink-subtle|line-strong|tint-[a-z]+|solid-foreground|accent-text|brand-text|shadow-card|text-subtle|danger|success|warning|bg-inverted)\b/, dice: 'ese token era del tema viejo: los roles son los de milo' },
  { re: /\b(text|bg|border|divide)-(ink|line|canvas2|lilac|teal|cyan|yellow)\b/, dice: 'esa utilidad salía de la paleta vieja' },
  { re: /\bui-(reveal|rise|correct|error|glow|nudge|flip|delay-\d)\b/, dice: 'esas animaciones eran del tema viejo' },
]

/** Un color escrito a mano. Los respaldos de un token (`var(--x, #hex)`) son otra cosa: ver abajo. */
const HEX = /#[0-9a-fA-F]{3,8}\b/g
const RGB = /\brgba?\(/g
const HEX_EN_UTILIDAD = /(?:className|class)="[^"]*\[(?:#[0-9a-fA-F]{3,8}|rgba?\()[^"]*"/g

const fallas = []

function archivos(dir) {
  const out = []
  for (const nombre of readdirSync(dir)) {
    if (SALTEAR.has(nombre)) continue
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) out.push(...archivos(ruta))
    else if (EXT.test(nombre)) out.push(ruta)
  }
  return out
}

for (const { dir, hex } of MIRA) {
  for (const ruta of archivos(join(raiz, dir))) {
    const corto = relative(raiz, ruta)
    const texto = readFileSync(ruta, 'utf8')
    texto.split('\n').forEach((linea, i) => {
      const donde = `${corto}:${i + 1}`
      for (const { re, dice } of PROHIBIDO) {
        const m = linea.match(re)
        if (m) fallas.push(`${donde}  ${m[0]}  ${dice}`)
      }
      if (!hex) return
      // El respaldo de un token es legítimo y vive adentro de un `var(…, …)`: se saca la línea de
      // esos antes de buscar, así lo que quede es un color escrito de verdad a mano.
      const limpia = linea.replace(/var\([^)]*\)/g, 'var()')
      for (const m of limpia.match(HEX) ?? []) fallas.push(`${donde}  ${m}  todo color sale de un rol del sistema`)
      for (const m of limpia.match(RGB) ?? []) fallas.push(`${donde}  ${m}  todo color sale de un rol del sistema`)
      for (const m of linea.match(HEX_EN_UTILIDAD) ?? []) fallas.push(`${donde}  ${m}  un color adentro de una utilidad sigue siendo un color a mano`)
    })
  }
}

if (fallas.length > 0) {
  console.error(`Quedaron ${fallas.length} rastros del design system viejo:\n`)
  for (const f of fallas) console.error('  ' + f)
  process.exit(1)
}

console.log('Sin rastros: ningún import, nombre, token ni color del kit viejo.')
