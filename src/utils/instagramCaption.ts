import { normalizeForSearch } from '@/utils/slugify'

export interface CaptionSuggestion {
  name: string
  description: string
  price: number | null
  measure: string | null
  tags: string[]
  /** El post dice "VENDIDO". */
  sold: boolean
}

// Emojis, "¡" o espacios antes de VENDIDO/VENDIDAS, y a veces pegado al nombre ("VENDIDOSet de…").
const SOLD_RE = /^[^\p{L}\d]*vendid[oa]s?[\s!.:\-–]*/iu
const PRICE_RE = /(?:\bQ\.?\s?|precio\s*:?\s*Q?\.?\s?)(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i
const MEASURE_RE = /\b\d+(?:[.,]\d+)?\s?(?:cm|mts?|metros?|pulgadas)\b/i
const HASHTAG_RE = /#([\p{L}\d_]+)/gu
const NAME_MAX = 60

function stripDecorations(text: string): string {
  return text
    .replace(HASHTAG_RE, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Primera frase, cortada en coma/punto y a lo sumo NAME_MAX caracteres sin partir palabras. */
function shortName(line: string): string {
  let name = line.split(/[,.;:]\s|\s[-–]\s/)[0]?.trim() ?? line
  if (name.length > NAME_MAX) {
    name = name.slice(0, NAME_MAX)
    name = name.slice(0, name.lastIndexOf(' ')).trim() || name
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/** Sugerencia de producto a partir del texto de un post. Siempre se revisa en el admin. */
export function parseInstagramCaption(caption = ''): CaptionSuggestion {
  const sold = SOLD_RE.test(caption)
  const body = caption.replace(SOLD_RE, '')
  const lines = body.split('\n').map(stripDecorations).filter(Boolean)

  const priceMatch = body.match(PRICE_RE)
  const price = priceMatch?.[1] ? Number(priceMatch[1].replace(/,/g, '')) : null

  const contentLines = lines.filter((l) => !PRICE_RE.test(l))
  const firstLine = contentLines[0] ?? ''
  const measureSource = contentLines.find((l) => MEASURE_RE.test(l)) ?? null
  const measure = measureSource
    ? (measureSource.split(/[.;]\s/).find((s) => MEASURE_RE.test(s)) ?? measureSource)
        .replace(/^medidas?\s*:?\s*/i, '')
        .trim()
    : null

  return {
    name: firstLine ? shortName(firstLine) : 'Producto de Instagram',
    description: contentLines.filter((l) => l !== measureSource || contentLines.length === 1).join(' '),
    price,
    measure,
    tags: [...new Set([...caption.matchAll(HASHTAG_RE)].map((m) => (m[1] ?? '').toLowerCase()))].slice(0, 10),
    sold,
  }
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'con', 'para', 'en', 'un', 'una', 'set', 'color'])

function words(text: string): Set<string> {
  return new Set(
    normalizeForSearch(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => (w.length > 2 || /^\d+$/.test(w)) && !STOPWORDS.has(w)),
  )
}

const numbersIn = (ws: Set<string>) => [...ws].filter((w) => /^\d+$/.test(w))

/**
 * Parecido entre dos nombres (0–1), por palabras en común. Si ambos indican
 * cantidades distintas ("Set 6…" vs "Set de 3…") son productos distintos: 0.
 */
export function nameSimilarity(a: string, b: string): number {
  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 || wb.size === 0) return 0
  const na = numbersIn(wa)
  const nb = numbersIn(wb)
  if (na.length && nb.length && !na.some((n) => nb.includes(n))) return 0
  let common = 0
  for (const w of wa) if (wb.has(w)) common++
  return common / (wa.size + wb.size - common)
}

/** Nombre del producto existente más parecido, si supera el umbral. */
export function findSimilarName(name: string, candidates: string[], threshold = 0.6): string | null {
  let best: { name: string; score: number } | null = null
  for (const c of candidates) {
    const score = nameSimilarity(name, c)
    if (score >= threshold && (!best || score > best.score)) best = { name: c, score }
  }
  return best?.name ?? null
}

/**
 * Categoría sugerida por palabras clave (slugs en inglés de Firestore). El
 * orden importa: lo navideño/otoñal gana sobre el tipo de objeto
 * ("bandeja navideña" → christmas-season). null = sin sugerencia.
 */
const CATEGORY_KEYWORDS: ReadonlyArray<[string, RegExp]> = [
  ['christmas-season', /navid|santa|reno\b|renos|cascanueces|nieve|campanas? de navidad|arbol navide|angel/],
  ['autumn-season', /otono|otonal|calabaza|hello fall|fall\b/],
  ['faucets', /grifo/],
  ['garden', /jardin|gnomo|comedero|aves\b|solar/],
  ['charger-plates', /baja ?plato/],
  ['cheese-boards', /tabla de queso|tablas? de madera/],
  ['candle-holders', /candelero|candela|vela|farol|linterna/],
  ['vases', /jarron|florero|pampas|rosas|flores/],
  ['trays', /bandeja|\btry\b|tray|divisor/],
  ['sculptures', /escultura|estatua|figura|caballo|reloj de arena/],
  ['kitchen-decor', /cocina|cubierto|salero|mantel|servilletero|contenedor|organizador|panera|pan\b|molde|tazon|dispensador|jabon|cupula|toalla|cesta|caja|letrero|rotulo|cadena|eslabon|cuadro|arte de pared|individuales?\b|mesa de comedor/],
]

export function suggestCategory(text: string, availableSlugs: string[]): string | null {
  const t = normalizeForSearch(text)
  for (const [slug, re] of CATEGORY_KEYWORDS) {
    if (re.test(t) && availableSlugs.includes(slug)) return slug
  }
  return null
}
