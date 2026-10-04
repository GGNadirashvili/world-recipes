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

The app ships a static snapshot, [`data/themealdb.json`](data/themealdb.json), so it needs no
backend or API keys. Regenerate it with:

```bash
node scripts/fetch-themealdb.mjs
```

The script reads [TheMealDB](https://www.themealdb.com)'s free API and normalises every recipe into
the shape in [`src/types.ts`](src/types.ts). More sources can be added the same way: write a script
that outputs the same shape, then merge it in [`src/lib/recipes.ts`](src/lib/recipes.ts).

Recipes link back to their source. Check each source's licence and terms before adding it, and
before deploying publicly: TheMealDB's free key is intended for development and education.

## Deployment

Pushing to `main` builds and publishes the site to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). In the repository settings, set
**Pages → Source** to **GitHub Actions**. Asset paths are relative, so it works under any sub-path.

## Credits

Recipes: [TheMealDB](https://www.themealdb.com). Map: [Natural Earth](https://www.naturalearthdata.com)
via [world-atlas](https://github.com/topojson/world-atlas), drawn with [d3-geo](https://d3js.org/d3-geo).
