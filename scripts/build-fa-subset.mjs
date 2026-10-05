/**
 * Font Awesome Pro reducido a los íconos que usa la tienda.
 *
 * Las fuentes completas (solid 281 KB + regular 358 KB + brands 115 KB) y el CSS con miles
 * de íconos se bajaban en la primera visita. Este script:
 *   1. Junta los íconos usados: el código (src/**, index.html), el icon set de Quasar
 *      (fontawesome-v6) y los íconos que el admin puede elegir para una categoría
 *      (CATEGORY_ICON_OPTIONS, todos "solid").
 *   2. Genera src/css/fa-subset/fa-subset.css con las reglas base de FA y solo esos íconos.
 *   3. Recorta cada fuente (woff2) a esos glifos.
 *
 * Se corre solo antes de `dev` y `build` (scripts predev/prebuild). Si se agrega un ícono
 * nuevo y no aparece, basta con volver a correrlo: `npm run fa:subset`.
 * Un ícono armado dinámicamente (no escrito literal en el código) hay que agregarlo a EXTRA.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const FA = join(root, 'node_modules/@fortawesome/fontawesome-pro')
const OUT = join(root, 'src/css/fa-subset')

/** Íconos que no aparecen literales en el código. */
const EXTRA = { solid: [], regular: [], brands: [] }

const STYLE_OF = { 'fa-solid': 'solid', fas: 'solid', 'fa-regular': 'regular', far: 'regular', 'fa-brands': 'brands', fab: 'brands' }
const ICON_RE = /\b(fa-solid|fa-regular|fa-brands|fas|far|fab)\s+fa-([a-z0-9-]+)/g

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (/\.(vue|ts|js|mjs|html)$/.test(name) && !p.includes('fa-subset')) files.push(p)
  }
  return files
}

const used = { solid: new Set(EXTRA.solid), regular: new Set(EXTRA.regular), brands: new Set(EXTRA.brands) }
const sources = [
  ...walk(join(root, 'src')),
  join(root, 'index.html'),
  join(root, 'node_modules/quasar/icon-set/fontawesome-v6.js'),
]
for (const file of sources) {
  for (const [, style, name] of readFileSync(file, 'utf8').matchAll(ICON_RE)) used[STYLE_OF[style]].add(name)
}
// Íconos de categoría: el admin los elige de esta lista y se guardan como nombre corto (solid).
const categoryIcons = readFileSync(join(root, 'src/utils/categoryIcons.ts'), 'utf8')
for (const [, name] of categoryIcons.matchAll(/value:\s*'([a-z0-9-]+)'/g)) used.solid.add(name)

// --- CSS: reglas base + solo los íconos usados -------------------------------------------
const iconRule = /^\.fa-[a-z0-9-]+(?:,\.fa-[a-z0-9-]+)*\{--fa:"((?:\\[0-9a-f]+ ?|\\.|[^"\\])+)"(?:;--fa--fa:"[^"]*")?\}$/
/** Valor de un string CSS (`\f015`, `\+`, `a`) → el carácter que representa. */
const cssChar = (v) => (/^\\[0-9a-f]+ ?$/.test(v) ? String.fromCodePoint(parseInt(v.slice(1), 16)) : v.replace(/^\\/, ''))
const codepoints = { solid: new Set(), regular: new Set(), brands: new Set() }
// Íconos de marca: sus reglas viven en brands.min.css; el resto en fontawesome.min.css.
const codeOf = { core: new Map(), brands: new Map() }
let removed = 0

/**
 * Separa el CSS en reglas de primer nivel. No sirve un regex: hay íconos cuyo valor es una
 * llave (`.fa-bracket-curly-left{--fa:"\\{"}`) y @media/@keyframes anidan reglas.
 */
function splitRules(css) {
  const rules = []
  let depth = 0
  let quote = null
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") quote = ch
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) {
      rules.push(css.slice(start, i + 1))
      start = i + 1
    }
  }
  return rules
}

/** Deja las reglas base y solo las reglas de íconos cuyo nombre está en `names`. */
function filterCss(file, names, codes) {
  const css = readFileSync(join(FA, `css/${file}`), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = splitRules(css)
  const kept = []
  for (const rule of rules) {
    const m = iconRule.exec(rule.trim())
    if (!m) {
      kept.push(rule)
      continue
    }
    const ruleNames = rule.slice(0, rule.indexOf('{')).split(',').map((s) => s.trim().slice(4))
    if (ruleNames.some((n) => names.has(n))) {
      kept.push(rule)
      for (const n of ruleNames) codes.set(n, m[1])
    } else removed++
  }
  return kept.join('').replaceAll('../webfonts/', './')
}

const parts = [
  filterCss('fontawesome.min.css', new Set([...used.solid, ...used.regular]), codeOf.core),
  filterCss('solid.min.css', new Set(), codeOf.core),
  filterCss('regular.min.css', new Set(), codeOf.core),
  filterCss('brands.min.css', used.brands, codeOf.brands),
]
for (const style of ['solid', 'regular', 'brands']) {
  for (const n of used[style]) {
    const code = (style === 'brands' ? codeOf.brands : codeOf.core).get(n)
    if (!code) throw new Error(`Ícono fa-${style} fa-${n} no existe en Font Awesome Pro`)
    codepoints[style].add(cssChar(code))
  }
}

const FONT = { solid: 'fa-solid-900', regular: 'fa-regular-400', brands: 'fa-brands-400' }

mkdirSync(OUT, { recursive: true })
writeFileSync(
  join(OUT, 'fa-subset.css'),
  `/* Generado por scripts/build-fa-subset.mjs — no editar a mano. Font Awesome Pro (licencia comercial). */\n${parts.join('\n')}\n`,
)

let before = 0
let after = 0
for (const style of ['solid', 'regular', 'brands']) {
  const src = readFileSync(join(FA, `webfonts/${FONT[style]}.woff2`))
  const out = await subsetFont(src, [...codepoints[style]].join(''), { targetFormat: 'woff2' })
  writeFileSync(join(OUT, `${FONT[style]}.woff2`), out)
  before += src.length
  after += out.length
}

const kb = (n) => `${Math.round(n / 1024)} KB`
console.log(
  `[fa-subset] íconos: ${used.solid.size} solid, ${used.regular.size} regular, ${used.brands.size} brands · ` +
    `reglas de ícono quitadas: ${removed} · fuentes ${kb(before)} → ${kb(after)}`,
)
