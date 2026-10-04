// Fetches every recipe from TheMealDB's free API and writes data/themealdb.json
// in the app's normalised shape. Run: node scripts/fetch-themealdb.mjs
import { writeFile } from 'node:fs/promises'

const BASE = 'https://www.themealdb.com/api/json/v1/1'

async function get(path) {
  const res = await fetch(`${BASE}/${path}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

function normalise(m) {
  const ingredients = []
  for (let i = 1; i <= 20; i++) {
    const name = (m[`strIngredient${i}`] ?? '').trim()
    if (!name) continue
    ingredients.push({ name, measure: (m[`strMeasure${i}`] ?? '').trim() })
  }
  const steps = (m.strInstructions ?? '')
    .split(/\r?\n+/)
    .map((s) => s.trim().replace(/^\d+[.)]\s+/, ''))
    // Drop bare "step 1" headings and stray "1" lines; the app numbers steps itself.
    .filter((s) => s.length > 3 && !/^step\s*\d+$/i.test(s))
  return {
    id: `themealdb-${m.idMeal}`,
    title: m.strMeal.trim(),
    country: m.strCountry || m.strArea,
    category: m.strCategory,
    tags: (m.strTags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    image: m.strMealThumb,
    video: m.strYoutube || undefined,
    ingredients,
    steps,
    source: { name: 'TheMealDB', url: m.strSource || `https://www.themealdb.com/meal/${m.idMeal}` },
  }
}

const byId = new Map()

for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
  const { meals } = await get(`search.php?f=${letter}`)
  for (const m of meals ?? []) byId.set(m.idMeal, m)
}
const afterLetters = byId.size

// Cross-check by area: pick up any meal the letter search did not return.
const { meals: areas } = await get('list.php?a=list')
for (const { strArea } of areas) {
  const { meals } = await get(`filter.php?a=${encodeURIComponent(strArea)}`)
  for (const { idMeal } of meals ?? []) {
    if (byId.has(idMeal)) continue
    const { meals: found } = await get(`lookup.php?i=${idMeal}`)
    if (found?.[0]) byId.set(idMeal, found[0])
  }
}

const recipes = [...byId.values()].map(normalise).filter((r) => r.steps.length && r.country)
await writeFile('data/themealdb.json', JSON.stringify(recipes, null, 1))
console.log(`letters: ${afterLetters}, after area cross-check: ${byId.size}, written: ${recipes.length}`)
