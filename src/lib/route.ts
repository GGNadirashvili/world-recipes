import { useCallback, useEffect, useState } from 'react'

/** Position in the browse flow, kept in the URL hash: #/italy/dessert/themealdb-52772 */
export interface Route {
  country?: string
  course?: string
  recipe?: string
}

function parse(hash: string): Route {
  const [country, course, recipe] = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  return { country, course, recipe }
}

const format = (r: Route) => '#/' + [r.country, r.course, r.recipe].filter(Boolean).join('/')

export function useRoute(): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // Each step is a history entry, so the browser's back button walks back up the flow.
  const navigate = useCallback((next: Route) => {
    window.location.hash = next.country ? format(next) : ''
  }, [])

  return [route, navigate]
}
