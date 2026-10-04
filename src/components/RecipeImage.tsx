import type { Recipe } from '../types'
import { courseOf } from '../lib/courses'

/** The recipe's photo, or its course emoji on a tinted block when the source has none. */
export function RecipeImage({ recipe, className }: { recipe: Recipe; className: string }) {
  if (recipe.image) {
    return <img className={className} src={recipe.image} alt={className === 'detail-hero' ? recipe.title : ''} loading="lazy" />
  }
  return (
    <div className={`${className} placeholder`} aria-hidden="true">
      {courseOf(recipe).emoji}
    </div>
  )
}
