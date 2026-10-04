import type { Recipe } from '../types'
import { COURSES, courseOf } from './courses'

export interface Country {
  name: string
  slug: string
  recipes: Recipe[]
}

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** One file per country of recipes written for this project (see scripts/build-original.mjs). */
const originalFiles = import.meta.glob<Recipe[]>('../../data/original/*.json', { import: 'default' })

/** The recipe data is a separate chunk so the map can paint before it arrives. */
export async function loadRecipes(): Promise<Recipe[]> {
  const [mealdb, wikibooks, ...originals] = await Promise.all([
    import('../../data/themealdb.json'),
    import('../../data/wikibooks.json'),
    ...Object.values(originalFiles).map((load) => load()),
  ])
  // The same dish can appear in several sources; the first one listed wins.
  const all = [mealdb.default, wikibooks.default, ...originals].flat() as Recipe[]
  const seen = new Set<string>()
  return all.filter((r) => {
    const key = `${r.country}|${r.title.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function groupByCountry(recipes: Recipe[]): Map<string, Country> {
  const countries = new Map<string, Country>()
  for (const recipe of recipes) {
    let country = countries.get(recipe.country)
    if (!country) {
      country = { name: recipe.country, slug: slugify(recipe.country), recipes: [] }
      countries.set(recipe.country, country)
    }
    country.recipes.push(recipe)
  }
  return countries
}

/** Courses that have at least one recipe in this country, with their recipes. */
export function coursesFor(country: Country) {
  return COURSES.map((course) => ({
    course,
    recipes: country.recipes.filter((r) => courseOf(r).id === course.id),
  })).filter((c) => c.recipes.length > 0)
}
