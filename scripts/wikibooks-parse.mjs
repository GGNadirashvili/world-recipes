// Turns Wikibooks Cookbook wikitext into ingredients and steps.
// ---------- wikitext parsing ----------

const ENTITIES = {
  nbsp: ' ', deg: '°', ndash: '–', mdash: '—', amp: '&', quot: '"', frac12: '½', frac14: '¼', frac34: '¾',
  eacute: 'é', egrave: 'è', ntilde: 'ñ', times: '×', hellip: '…',
}

function clean(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1') // [[a|b]] -> b
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1') // [url text] -> text
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|deg|ndash|mdash|amp|quot|frac12|frac14|frac34|eacute|egrave|ntilde|times|hellip);|&#(\d+);/g, (_, name, num) =>
      num ? String.fromCodePoint(Number(num)) : (ENTITIES[name] ?? ' '),
    )
    .replace(/^[>\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const QTY = /^((?:\d+\s+)?[\d¼½¾⅓⅔⅛⅜⅝⅞./–-]+(?:\s*(?:to|or)\s*[\d¼½¾⅓⅔./]+)?(?:\s*(?:cups?|c\.?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|litres?|cloves?|pinch(?:es)?|dash(?:es)?|packets?|cans?|slices?|pieces?|sticks?|bunch(?:es)?|sprigs?|inch(?:es)?)\b\.?)?)\s+(.+)$/i

function splitIngredient(line) {
  const m = line.match(QTY)
  return m ? { measure: m[1].trim(), name: m[2].trim() } : { measure: '', name: line }
}

function section(text, names) {
  const re = /^==\s*([^=\n]+?)\s*==\s*$/gm
  const heads = [...text.matchAll(re)].map((m) => ({ name: m[1].trim().toLowerCase(), start: m.index, end: m.index + m[0].length }))
  const i = heads.findIndex((h) => names.includes(h.name))
  if (i < 0) return ''
  return text.slice(heads[i].end, heads[i + 1]?.start ?? text.length)
}

export function parseRecipe(text) {
  const ingText = section(text, ['ingredients'])
  const procText = section(text, ['procedure', 'directions', 'method', 'instructions', 'preparation'])
  const ingredients = []
  for (const raw of ingText.split('\n')) {
    const m = raw.match(/^\*+\s*(.+)$/)
    if (!m) continue
    const line = clean(m[1])
    if (line) ingredients.push(splitIngredient(line))
  }
  const steps = []
  for (const raw of procText.split('\n')) {
    const m = raw.match(/^[#*]+\s*(.+)$/)
    if (!m) continue
    const line = clean(m[1])
    if (line.length > 3) steps.push(line)
  }
  const summaryCategory = text.match(/\|\s*Category\s*=\s*([^\n|}]+)/i)?.[1]?.trim() ?? ''
  return { ingredients, steps, summaryCategory }
}

/** Maps Wikibooks categories onto the course categories the app groups by. */
export function categoryOf(cats, summaryCategory) {
  const hay = [...cats, summaryCategory].join(' | ').toLowerCase()
  const rules = [
    [/dessert|cake|cookie|pie recipes|pastr|sweet|candy|confection|ice cream|pudding/, 'Dessert'],
    [/breakfast|pancake|waffle|egg recipes for breakfast/, 'Breakfast'],
    [/appetizer|snack|starter|soup|salad/, 'Starter'],
    [/side dish|sauce|dip|condiment|bread|rice recipes|vegetable/, 'Side'],
    [/pasta|noodle/, 'Pasta'],
    [/seafood|fish|shellfish/, 'Seafood'],
    [/vegetarian|vegan/, 'Vegetarian'],
    [/beef/, 'Beef'],
    [/chicken|poultry|turkey|duck/, 'Chicken'],
    [/pork|bacon|ham/, 'Pork'],
    [/lamb|mutton/, 'Lamb'],
    [/goat/, 'Goat'],
  ]
  return rules.find(([re]) => re.test(hay))?.[1] ?? 'Miscellaneous'
}
