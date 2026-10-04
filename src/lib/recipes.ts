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

/** The recipe data is a separate chunk so the map can paint before it arrives. */
export async function loadRecipes(): Promise<Recipe[]> {
  const [mealdb, wikibooks] = await Promise.all([
    import('../../data/themealdb.json'),
    import('../../data/wikibooks.json'),
  ])
  // The same dish can appear in both sources; the first one listed wins.
  const seen = new Set<string>()
  return [...(mealdb.default as Recipe[]), ...(wikibooks.default as Recipe[])].filter((r) => {
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
