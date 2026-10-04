// Demonym ("Albanian") -> country name ("Albania"), from TheMealDB's area list plus a few extras.
export async function demonymToCountry() {
  const res = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list')
  const { meals } = await res.json()
  const map = new Map(meals.map((m) => [m.strArea.toLowerCase(), m.strCountry]))
  const extras = {
    american: 'United States',
    british: 'United Kingdom',
    english: 'United Kingdom',
    scottish: 'United Kingdom',
    welsh: 'United Kingdom',
    dutch: 'Netherlands',
    georgian: 'Georgia',
    korean: 'South Korea',
    czech: 'Czechia',
    burmese: 'Myanmar',
    ethiopian: 'Ethiopia',
  }
  for (const [k, v] of Object.entries(extras)) if (!map.has(k)) map.set(k, v)
  return map
}
