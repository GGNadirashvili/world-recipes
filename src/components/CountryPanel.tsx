import { coursesFor, type Country } from '../lib/recipes'
import { courseById } from '../lib/courses'
import type { Route } from '../lib/route'
import { RecipeDetail } from './RecipeDetail'
import { RecipeImage } from './RecipeImage'

interface Props {
  country: Country
  route: Route
  navigate: (next: Route) => void
}

const ALL = 'all'

export function CountryPanel({ country, route, navigate }: Props) {
  const groups = coursesFor(country)
  const here = { country: country.slug }

  const recipe = country.recipes.find((r) => r.id === route.recipe)
  const group = groups.find((g) => g.course.id === route.course)
  const course = route.course === ALL ? { id: ALL, label: 'All recipes', emoji: '📖' } : courseById(route.course)
  const listed = route.course === ALL ? country.recipes : group?.recipes

  // Breadcrumb: each crumb is one step back up the flow.
  const crumbs: { label: string; to: Route }[] = [{ label: country.name, to: here }]
  if (course && listed) crumbs.push({ label: course.label, to: { ...here, course: course.id } })

  return (
    <aside className="panel" aria-label={`${country.name} recipes`}>
      <header className="panel-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate({})}>
            🌍 World
          </button>
          {crumbs.map((c, i) => (
            <span key={c.label}>
              <span aria-hidden="true"> / </span>
              <button type="button" onClick={() => navigate(c.to)} aria-current={i === crumbs.length - 1 && !recipe ? 'page' : undefined}>
                {c.label}
              </button>
            </span>
          ))}
          {recipe && (
            <span>
              <span aria-hidden="true"> / </span>
              <span className="crumb-current">{recipe.title}</span>
            </span>
          )}
        </nav>
        <button type="button" className="close" aria-label="Close" onClick={() => navigate({})}>
          ✕
        </button>
      </header>

      <div className="panel-body" key={`${route.course}/${route.recipe}`}>
        {recipe ? (
          <RecipeDetail recipe={recipe} />
        ) : listed ? (
          <>
            <h2>
              {country.name}: {course!.label.toLowerCase()}
            </h2>
            <ul className="recipe-list">
              {listed.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => navigate({ ...here, course: route.course, recipe: r.id })}>
                    <RecipeImage recipe={r} className="recipe-thumb" />
                    <span className="recipe-title">{r.title}</span>
                    <span className="recipe-meta">
                      {r.ingredients.length} ingredients · {r.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2>{country.name}</h2>
            <p className="lead">What are you in the mood for?</p>
            <ul className="course-grid">
              {groups.map(({ course: c, recipes }) => (
                <li key={c.id}>
                  <button type="button" onClick={() => navigate({ ...here, course: c.id })}>
                    <span className="course-emoji" aria-hidden="true">
                      {c.emoji}
                    </span>
                    <span className="course-label">{c.label}</span>
                    <span className="course-count">{recipes.length}</span>
                  </button>
                </li>
              ))}
              <li className="course-all">
                <button type="button" onClick={() => navigate({ ...here, course: ALL })}>
                  <span className="course-emoji" aria-hidden="true">
                    📖
                  </span>
                  <span className="course-label">Show me everything</span>
                  <span className="course-count">{country.recipes.length}</span>
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
