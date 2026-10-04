import { useState } from 'react'
import type { Country } from '../lib/recipes'

/** Small countries are hard to hit on a world map, so every country is also reachable by name. */
export function CountrySearch({ countries, onSelect }: { countries: Country[]; onSelect: (c: Country) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const q = query.trim().toLowerCase()
  const matches = countries
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8)

  const pick = (c: Country) => {
    setQuery('')
    setOpen(false)
    onSelect(c)
  }

  return (
    <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        type="search"
        placeholder="Find a country…"
        aria-label="Find a country"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) pick(matches[0])
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && matches.length > 0 && (
        <ul className="search-results">
          {matches.map((c) => (
            <li key={c.slug}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>
                {c.name} <small>{c.recipes.length}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
