import { useEffect, useMemo, useState } from 'react'
import { CountryPanel } from './components/CountryPanel'
import { CountrySearch } from './components/CountrySearch'
import { WorldMap } from './components/WorldMap'
import { courseOf } from './lib/courses'
import { groupByCountry, loadRecipes } from './lib/recipes'
import { useRoute } from './lib/route'
import type { Recipe } from './types'

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [route, navigate] = useRoute()

  useEffect(() => {
    loadRecipes().then(setRecipes, () => setFailed(true))
  }, [])

  const countries = useMemo(() => groupByCountry(recipes ?? []), [recipes])
  const selected = [...countries.values()].find((c) => c.slug === route.country)

  const surprise = () => {
    if (!recipes) return
    const r = recipes[Math.floor(Math.random() * recipes.length)]
    const country = countries.get(r.country)!
    navigate({ country: country.slug, course: courseOf(r).id, recipe: r.id })
  }

  return (
    <div className={selected ? 'app has-panel' : 'app'}>
      <header className="topbar">
        <h1>
          <span aria-hidden="true">🌍</span> World Recipes
        </h1>
        <p className="tagline">
          {recipes
            ? `${recipes.length} recipes from ${countries.size} countries. Pick one on the map.`
            : failed
              ? 'Could not load recipes.'
              : 'Loading recipes…'}
        </p>
        <div className="topbar-actions">
          <CountrySearch countries={[...countries.values()]} onSelect={(c) => navigate({ country: c.slug })} />
          <button type="button" className="surprise" onClick={surprise} disabled={!recipes}>
            🎲 Surprise me
          </button>
        </div>
      </header>

      <main className="stage">
        <WorldMap
          countries={countries}
          selected={selected?.name}
          onSelect={(name) => navigate({ country: countries.get(name)!.slug })}
        />
        {selected && <CountryPanel country={selected} route={route} navigate={navigate} />}
      </main>

      <footer className="footer">
        Recipes from <a href="https://www.themealdb.com">TheMealDB</a> and{' '}
        <a href="https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents">Wikibooks Cookbook</a> (CC BY-SA 4.0) · Map data from{' '}
        <a href="https://www.naturalearthdata.com">Natural Earth</a>
      </footer>
    </div>
  )
}
