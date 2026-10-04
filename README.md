# World Recipes

Explore recipes from around the world. Hover a country on the map to see how many recipes it has,
click it, choose what you are in the mood for (desserts, pasta, seafood, …) and open a full recipe
with ingredients and method.

- Interactive world map: hover tooltips, click to select, scroll or use the buttons to zoom, drag to pan
- Course picker after choosing a country, then a recipe list, then the full recipe
- Shareable links: `#/italy/dessert/<recipe-id>` opens straight to a recipe, and the back button walks up the flow
- Search a country by name (small countries are hard to hit on a map) and a "Surprise me" button
- Works on phones, supports light and dark mode and keyboard navigation

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run lint
```

## Recipe data

The app ships static snapshots in [`data/`](data/), so it needs no backend or API keys.

| File | Source | Licence | Regenerate |
| --- | --- | --- | --- |
| `data/themealdb.json` | [TheMealDB](https://www.themealdb.com) free API | see their terms | `node scripts/fetch-themealdb.mjs` |
| `data/wikibooks.json` | [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents) | CC BY-SA 4.0 | `node scripts/fetch-wikibooks.mjs` |

Both normalise into the shape in [`src/types.ts`](src/types.ts) and are merged (duplicate dishes
removed) in [`src/lib/recipes.ts`](src/lib/recipes.ts). To add a source, write a script that outputs
the same shape and import it there. The Wikibooks importer maps its "Albanian recipes"-style
categories to countries, queries the API politely (sequential, cached in `.cache/`) and records each
recipe's licence and authors link, which the app shows on the recipe.

**Licensing.** Wikibooks text is CC BY-SA 4.0, so `data/wikibooks.json` and anything derived from it
must stay under the same licence and credit the contributors (the app links the page history). Check
each source's terms before adding it and before deploying publicly. TheMealDB's free key is intended
for development and education.

## Deployment

Pushing to `main` builds and publishes the site to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). In the repository settings, set
**Pages → Source** to **GitHub Actions**. Asset paths are relative, so it works under any sub-path.

## Credits

Recipes: [TheMealDB](https://www.themealdb.com) and [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents) contributors (CC BY-SA 4.0). Map: [Natural Earth](https://www.naturalearthdata.com)
via [world-atlas](https://github.com/topojson/world-atlas), drawn with [d3-geo](https://d3js.org/d3-geo).
