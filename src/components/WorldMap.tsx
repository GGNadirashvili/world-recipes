import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import atlas from 'world-atlas/countries-50m.json'
import type { Country } from '../lib/recipes'

const W = 960
const H = 500
const MAX_ZOOM = 10

/** Atlas names that differ from the names recipes use. */
const ATLAS_TO_RECIPE_NAME: Record<string, string> = {
  'United States of America': 'United States',
  'Cayman Is.': 'Cayman Islands',
  'Antigua and Barb.': 'Antigua and Barbuda',
  'Dominican Rep.': 'Dominican Republic',
  Congo: 'Republic of the Congo',
}

const topology = atlas as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
const features = feature(topology, topology.objects.countries).features.filter(
  (f) => f.properties.name !== 'Antarctica',
)
const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  { type: 'FeatureCollection', features },
)
const pathOf = geoPath(projection)

const shapes = features.map((f) => {
  // Zoom targets use the largest polygon, so French Guiana or Alaska
  // do not stretch the box for France or the United States.
  let focus: typeof f = f
  if (f.geometry.type === 'MultiPolygon') {
    const biggest = f.geometry.coordinates
      .map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
      .reduce((a, b) => (pathOf.area(b) > pathOf.area(a) ? b : a))
    focus = { ...f, geometry: biggest }
  }
  return {
    atlasName: f.properties.name,
    recipeName: ATLAS_TO_RECIPE_NAME[f.properties.name] ?? f.properties.name,
    d: pathOf(f) ?? '',
    bounds: pathOf.bounds(focus),
  }
})

interface View {
  k: number
  x: number
  y: number
}
const HOME: View = { k: 1, x: 0, y: 0 }

const clamp = (v: View): View => ({
  k: v.k,
  x: Math.min(0, Math.max(W - W * v.k, v.x)),
  y: Math.min(0, Math.max(H - H * v.k, v.y)),
})

function flyTo(recipeName: string | undefined): View {
  const shape = shapes.find((s) => s.recipeName === recipeName)
  if (!shape) return HOME
  const [[x0, y0], [x1, y1]] = shape.bounds
  const k = Math.min(MAX_ZOOM, 0.6 / Math.max((x1 - x0) / W, (y1 - y0) / H, 0.001))
  return clamp({ k, x: W / 2 - (k * (x0 + x1)) / 2, y: H / 2 - (k * (y0 + y1)) / 2 })
}

interface Props {
  countries: Map<string, Country>
  selected?: string
  onSelect: (name: string) => void
}

export function WorldMap({ countries, selected, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>(() => flyTo(selected))
  const [dragging, setDragging] = useState(false)
  const [tip, setTip] = useState<{ name: string; count: number; x: number; y: number } | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const maxCount = useMemo(
    () => Math.max(1, ...[...countries.values()].map((c) => c.recipes.length)),
    [countries],
  )

  // Fly to the selected country, or back out when the panel closes. Adjusting
  // state during render (rather than in an effect) avoids a second paint.
  const [flownTo, setFlownTo] = useState(selected)
  if (flownTo !== selected) {
    setFlownTo(selected)
    setView(flyTo(selected))
  }

  const zoomAt = (factor: number, px = W / 2, py = H / 2) =>
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor))
      const r = k / v.k
      return clamp({ k, x: px - (px - v.x) * r, y: py - (py - v.y) * r })
    })

  const toViewBox = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H }
  }

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const svg = svgRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = toViewBox(e.clientX, e.clientY)
      zoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !(e.buttons & 1)) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    if (!d.moved) setDragging(true)
    d.moved = true
    const rect = svgRef.current!.getBoundingClientRect()
    d.x = e.clientX
    d.y = e.clientY
    setView((v) => clamp({ ...v, x: v.x + (dx * W) / rect.width, y: v.y + (dy * H) / rect.height }))
    setTip(null)
  }
  const endDrag = () => {
    // Leave `moved` set until after the click that follows pointerup has been ignored.
    setDragging(false)
    setTimeout(() => (drag.current = null), 0)
  }

  const showTip = (e: React.PointerEvent, name: string) => {
    if (drag.current?.moved) return
    const rect = wrapRef.current!.getBoundingClientRect()
    setTip({ name, count: countries.get(name)?.recipes.length ?? 0, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const open = (name: string) => {
    if (drag.current?.moved) return
    if (countries.has(name)) onSelect(name)
  }

  return (
    <div className="map" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label="World map. Countries with recipes are focusable."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={() => {
          endDrag()
          setTip(null)
        }}
      >
        <g
          className={dragging ? 'map-layer' : 'map-layer is-animated'}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {shapes.map((s) => {
            const country = countries.get(s.recipeName)
            const count = country?.recipes.length ?? 0
            const cls = ['country', count ? 'has-recipes' : '', selected === s.recipeName ? 'is-selected' : '']
            return (
              <path
                key={s.atlasName}
                d={s.d}
                className={cls.join(' ')}
                style={count ? { ['--heat' as string]: `${25 + 75 * Math.sqrt(count / maxCount)}%` } : undefined}
                tabIndex={count ? 0 : undefined}
                role={count ? 'button' : undefined}
                aria-label={count ? `${s.recipeName}, ${count} recipes` : undefined}
                onClick={() => open(s.recipeName)}
                onKeyDown={(e) => {
                  if (count && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelect(s.recipeName)
                  }
                }}
                onPointerMove={(e) => showTip(e, s.recipeName)}
                onPointerLeave={() => setTip(null)}
              />
            )
          })}
        </g>
      </svg>

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.name}</strong>
          <span>{tip.count ? `${tip.count} recipes · click to explore` : 'No recipes yet'}</span>
        </div>
      )}

      <div className="zoom-controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.6)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.6)}>
          −
        </button>
        <button type="button" aria-label="Reset view" onClick={() => setView(HOME)} disabled={view.k === 1}>
          ⤢
        </button>
      </div>
    </div>
  )
}
