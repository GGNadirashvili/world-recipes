import { useState } from 'react'
import type { Recipe } from '../types'

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const [have, setHave] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setHave((prev) => {
      const next = new Set(prev)
      if (!next.delete(i)) next.add(i)
      return next
    })

  return (
    <article className="detail">
      <img className="detail-hero" src={recipe.image} alt={recipe.title} />
      <h2>{recipe.title}</h2>
      <p className="meta">
        {recipe.country} · {recipe.category}
        {recipe.tags.length > 0 && ` · ${recipe.tags.join(', ')}`}
      </p>

      <h3>
        Ingredients <small>{have.size > 0 && `${have.size}/${recipe.ingredients.length} ticked`}</small>
      </h3>
      <ul className="ingredients">
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={have.has(i)} onChange={() => toggle(i)} />
              <span className="measure">{ing.measure}</span>
              <span>{ing.name}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3>Method</h3>
      <ol className="steps">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>

      <p className="links">
        {recipe.video && (
          <a href={recipe.video} target="_blank" rel="noreferrer">
            ▶ Watch video
          </a>
        )}
        <a href={recipe.source.url} target="_blank" rel="noreferrer">
          Source: {recipe.source.name}
        </a>
      </p>
    </article>
  )
}
