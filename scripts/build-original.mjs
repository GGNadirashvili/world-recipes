// Validates draft recipes and writes them to data/original/<country>.json.
//   node scripts/build-original.mjs <draftsDir> [--offline] [--dry] [--only <country-slug>]
//   --dry validates and reports without writing; --only restricts to one draft file (e.g. georgia).
//
// A draft file is { "country": "Georgia", "recipes": [ { title, category, tags, ingredients:[{measure,name}],
// steps:[...], about: "https://en.wikipedia.org/wiki/...[#Section]" } ] }. Every recipe must link a Wikipedia article
// about the dish, and the article must exist: that is what keeps invented dishes out. Duplicates of anything
// already in the library (same country) are dropped.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const CATEGORIES = new Set([
  'Beef', 'Chicken', 'Lamb', 'Pork', 'Goat', 'Seafood', 'Pasta', 'Vegetarian', 'Vegan',
  'Starter', 'Side', 'Breakfast', 'Dessert', 'Miscellaneous',
])
const NOTE = 'Original write-up of a traditional preparation, made for World Recipes. Quantities are approximate; adjust to taste.'
const UA = 'world-recipes/0.1 (https://github.com/GGNadirashvili/world-recipes; recipe map hobby project)'

const [dir, ...flags] = process.argv.slice(2)
const dry = flags.includes('--dry')
const only = flags.includes('--only') ? flags[flags.indexOf('--only') + 1] : null
if (!dir) throw new Error('usage: node scripts/build-original.mjs <draftsDir> [--offline]')
const offline = flags.includes('--offline')

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const STOP = new Set(['recipe', 'traditional', 'authentic', 'homemade', 'classic', 'the', 'style', 'easy'])
const norm = (title) =>
  title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter((w) => w && !STOP.has(w)).join(' ')

async function readJson(file, fallback = []) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return fallback }
}

// Existing library, by country.
const existing = new Map()
const originalDir = 'data/original'
const originalFiles = (await readdir(originalDir)).filter((f) => f.endsWith('.json'))
for (const file of ['data/themealdb.json', 'data/wikibooks.json', ...originalFiles.map((f) => join(originalDir, f))]) {
  for (const r of await readJson(file)) {
    if (!existing.has(r.country)) existing.set(r.country, [])
    existing.get(r.country).push(r.title)
  }
}

// Wikipedia existence check, batched.
async function missingArticles(urls) {
  // A #section anchor only affects where the link lands, not whether the article exists.
  const titleOf = (u) => decodeURIComponent(u.replace('https://en.wikipedia.org/wiki/', '').split('#')[0]).replaceAll('_', ' ')
  const missing = new Set()
  const list = [...new Set(urls)]
  for (let i = 0; i < list.length; i += 40) {
    const batch = list.slice(i, i + 40)
    const qs = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1', titles: batch.map(titleOf).join('|') })
    let json
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { headers: { 'User-Agent': UA } })
      if (res.ok) { json = await res.json(); break }
      await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt))
    }
    if (!json) throw new Error('Wikipedia API unavailable')
    // Map every requested title through normalisation and redirects to the final page.
    const hop = new Map()
    for (const n of json.query.normalized ?? []) hop.set(n.from, n.to)
    for (const r of json.query.redirects ?? []) hop.set(r.from, r.to)
    const gone = new Set(json.query.pages.filter((p) => p.missing || p.invalid).map((p) => p.title))
    for (const url of batch) {
      let t = titleOf(url)
      for (let k = 0; k < 3 && hop.has(t); k++) t = hop.get(t)
      if (gone.has(t)) missing.add(url)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return missing
}

const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && (!only || f === `${only}.json`)).sort()
const drafts = []
for (const f of files) drafts.push({ file: f, ...(await readJson(join(dir, f), null)) })

const missing = offline ? new Set() : await missingArticles(drafts.flatMap((d) => (d.recipes ?? []).map((r) => r.about).filter(Boolean)))

let totalAccepted = 0
let totalDropped = 0
for (const d of drafts) {
  if (!d.country || !Array.isArray(d.recipes)) { console.log(`${d.file}: not a valid draft file`); process.exitCode = 1; continue }
  const slug = slugify(d.country)
  const outFile = join(originalDir, `${slug}.json`)
  const kept = await readJson(outFile)
  const keptTitles = new Set(kept.map((k) => k.title))
  const taken = (existing.get(d.country) ?? []).filter((t) => !keptTitles.has(t)) // titles already in the library for this country
  for (const k of kept) taken.push(k.title)
  const seenAbout = new Set(kept.map((r) => r.source?.url))
  const accepted = []
  const dropped = []
  const warned = []

  let unchanged = 0
  for (const r of d.recipes) {
    if (r.title && kept.some((k) => k.id === `original-${slug}-${slugify(r.title)}`)) { unchanged++; continue }
    const why = []
    if (!r.title || typeof r.title !== 'string') why.push('no title')
    if (!CATEGORIES.has(r.category)) why.push(`bad category "${r.category}"`)
    const ing = r.ingredients ?? []
    if (ing.length < 3 || ing.some((i) => !i.name?.trim())) why.push('needs at least 3 ingredients, each with a name')
    const steps = r.steps ?? []
    if (steps.length < 3 || steps.some((s) => typeof s !== 'string' || s.trim().length < 15)) why.push('needs at least 3 real steps')
    if (!/^https:\/\/en\.wikipedia\.org\/wiki\/[^#?\s]+(#[^\s]+)?$/.test(r.about ?? '')) why.push('about must be an en.wikipedia.org/wiki/ URL')
    else if (missing.has(r.about)) why.push('Wikipedia article does not exist')
    else if (seenAbout.has(r.about) && !r.variant) why.push('same Wikipedia article as another recipe (set "variant": true for a regional variant)')
    if (r.title) {
      const n = norm(r.title)
      if (!n) why.push('empty title after normalising')
      for (const t of taken) {
        const m = norm(t)
        if (m === n) { why.push(`duplicate of "${t}"`); break }
        const [a, b] = m.length < n.length ? [m, n] : [n, m]
        if (a.length > 3 && ` ${b} `.includes(` ${a} `)) warned.push(`"${r.title}" ~ "${t}"`)
      }
    }
    if (why.length) { dropped.push(`${r.title ?? '(untitled)'}: ${why.join('; ')}`); continue }
    taken.push(r.title)
    seenAbout.add(r.about)
    accepted.push({
      id: `original-${slug}-${slugify(r.title)}`,
      title: r.title.trim(),
      country: d.country,
      category: r.category,
      tags: (r.tags ?? []).map((t) => String(t).trim()).filter(Boolean),
      image: '',
      ingredients: ing.map((i) => ({ measure: (i.measure ?? '').trim(), name: i.name.trim() })),
      steps: steps.map((s) => s.trim()),
      source: { name: 'Wikipedia', url: r.about, linkLabel: 'About this dish on Wikipedia', note: NOTE },
    })
  }

  if (accepted.length && !dry) {
    const merged = [...kept, ...accepted]
    merged.sort((a, b) => a.title.localeCompare(b.title))
    await writeFile(outFile, JSON.stringify(merged, null, 1))
  }
  totalAccepted += accepted.length
  totalDropped += dropped.length
  console.log(`${d.country}: ${accepted.length} added, ${unchanged} unchanged, ${dropped.length} dropped, ${warned.length} similar-title warnings`)
  for (const x of dropped) console.log(`   dropped  ${x}`)
  for (const x of warned) console.log(`   similar  ${x}`)
}
console.log(`\ntotal: ${totalAccepted} added, ${totalDropped} dropped`)
