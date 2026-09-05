// Las props de cada componente salen del código, no de una tabla escrita a mano.
//
// Una tabla a mano se desfasa el día que alguien agrega una prop y no toca la doc, y nadie se
// entera hasta que la doc miente. Acá el compilador de TypeScript lee las mismas fuentes que
// compila la app y arma la lista; el sitio la importa de `virtual:melu-props`. Si una prop
// aparece o cambia de tipo, la página cambia sola.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import type { Plugin } from 'vite'

export type PropDoc = {
  name: string
  type: string
  required: boolean
  default?: string
  description?: string
}

export type ComponentDoc = {
  name: string
  description?: string
  props: PropDoc[]
  /** El elemento del DOM cuyos atributos hereda, si hereda alguno: `button`, `div`, `input`. */
  extendsElement?: string
  /** Cuántas props aporta esa herencia. No se listan: son las de HTML, no las del sistema. */
  inherited: number
  /** Ruta del archivo, relativa a `packages/ui`, para enlazar a la fuente. */
  source: string
}

const VIRTUAL = 'virtual:melu-props'
const RESOLVED = '\0' + VIRTUAL

/** Un tipo largo escrito entero no se lee: se corta y el enlace a la fuente hace el resto. */
function printType(checker: ts.TypeChecker, type: ts.Type, node: ts.Node) {
  let text = checker.typeToString(
    type,
    node,
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | ts.TypeFormatFlags.UseFullyQualifiedType,
  )
  // `ReactNode` se expande en una unión de nueve miembros que no le dice nada a nadie. Es el
  // tipo más común de todo el kit, así que vuelve a su nombre.
  text = text.replace(/(?:import\("[^"]*react[^"]*"\)|React)\./g, '')
  // Cualquier tipo que mencione `JSXElementConstructor` es `ReactNode` desplegado: en este kit
  // no hay otro que lo use. Se lo devuelve a su nombre, con la intersección si la tiene.
  if (text.includes('JSXElementConstructor')) {
    if (text.includes('(string &')) return 'ReactNode & string'
    return text.includes('undefined') ? 'ReactNode' : 'NonNullable<ReactNode>'
  }
  return text.length > 120 ? text.slice(0, 117) + '…' : text
}

function jsDoc(symbol: ts.Symbol, checker: ts.TypeChecker) {
  const text = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()
  return text || undefined
}

/** El valor por defecto se lee del destructuring de los parámetros: `{ size = 'md' }`. */
function defaultsOf(fn: ts.SignatureDeclaration): Map<string, string> {
  const out = new Map<string, string>()
  const first = fn.parameters[0]
  if (!first || !ts.isObjectBindingPattern(first.name)) return out
  for (const el of first.name.elements) {
    if (!el.initializer || !ts.isIdentifier(el.name)) continue
    const key = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : el.name.text
    out.set(key, el.initializer.getText())
  }
  return out
}

function isComponentName(name: string) {
  return /^[A-Z]/.test(name)
}

/**
 * De qué elemento hereda los atributos. Se lee del texto de la declaración porque es donde
 * está escrito —`ComponentPropsWithoutRef<'button'>`—; el tipo ya resuelto no lo recuerda.
 */
const ELEMENT_RE = /Component(?:PropsWithoutRef|Props|PropsWithRef)<'([a-z0-9]+)'>/

function elementOf(param: ts.ParameterDeclaration, type: ts.Type): string | undefined {
  // El caso corto: la anotación está escrita en el parámetro, sin interfaz de por medio.
  const annotated = param.type && ELEMENT_RE.exec(param.type.getText())
  if (annotated) return annotated[1]
  for (const decl of type.getSymbol()?.declarations ?? []) {
    const m = ELEMENT_RE.exec(decl.getText())
    if (m) return m[1]
  }
  return undefined
}

export function collect(root: string): Record<string, ComponentDoc> {
  const entry = path.join(root, 'src/index.ts')
  const program = ts.createProgram([entry], {
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
    strict: true,
  })
  const checker = program.getTypeChecker()
  const srcDir = path.join(root, 'src')
  const source = program.getSourceFile(entry)
  if (!source) return {}
  const moduleSymbol = checker.getSymbolAtLocation(source)
  if (!moduleSymbol) return {}

  const out: Record<string, ComponentDoc> = {}

  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const name = exported.getName()
    if (!isComponentName(name)) continue

    const declared = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    const decl = declared.valueDeclaration ?? declared.declarations?.[0]
    if (!decl) continue

    // Solo funciones: los tipos (`ButtonProps`) y las constantes (`DOODLES`) no son componentes.
    const fn = ts.isFunctionDeclaration(decl) || ts.isFunctionExpression(decl) || ts.isArrowFunction(decl)
      ? decl
      : ts.isVariableDeclaration(decl) && decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ? decl.initializer
        : undefined
    if (!fn) continue

    const param = fn.parameters[0]
    const props: PropDoc[] = []
    let inherited = 0
    let element: string | undefined
    if (param) {
      const defaults = defaultsOf(fn)
      const paramType = checker.getTypeAtLocation(param)
      element = elementOf(param, paramType)
      for (const prop of checker.getPropertiesOfType(paramType)) {
        const propName = prop.getName()
        if (propName === 'key') continue
        const at = prop.valueDeclaration ?? prop.declarations?.[0] ?? param
        // Las que llegan de `ComponentPropsWithoutRef` son los atributos de HTML: son cientos
        // y no las inventó este sistema. Se cuentan y se nombra el elemento, no se listan.
        const own = (prop.declarations ?? []).some((d) => d.getSourceFile().fileName.startsWith(srcDir))
        if (!own) { inherited++; continue }
        const type = checker.getTypeOfSymbolAtLocation(prop, at)
        props.push({
          name: propName,
          type: printType(checker, type, at),
          required: !(prop.flags & ts.SymbolFlags.Optional),
          default: defaults.get(propName),
          description: jsDoc(prop, checker),
        })
      }
    }

    // Primero las propias del componente y después las que hereda del DOM, que son ruido:
    // las documentadas y las obligatorias arriba, el resto alfabético.
    props.sort((a, b) => {
      const rank = (p: PropDoc) => (p.required ? 0 : p.description ? 1 : p.default ? 2 : 3)
      return rank(a) - rank(b) || a.name.localeCompare(b.name)
    })

    out[name] = {
      name,
      description: jsDoc(declared, checker),
      props,
      extendsElement: element,
      inherited,
      source: path.relative(root, decl.getSourceFile().fileName),
    }
  }

  return out
}

export function propsPlugin(): Plugin {
  let root = ''
  let cache: string | undefined

  return {
    name: 'melu-props',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : undefined
    },
    load(id) {
      if (id !== RESOLVED) return
      cache ??= `export default ${JSON.stringify(collect(root))}`
      return cache
    },
    // El módulo virtual se rearma cuando cambia un componente: la doc no puede quedar atrás
    // de la fuente ni siquiera durante una sesión de dev.
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(path.join(root, 'src')) || !file.endsWith('.tsx')) return
      cache = undefined
      const mod = server.moduleGraph.getModuleById(RESOLVED)
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
    },
  }
}

/** Para correrlo suelto: `node --experimental-strip-types docs/props-plugin.ts`. */
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const root = path.resolve(new URL('..', import.meta.url).pathname)
  const docs = collect(root)
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { name: string }
  console.log(`${pkg.name}: ${Object.keys(docs).length} componentes`)
  for (const [name, doc] of Object.entries(docs)) {
    const hereda = doc.extendsElement ? ` (+${doc.inherited} de <${doc.extendsElement}>)` : ''
    console.log(`  ${name.padEnd(24)} ${String(doc.props.length).padStart(2)} props${hereda}`)
  }
}
