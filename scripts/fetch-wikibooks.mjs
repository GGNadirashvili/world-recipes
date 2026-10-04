// Imports Wikibooks Cookbook recipes (CC BY-SA 4.0) into data/wikibooks.json.
// Run: node scripts/fetch-wikibooks.mjs   (responses are cached in .cache/, so re-runs are cheap)
import { writeFile } from 'node:fs/promises'
import { api, paged } from './wikibooks-api.mjs'
import { demonymToCountry } from './countries.mjs'
import { categoryOf, parseRecipe } from './wikibooks-parse.mjs'

const demonyms = await demonymToCountry()

// 1. Country categories ("Albanian recipes") -> member recipe pages.
const pageCountry = new Map() // title -> country (first category wins)
for await (const page of paged({ action: 'query', list: 'allcategories', aclimit: '500', acprop: 'size' })) {
  for (const c of page.query.allcategories) {
    if (!c.category.endsWith(' recipes') || c.pages === 0) continue
    const country = demonyms.get(c.category.slice(0, -' recipes'.length).toLowerCase())
    if (!country) continue
    for await (const members of paged({
      action: 'query', list: 'categorymembers', cmtitle: `Category:${c.category}`, cmnamespace: '102', cmlimit: '500',
    })) {
      for (const m of members.query.categorymembers) {
        if (!pageCountry.has(m.title)) pageCountry.set(m.title, country)
      }
    }
  }
}
console.log(`${pageCountry.size} candidate pages`)

// 2. Fetch wikitext, categories and lead image in batches of 50.
const titles = [...pageCountry.keys()]
const recipes = []
const skipped = { noIngredients: 0, noSteps: 0, index: 0 }

for (let i = 0; i < titles.length; i += 50) {
  const batch = titles.slice(i, i + 50)
  const res = await api({
    action: 'query', titles: batch.join('|'), prop: 'revisions|categories|pageimages',
    rvprop: 'content', rvslots: 'main', cllimit: 'max', piprop: 'thumbnail', pithumbsize: '640',
  })
  for (const p of res.query.pages) {
    const text = p.revisions?.[0]?.slots?.main?.content
    if (!text) continue
    const parsed = parseRecipe(text)
    if (/^Cookbook:Cuisine of/.test(p.title)) { skipped.index++; continue }
    if (parsed.ingredients.length < 2) { skipped.noIngredients++; continue }
    if (parsed.steps.length === 0) { skipped.noSteps++; continue }
    const cats = (p.categories ?? []).map((c) => c.title.replace(/^Category:/, ''))
    const name = p.title.replace(/^Cookbook:/, '')
    const pageUrl = `https://en.wikibooks.org/wiki/${encodeURIComponent(p.title.replaceAll(' ', '_')).replaceAll('%3A', ':')}`
    recipes.push({
      id: `wikibooks-${p.pageid}`,
      title: name,
      country: pageCountry.get(p.title),
      category: categoryOf(cats, parsed.summaryCategory),
      tags: [],
      image: p.thumbnail?.source ?? '',
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      source: {
        name: 'Wikibooks Cookbook',
        url: pageUrl,
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        historyUrl: `${pageUrl}?action=history`, // lists the authors, as the licence requires
      },
    })
  }
  console.log(`  ${Math.min(i + 50, titles.length)}/${titles.length}`)
}

recipes.sort((a, b) => a.country.localeCompare(b.country) || a.title.localeCompare(b.title))
await writeFile('data/wikibooks.json', JSON.stringify(recipes, null, 1))
console.log(`written ${recipes.length}; skipped`, skipped)
