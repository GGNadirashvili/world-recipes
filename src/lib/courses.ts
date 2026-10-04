import type { Recipe } from '../types'

/** What a visitor picks after choosing a country; each groups several source categories. */
export interface Course {
  id: string
  label: string
  emoji: string
  categories: string[]
}

export const COURSES: Course[] = [
  { id: 'main-meat', label: 'Meat & poultry', emoji: '🍖', categories: ['Beef', 'Chicken', 'Lamb', 'Pork', 'Goat'] },
  { id: 'seafood', label: 'Seafood', emoji: '🐟', categories: ['Seafood'] },
  { id: 'pasta', label: 'Pasta', emoji: '🍝', categories: ['Pasta'] },
  { id: 'vegetarian', label: 'Vegetarian & vegan', emoji: '🥦', categories: ['Vegetarian', 'Vegan'] },
  { id: 'starter', label: 'Starters & sides', emoji: '🥗', categories: ['Starter', 'Side'] },
  { id: 'breakfast', label: 'Breakfast', emoji: '🥞', categories: ['Breakfast'] },
  { id: 'dessert', label: 'Desserts', emoji: '🍰', categories: ['Dessert'] },
  { id: 'other', label: 'Everything else', emoji: '🍽️', categories: ['Miscellaneous'] },
]

const OTHER = COURSES[COURSES.length - 1]

export function courseOf(recipe: Recipe): Course {
  return COURSES.find((c) => c.categories.includes(recipe.category)) ?? OTHER
}

export function courseById(id: string | undefined): Course | undefined {
  return COURSES.find((c) => c.id === id)
}
