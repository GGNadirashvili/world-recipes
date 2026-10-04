// Dry run: how many Wikibooks Cookbook recipes exist per country?
// Run: node scripts/wikibooks-list.mjs
import { readFile } from 'node:fs/promises'
import { paged } from './wikibooks-api.mjs'
import { demonymToCountry } from './countries.mjs'

const map = await demonymToCountry()
const byCountry = new Map()

for await (const page of paged({ action: 'query', list: 'allcategories', aclimit: '500', acprop: 'size' })) {
  for (const c of page.query.allcategories) {
    if (!c.category.endsWith(' recipes') || c.pages === 0) continue
    const country = map.get(c.category.slice(0, -' recipes'.length).toLowerCase())
    if (country) byCountry.set(country, [...(byCountry.get(country) ?? []), [c.category, c.pages]])
  }
}

const have = new Set(JSON.parse(await readFile('data/themealdb.json', 'utf8')).map((r) => r.country))
const rows = [...byCountry].map(([country, cats]) => [country, cats.reduce((n, [, p]) => n + p, 0), have.has(country) ? '' : 'NEW'])
rows.sort((a, b) => b[1] - a[1])
console.log(rows.map((r) => r.join('\t')).join('\n'))
console.log(`\n${rows.length} countries, ${rows.reduce((n, r) => n + r[1], 0)} category memberships, ${rows.filter((r) => r[2]).length} new countries`)
