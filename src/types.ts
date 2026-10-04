export interface Ingredient {
  name: string
  measure: string
}

export interface Recipe {
  id: string
  title: string
  country: string
  /** Raw category from the source, e.g. "Beef" or "Dessert". */
  category: string
  tags: string[]
  image: string
  video?: string
  ingredients: Ingredient[]
  steps: string[]
  source: { name: string; url: string }
}
