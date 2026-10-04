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
  /** Empty when the source has no photo. */
  image: string
  video?: string
  ingredients: Ingredient[]
  steps: string[]
  source: {
    name: string
    url: string
    /** Set for openly licensed sources, which must be credited. */
    license?: string
    licenseUrl?: string
    /** Page listing the authors, linked to satisfy attribution. */
    historyUrl?: string
  }
}
